/**
 * Backup archive — minimal POSIX ustar TAR writer and reader.
 * Pattern: Utility module (pure functions, no state).
 *
 * No external dependencies. Implements only what is needed for project
 * backups: regular files only, no symlinks, no special files.
 *
 * Excluded from pack: .git/, .mdplanner.db
 */

import { join, relative } from "@std/path";
import { walk } from "@std/fs";

// ---- TAR constants ------------------------------------------------------

const BLOCK = 512;
const END_OF_ARCHIVE = new Uint8Array(BLOCK * 2); // two zero blocks

// ---- Low-level header helpers -------------------------------------------

function writeOctal(
  buf: Uint8Array,
  offset: number,
  len: number,
  value: number,
): void {
  const s = value.toString(8).padStart(len - 1, "0");
  for (let i = 0; i < len - 1; i++) {
    buf[offset + i] = s.charCodeAt(i);
  }
  buf[offset + len - 1] = 0;
}

function readOctal(buf: Uint8Array, offset: number, len: number): number {
  let s = "";
  for (let i = 0; i < len; i++) {
    const c = buf[offset + i];
    if (c === 0 || c === 0x20) break;
    s += String.fromCharCode(c);
  }
  return parseInt(s, 8) || 0;
}

function writeString(
  buf: Uint8Array,
  offset: number,
  len: number,
  s: string,
): void {
  for (let i = 0; i < Math.min(s.length, len - 1); i++) {
    buf[offset + i] = s.charCodeAt(i);
  }
}

function readString(buf: Uint8Array, offset: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    if (buf[offset + i] === 0) break;
    s += String.fromCharCode(buf[offset + i]);
  }
  return s;
}

function computeChecksum(header: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) {
    // Checksum field (offset 148, len 8) is treated as spaces during calculation
    sum += (i >= 148 && i < 156) ? 0x20 : header[i];
  }
  return sum;
}

// ---- Header encode/decode -----------------------------------------------

/**
 * Build a 512-byte ustar header for a regular file.
 * If the path is longer than 100 bytes it is split into prefix + name
 * (max combined 255 bytes). Paths longer than 255 bytes are unsupported.
 */
function buildHeader(tarPath: string, size: number, mtime: number): Uint8Array {
  const hdr = new Uint8Array(BLOCK);

  // Split path into name (≤100) and prefix (≤155) if needed
  let name = tarPath;
  let prefix = "";
  if (tarPath.length > 99) {
    const idx = tarPath.lastIndexOf("/", 99);
    if (idx === -1) throw new Error(`Path too long for TAR header: ${tarPath}`);
    prefix = tarPath.slice(0, idx);
    name = tarPath.slice(idx + 1);
    if (prefix.length > 154) {
      throw new Error(`Path prefix too long: ${tarPath}`);
    }
  }

  writeString(hdr, 0, 100, name); // name
  writeOctal(hdr, 100, 8, 0o644); // mode
  writeOctal(hdr, 108, 8, 0); // uid
  writeOctal(hdr, 116, 8, 0); // gid
  writeOctal(hdr, 124, 12, size); // size
  writeOctal(hdr, 136, 12, mtime); // mtime
  // checksum placeholder: spaces (filled below)
  hdr[156] = 0x30; // typeflag '0' = regular file
  // linkname: 100 bytes, zero-filled
  writeString(hdr, 265, 6, "ustar "); // magic
  writeString(hdr, 271, 2, " "); // version (old-style space-space)
  writeString(hdr, 345, 155, prefix); // prefix

  // Write checksum
  const checksum = computeChecksum(hdr);
  // 6 octal digits + null + space (POSIX)
  const cks = checksum.toString(8).padStart(6, "0");
  for (let i = 0; i < 6; i++) hdr[148 + i] = cks.charCodeAt(i);
  hdr[154] = 0;
  hdr[155] = 0x20;

  return hdr;
}

// ---- Pack ---------------------------------------------------------------

/**
 * Entries to exclude from the archive.
 * Relative paths from project root (using forward slashes).
 */
function shouldExclude(rel: string): boolean {
  return (
    rel === ".mdplanner.db" ||
    rel.startsWith(".git/") ||
    rel.startsWith(".git\\") ||
    rel === ".git"
  );
}

/** Pad data to the next 512-byte boundary. */
function padToBlock(data: Uint8Array): Uint8Array {
  const rem = data.length % BLOCK;
  if (rem === 0) return data;
  const padded = new Uint8Array(data.length + (BLOCK - rem));
  padded.set(data);
  return padded;
}

export interface PackOptions {
  /** Absolute path to project root. */
  projectDir: string;
}

/**
 * Walk the project directory and return a TAR archive as a Uint8Array.
 * All paths inside the archive are relative to the project root.
 */
export async function packProject(options: PackOptions): Promise<Uint8Array> {
  const { projectDir } = options;
  const chunks: Uint8Array[] = [];

  for await (const entry of walk(projectDir, { includeDirs: false })) {
    const rel = relative(projectDir, entry.path).replaceAll("\\", "/");

    if (shouldExclude(rel)) continue;

    const data = await Deno.readFile(entry.path);
    const stat = await Deno.stat(entry.path);
    const mtime = Math.floor((stat.mtime?.getTime() ?? Date.now()) / 1000);

    const header = buildHeader(rel, data.length, mtime);
    chunks.push(header);
    chunks.push(padToBlock(data));
  }

  // End-of-archive marker
  chunks.push(END_OF_ARCHIVE);

  // Concatenate all chunks
  const totalLen = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// ---- Unpack -------------------------------------------------------------

export interface UnpackOptions {
  /** TAR bytes (already decrypted if applicable). */
  data: Uint8Array;
  /** Absolute path to the directory to extract into. */
  targetDir: string;
  /** Overwrite existing files (default false). */
  overwrite?: boolean;
}

export interface UnpackResult {
  extracted: string[];
  skipped: string[];
}

/**
 * Extract a TAR archive into `targetDir`.
 * Paths that escape the target directory via `..` are rejected.
 */
export async function unpackToDir(
  options: UnpackOptions,
): Promise<UnpackResult> {
  const { data, targetDir, overwrite = false } = options;
  const extracted: string[] = [];
  const skipped: string[] = [];

  let offset = 0;

  while (offset + BLOCK <= data.length) {
    const header = data.slice(offset, offset + BLOCK);
    offset += BLOCK;

    // Check for end-of-archive (two zero blocks)
    if (header.every((b) => b === 0)) break;

    const typeflag = header[156];
    // Skip non-regular-file entries (directories, symlinks, etc.)
    if (typeflag !== 0x30 && typeflag !== 0) {
      const size = readOctal(header, 124, 12);
      offset += Math.ceil(size / BLOCK) * BLOCK;
      continue;
    }

    let name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    if (prefix) name = prefix + "/" + name;

    const size = readOctal(header, 124, 12);

    // Validate path (no traversal)
    if (name.includes("..") || name.startsWith("/")) {
      const dataBlocks = Math.ceil(size / BLOCK) * BLOCK;
      offset += dataBlocks;
      skipped.push(name);
      continue;
    }

    const destPath = join(targetDir, name);

    // Ensure parent directory exists
    const parentDir = destPath.slice(0, destPath.lastIndexOf("/"));
    await Deno.mkdir(parentDir, { recursive: true }).catch(() => {});

    // Read file data
    const fileData = data.slice(offset, offset + size);
    offset += Math.ceil(size / BLOCK) * BLOCK;

    // Skip if exists and no overwrite
    if (!overwrite) {
      try {
        await Deno.stat(destPath);
        skipped.push(name);
        continue;
      } catch {
        // File does not exist — proceed
      }
    }

    await Deno.writeFile(destPath, fileData);
    extracted.push(name);
  }

  return { extracted, skipped };
}
