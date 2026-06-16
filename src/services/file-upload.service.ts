// Shared file upload service — entity-agnostic disk I/O for attachments.
// Tasks use basePath="uploads" (keeps existing paths: uploads/<id>/<file>).
// New entities use basePath="uploads/<type>" (e.g. uploads/notes/<id>/<file>).

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export class FileUploadService {
  constructor(
    private readonly projectDir: string,
    private readonly basePath: string,
  ) {}

  /** Sanitise a user-supplied filename to safe filesystem chars. */
  safeName(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  /** Relative path for a stored file (used as the attachment reference). */
  relPath(entityId: string, filename: string): string {
    return `${this.basePath}/${entityId}/${filename}`;
  }

  /** Absolute path on disk. */
  private absPath(entityId: string, filename: string): string {
    return `${this.projectDir}/${this.relPath(entityId, filename)}`;
  }

  /**
   * Validate size, write the file to disk, return the relative path.
   * Throws with a { status, message } shape for callers to convert to HTTP errors.
   */
  async store(
    entityId: string,
    file: File,
  ): Promise<{ relPath: string; safeName: string }> {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw Object.assign(new Error("Max 10 MB per file"), { status: 413 });
    }
    const safe = this.safeName(file.name);
    const dir = `${this.projectDir}/${this.basePath}/${entityId}`;
    await Deno.mkdir(dir, { recursive: true });
    const bytes = new Uint8Array(await file.arrayBuffer());
    await Deno.writeFile(`${dir}/${safe}`, bytes);
    return { relPath: this.relPath(entityId, safe), safeName: safe };
  }

  /**
   * Read a stored file and return its bytes + safe filename.
   * Returns null when the file does not exist.
   */
  async read(
    entityId: string,
    filename: string,
  ): Promise<{ bytes: Uint8Array<ArrayBuffer>; safeName: string } | null> {
    const safe = this.safeName(filename);
    try {
      const bytes = await Deno.readFile(
        this.absPath(entityId, safe),
      ) as Uint8Array<ArrayBuffer>;
      return { bytes, safeName: safe };
    } catch {
      return null;
    }
  }

  /**
   * Delete a stored file.
   * Returns the relative path that was removed (for attachment-list cleanup),
   * or null when the file did not exist.
   */
  async remove(
    entityId: string,
    filename: string,
  ): Promise<string | null> {
    const safe = this.safeName(filename);
    try {
      await Deno.remove(this.absPath(entityId, safe));
      return this.relPath(entityId, safe);
    } catch {
      return null;
    }
  }
}
