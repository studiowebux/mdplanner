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
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export class BackupScheduler {
  private readonly options: SchedulerOptions;
  private timer: ReturnType<typeof setInterval> | null = null;
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
    };
  }

  start(): void {
    const ms = this.options.intervalHours * 60 * 60 * 1000;
    console.log(
      `[backup] scheduler started — every ${this.options.intervalHours}h → ${this.options.backupDir}`,
    );
    this.timer = setInterval(() => {
      this.runBackup().catch(() => {});
    }, ms);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
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
      this.status.lastBackupTime = new Date().toISOString();
      this.status.lastBackupSize = payload.length;
      this.status.lastBackupFile = filename;
      this.status.lastError = null;
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
