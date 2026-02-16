/**
 * Base class for directory-based parsers.
 * Provides file scanning, atomic writes, and common utilities.
 */
import {
  buildFileContent,
  type ParsedFile,
  parseFrontmatter,
  serializeFrontmatter,
} from "./frontmatter.ts";

export interface DirectoryParserOptions {
  projectDir: string;
  sectionName: string;
}

export abstract class DirectoryParser<T extends { id: string }> {
  protected projectDir: string;
  protected sectionDir: string;
  protected sectionName: string;
  protected writeLocks: Map<string, Promise<void>> = new Map();

  constructor(options: DirectoryParserOptions) {
    this.projectDir = options.projectDir;
    this.sectionName = options.sectionName;
    this.sectionDir = `${options.projectDir}/${options.sectionName}`;
  }

  /**
   * Ensure the section directory exists.
   */
  async ensureDir(): Promise<void> {
    await Deno.mkdir(this.sectionDir, { recursive: true });
  }

  /**
   * Get all files in the section directory.
   */
  async listFiles(): Promise<string[]> {
    const files: string[] = [];
    try {
      for await (const entry of Deno.readDir(this.sectionDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          files.push(`${this.sectionDir}/${entry.name}`);
        }
      }
    } catch (error) {
      if ((error as Deno.errors.NotFound)?.name !== "NotFound") {
        throw error;
      }
    }
    return files.sort();
  }

  /**
   * Read all items from the section directory.
   */
  async readAll(): Promise<T[]> {
    const files = await this.listFiles();
    const items: T[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const item = this.parseFile(content, filePath);
        if (item) {
          items.push(item);
        }
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return items;
  }

  /**
   * Read a single item by ID.
   * First tries direct file lookup, then falls back to scanning all files.
   */
  async read(id: string): Promise<T | null> {
    // Try direct file lookup first (fast path)
    const filePath = this.getFilePath(id);
    try {
      const content = await Deno.readTextFile(filePath);
      const item = this.parseFile(content, filePath);
      if (item && item.id === id) {
        return item;
      }
    } catch {
      // File not found by name, fall through to scan
    }

    // Fall back to scanning all files for matching ID
    const items = await this.readAll();
    return items.find((item) => item.id === id) || null;
  }

  /**
   * Write a single item. Creates or updates the file.
   */
  async write(item: T): Promise<void> {
    await this.ensureDir();

    // Find existing file path by scanning for matching ID
    let filePath = this.getFilePath(item.id);
    try {
      for await (const entry of Deno.readDir(this.sectionDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const candidatePath = `${this.sectionDir}/${entry.name}`;
          try {
            const content = await Deno.readTextFile(candidatePath);
            const parsed = this.parseFile(content, candidatePath);
            if (parsed && parsed.id === item.id) {
              filePath = candidatePath;
              break;
            }
          } catch {
            // Skip unparseable files
          }
        }
      }
    } catch {
      // Directory doesn't exist yet, use default path
    }

    const content = this.serializeItem(item);

    await this.withWriteLock(item.id, async () => {
      await this.atomicWriteFile(filePath, content);
    });
  }

  /**
   * Delete an item by ID.
   */
  async delete(id: string): Promise<boolean> {
    // Find file by scanning for matching ID
    let filePath: string | null = null;
    try {
      for await (const entry of Deno.readDir(this.sectionDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const candidatePath = `${this.sectionDir}/${entry.name}`;
          try {
            const content = await Deno.readTextFile(candidatePath);
            const parsed = this.parseFile(content, candidatePath);
            if (parsed && parsed.id === id) {
              filePath = candidatePath;
              break;
            }
          } catch {
            // Skip unparseable files
          }
        }
      }
    } catch {
      return false;
    }

    if (!filePath) {
      return false;
    }

    try {
      await Deno.remove(filePath);
      return true;
    } catch (error) {
      if ((error as Deno.errors.NotFound)?.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  /**
   * Save all items (bulk replace).
   * Deletes items not in the new list, updates existing, adds new.
   */
  async saveAll(items: T[]): Promise<void> {
    await this.ensureDir();

    // Build map of new items by ID
    const newItemsById = new Map<string, T>();
    for (const item of items) {
      newItemsById.set(item.id, item);
    }

    // Get existing files
    const existingFiles = await this.listFiles();
    const existingIds = new Set<string>();

    // Delete files not in new list
    for (const filePath of existingFiles) {
      const content = await Deno.readTextFile(filePath);
      const item = this.parseFile(content, filePath);
      if (item) {
        existingIds.add(item.id);
        if (!newItemsById.has(item.id)) {
          await Deno.remove(filePath);
        }
      }
    }

    // Write all items from new list
    for (const item of items) {
      await this.write(item);
    }
  }

  /**
   * Generate a unique ID for new items.
   */
  generateId(prefix: string = this.sectionName): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get the file path for an item ID.
   */
  protected getFilePath(id: string): string {
    // Sanitize ID for filesystem
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${this.sectionDir}/${safeId}.md`;
  }

  /**
   * Acquire write lock for a specific item.
   */
  protected async withWriteLock<R>(
    id: string,
    operation: () => Promise<R>,
  ): Promise<R> {
    const previousLock = this.writeLocks.get(id) || Promise.resolve();
    let releaseLock: () => void;
    const newLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.writeLocks.set(id, newLock);

    try {
      await previousLock;
      return await operation();
    } finally {
      releaseLock!();
      // Clean up old locks
      if (this.writeLocks.get(id) === newLock) {
        this.writeLocks.delete(id);
      }
    }
  }

  /**
   * Atomic write using temp file + rename.
   */
  protected async atomicWriteFile(
    filePath: string,
    content: string,
  ): Promise<void> {
    const tempPath = filePath + ".tmp";
    await Deno.writeTextFile(tempPath, content);
    await Deno.rename(tempPath, filePath);
  }

  /**
   * Parse file content into item. Must be implemented by subclass.
   */
  protected abstract parseFile(content: string, filePath: string): T | null;

  /**
   * Serialize item to file content. Must be implemented by subclass.
   */
  protected abstract serializeItem(item: T): string;
}

// Re-export frontmatter utilities for convenience
export {
  buildFileContent,
  type ParsedFile,
  parseFrontmatter,
  serializeFrontmatter,
};
