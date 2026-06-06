/**
 * WebDAV lock store (RFC 4918 Class 2) — in-memory locks indexed by token and
 * by path, persisted to `<stateDir>/locks.json`. Expired locks are pruned
 * lazily on read. Mutations await persistence before returning so no write op
 * leaks past the request (durable locks + no op-sanitizer flake in tests).
 */

import { join } from "@std/path";
import { atomicWrite } from "./fs-ops.ts";
import type { Logger } from "./types.ts";

export interface Lock {
  token: string;
  path: string;
  depth: string;
  scope: "exclusive" | "shared";
  owner: string;
  timeout: number;
  created: number;
}

export class LockStore {
  private locks = new Map<string, Lock>();
  private pathLocks = new Map<string, Set<string>>();
  private readonly locksFile: string;

  constructor(stateDir: string, private log: Logger) {
    this.locksFile = join(stateDir, "locks.json");
  }

  private async persist(): Promise<void> {
    try {
      await atomicWrite(
        this.locksFile,
        new TextEncoder().encode(
          JSON.stringify([...this.locks.values()], null, 2),
        ),
      );
    } catch (e) {
      this.log("WARN", "Failed to persist locks", { err: String(e) });
    }
  }

  async load(): Promise<void> {
    try {
      const items: Lock[] = JSON.parse(
        await Deno.readTextFile(this.locksFile),
      );
      const now = Date.now();
      for (const l of items) {
        if (l.timeout > now) {
          this.locks.set(l.token, l);
          if (!this.pathLocks.has(l.path)) {
            this.pathLocks.set(l.path, new Set());
          }
          this.pathLocks.get(l.path)!.add(l.token);
        }
      }
      this.log("INFO", `Restored ${this.locks.size} active lock(s)`);
    } catch { /* first run */ }
  }

  get(token: string): Lock | undefined {
    return this.locks.get(token);
  }

  async add(lock: Lock): Promise<void> {
    this.locks.set(lock.token, lock);
    if (!this.pathLocks.has(lock.path)) {
      this.pathLocks.set(lock.path, new Set());
    }
    this.pathLocks.get(lock.path)!.add(lock.token);
    await this.persist();
  }

  async remove(token: string): Promise<void> {
    const lock = this.locks.get(token);
    if (!lock) return;
    this.locks.delete(token);
    this.pathLocks.get(lock.path)?.delete(token);
    await this.persist();
  }

  /** Refresh an existing lock's timeout (LOCK with no body + If token). */
  async refresh(token: string, timeoutSec: number): Promise<Lock | null> {
    const existing = this.locks.get(token);
    if (!existing) return null;
    existing.timeout = Date.now() + timeoutSec * 1000;
    this.locks.set(token, existing);
    await this.persist();
    return existing;
  }

  /**
   * Active (non-expired) locks for a path. Expired locks are pruned from memory
   * here; the on-disk file is not rewritten on prune (the next mutation rewrites
   * it, and `load()` re-filters expired entries) so this read path starts no
   * write op.
   */
  getActive(path: string): Lock[] {
    const tokens = this.pathLocks.get(path);
    if (!tokens) return [];
    const now = Date.now();
    const active: Lock[] = [];
    for (const t of [...tokens]) {
      const l = this.locks.get(t);
      if (!l) continue;
      if (l.timeout < now) {
        this.locks.delete(t);
        tokens.delete(t);
      } else {
        active.push(l);
      }
    }
    return active;
  }

  checkConflict(
    fsPath: string,
    method: string,
    ifHeader: string | null,
  ): string | null {
    const active = this.getActive(fsPath);
    if (active.length === 0) return null;
    const readOnly = ["GET", "HEAD", "OPTIONS", "PROPFIND"].includes(method);
    if (readOnly) return null;
    const provided = new Set<string>();
    if (ifHeader) {
      for (const m of ifHeader.matchAll(/<(urn:uuid:[^>]+)>/g)) {
        provided.add(m[1]);
      }
    }
    for (const lock of active) {
      if (!provided.has(lock.token)) return lock.token;
    }
    return null;
  }
}
