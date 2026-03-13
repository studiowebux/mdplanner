/**
 * Backup scheduler — runs automated backups at a configured interval.
 * Pattern: Singleton service started at server boot.
 *
 * When --backup-dir is set the scheduler writes a TAR (or encrypted TAR)
 * to that directory at the configured interval. Errors are logged but
 * never crash the server.
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { packProject } from "./archive.ts";
import { encryptPayload } from "./crypto.ts";

export interface SchedulerOptions {
  /** Absolute path to the project being backed up. */
  projectDir: string;
  /** Absolute path to the directory where backup files are written. */
  backupDir: string;
  /** Backup frequency in hours. Must be > 0. */
  intervalHours: number;
  /** Hex-encoded RSA public key. When set backups are encrypted. */
  publicKeyHex?: string;
}

export interface BackupStatus {
  enabled: boolean;
  backupDir: string | null;
  intervalHours: number | null;
  encrypted: boolean;
  lastBackupTime: string | null;
  lastBackupSize: number | null;
  lastBackupFile: string | null;
  lastError: string | null;
  nextBackupTime: string | null;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export class BackupScheduler {
  private readonly options: SchedulerOptions;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private status: BackupStatus;

  constructor(options: SchedulerOptions) {
    this.options = options;
    this.status = {
      enabled: true,
      backupDir: options.backupDir,
      intervalHours: options.intervalHours,
      encrypted: !!options.publicKeyHex,
      lastBackupTime: null,
      lastBackupSize: null,
      lastBackupFile: null,
      lastError: null,
      nextBackupTime: null,
    };
  }

  /**
   * Returns the age (ms) of the most recent backup file in backupDir.
   * Returns Infinity when no backups exist or the directory is unreadable.
   */
  private async lastBackupAgeMs(): Promise<number> {
    try {
      let latestMtime = 0;
      await ensureDir(this.options.backupDir);
      for await (const entry of Deno.readDir(this.options.backupDir)) {
        if (
          entry.isFile &&
          (entry.name.endsWith(".tar") || entry.name.endsWith(".tar.enc"))
        ) {
          const stat = await Deno.stat(
            join(this.options.backupDir, entry.name),
          );
          if (stat.mtime && stat.mtime.getTime() > latestMtime) {
            latestMtime = stat.mtime.getTime();
          }
        }
      }
      return latestMtime > 0 ? Date.now() - latestMtime : Infinity;
    } catch {
      return Infinity;
    }
  }

  /**
   * Schedule the first backup based on real wall-clock elapsed time.
   * If overdue (age >= interval) → run immediately.
   * Otherwise → wait only the remaining time, then switch to regular interval.
   */
  start(): void {
    const intervalMs = this.options.intervalHours * 60 * 60 * 1000;
    console.log(
      `[backup] scheduler started — every ${this.options.intervalHours}h → ${this.options.backupDir}`,
    );

    this.lastBackupAgeMs().then((ageMs) => {
      const delayMs = ageMs >= intervalMs ? 0 : intervalMs - ageMs;

      if (delayMs === 0) {
        console.log(
          `[backup] overdue (last backup ${
            Math.round(ageMs / 3_600_000)
          }h ago) — running immediately`,
        );
      } else {
        const nextTime = new Date(Date.now() + delayMs).toISOString();
        this.status.nextBackupTime = nextTime;
        console.log(
          `[backup] next backup in ${
            Math.round(delayMs / 60_000)
          }min (${nextTime})`,
        );
      }

      this.timer = setTimeout(() => {
        this.runBackup().catch(() => {}).finally(() => {
          // Switch to regular interval after first fire
          this.timer = setInterval(() => {
            this.runBackup().catch(() => {});
          }, intervalMs) as unknown as ReturnType<typeof setTimeout>;
        });
      }, delayMs);
    });
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getStatus(): BackupStatus {
    return { ...this.status };
  }

  async runBackup(): Promise<{ file: string; size: number }> {
    const { projectDir, backupDir, publicKeyHex } = this.options;

    await ensureDir(backupDir);

    let payload = await packProject({ projectDir });

    const ext = publicKeyHex ? ".tar.enc" : ".tar";
    if (publicKeyHex) {
      payload = await encryptPayload(publicKeyHex, payload);
    }

    const filename = `backup-${timestamp()}${ext}`;
    const filePath = join(backupDir, filename);

    try {
      await Deno.writeFile(filePath, payload);
      const now = new Date();
      this.status.lastBackupTime = now.toISOString();
      this.status.lastBackupSize = payload.length;
      this.status.lastBackupFile = filename;
      this.status.lastError = null;
      this.status.nextBackupTime = new Date(
        now.getTime() + this.options.intervalHours * 60 * 60 * 1000,
      ).toISOString();
      console.log(`[backup] wrote ${filename} (${payload.length} bytes)`);
      return { file: filename, size: payload.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.status.lastError = msg;
      console.error(`[backup] failed to write ${filename}: ${msg}`);
      throw err;
    }
  }
}

/** Singleton instance — null when no --backup-dir is configured. */
let _scheduler: BackupScheduler | null = null;

export function initScheduler(options: SchedulerOptions): BackupScheduler {
  _scheduler = new BackupScheduler(options);
  _scheduler.start();
  return _scheduler;
}

export function getScheduler(): BackupScheduler | null {
  return _scheduler;
}
