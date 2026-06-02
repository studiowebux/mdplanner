/**
 * Safe I/O utilities — atomic writes and in-process write locks.
 * Pattern: Guard pattern — prevents file corruption from concurrent
 * or interrupted writes.
 *
 * atomicWrite: temp file + rename (atomic on same-filesystem)
 * SafeWriter: per-ID promise chain serializing concurrent writes
 */

/**
 * Write content to a file atomically via temp file + rename.
 * If the process crashes mid-write, only the .tmp file is affected —
 * the original file remains intact.
 */
export async function atomicWrite(
  filePath: string,
  content: string,
): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await Deno.writeTextFile(tempPath, content);
  await Deno.rename(tempPath, filePath);
}

/**
 * In-process write serializer. Concurrent writes to the same ID are
 * queued — each waits for the previous to complete before executing.
 * Does not use OS-level file locks (caused hangs with stale .lock files).
 */
export class SafeWriter {
  private locks = new Map<string, Promise<void>>();

  async write<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve();
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(id, next);

    try {
      await previous;
      return await operation();
    } finally {
      release!();
      if (this.locks.get(id) === next) {
        this.locks.delete(id);
      }
    }
  }
}
