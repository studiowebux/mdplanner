/**
 * Base parser class with core utilities for file operations.
 * Provides write locking, atomic writes, hashing, and backup management.
 */
export class BaseParser {
  public filePath: string;
  protected maxBackups: number;
  protected backupDir: string;
  protected lastContentHash: string | null = null;
  protected writeLock: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
    this.maxBackups = parseInt(Deno.env.get("MD_PLANNER_MAX_BACKUPS") || "10");
    this.backupDir = Deno.env.get("MD_PLANNER_BACKUP_DIR") || "./backups";
  }

  /**
   * Acquires a write lock and executes the operation.
   * Ensures sequential writes to prevent race conditions.
   */
  protected async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const previousLock = this.writeLock;
    let releaseLock: () => void;
    this.writeLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    try {
      await previousLock;
      return await operation();
    } finally {
      releaseLock!();
    }
  }

  /**
   * Atomically writes content using temp file + rename pattern.
   * Prevents file corruption if process crashes during write.
   */
  protected async atomicWriteFile(content: string): Promise<void> {
    const tempPath = this.filePath + ".tmp";
    await Deno.writeTextFile(tempPath, content);
    await Deno.rename(tempPath, this.filePath);
  }

  /**
   * Calculate SHA-256 hash of content
   */
  protected async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Creates a backup of the current markdown file before making changes
   */
  protected async createBackup(): Promise<void> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      const currentHash = await this.calculateHash(content);

      if (this.lastContentHash === currentHash) {
        return;
      }

      this.lastContentHash = currentHash;

      await Deno.mkdir(this.backupDir, { recursive: true });

      const fileName = this.filePath.split("/").pop() || "structure.md";
      const baseName = fileName.replace(/\.md$/, "");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFileName = `${baseName}_backup_${timestamp}.md`;
      const backupPath = `${this.backupDir}/${backupFileName}`;

      await Deno.writeTextFile(backupPath, content);
      console.log(`Created backup: ${backupPath}`);

      await this.cleanupOldBackups(baseName);
    } catch (error) {
      console.warn("Failed to create backup:", error);
    }
  }

  /**
   * Removes old backups, keeping only the most recent maxBackups files
   */
  protected async cleanupOldBackups(baseName: string): Promise<void> {
    try {
      const backupFiles: { name: string; mtime: Date }[] = [];

      for await (const entry of Deno.readDir(this.backupDir)) {
        if (
          entry.isFile &&
          entry.name.startsWith(`${baseName}_backup_`) &&
          entry.name.endsWith(".md")
        ) {
          const filePath = `${this.backupDir}/${entry.name}`;
          const stat = await Deno.stat(filePath);
          backupFiles.push({
            name: entry.name,
            mtime: stat.mtime || new Date(0),
          });
        }
      }

      backupFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      const filesToDelete = backupFiles.slice(this.maxBackups);
      for (const file of filesToDelete) {
        try {
          await Deno.remove(`${this.backupDir}/${file.name}`);
          console.log(`Removed old backup: ${file.name}`);
        } catch (error) {
          if ((error as Deno.errors.NotFound)?.name !== "NotFound") {
            console.warn(`Failed to remove backup ${file.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to cleanup old backups:", (error as Error).message);
    }
  }

  /**
   * Safe write with locking, backup, and atomic write.
   * Uses write lock to prevent race conditions and atomic writes to prevent corruption.
   */
  async safeWriteFile(content: string): Promise<void> {
    await this.withWriteLock(async () => {
      await this.createBackup();
      await this.atomicWriteFile(content);
    });
  }
}
