/**
 * Cerveau directory reader — read-only access to ~/.cerveau structure.
 * Reads brains.json, registry.json, protocol rules, and brain directories.
 */

import { join, relative } from "@std/path";

// --- Types ---

export interface CerveauBrain {
  name: string;
  path: string;
  codebase: string;
  isCore: boolean;
  stacks: string[];
  practices: string[];
  workflows: string[];
  agents: string[];
}

export interface CerveauPackage {
  name: string;
  description: string;
  type: string;
  files: string[];
  tags: string[];
}

export interface CerveauRegistry {
  version: string;
  packages: CerveauPackage[];
}

export interface CerveauManifest {
  version: string;
  protocol: string;
  min_claude_version?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  isSymlink: boolean;
  size?: number;
}

// --- Reader ---

export class CerveauReader {
  readonly baseDir: string;

  constructor(cerveauDir: string) {
    this.baseDir = cerveauDir;
  }

  /** Read the manifest (cerveau-package.json). */
  async manifest(): Promise<CerveauManifest | null> {
    try {
      const data = await Deno.readTextFile(
        join(this.baseDir, "cerveau-package.json"),
      );
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /** Read all brains from _configs_/brains.json. */
  async brains(): Promise<CerveauBrain[]> {
    try {
      const data = await Deno.readTextFile(
        join(this.baseDir, "_configs_", "brains.json"),
      );
      const parsed = JSON.parse(data);
      return parsed.brains ?? [];
    } catch {
      return [];
    }
  }

  /** Read the package registry from _configs_/registry.json. */
  async registry(): Promise<CerveauRegistry | null> {
    try {
      const data = await Deno.readTextFile(
        join(this.baseDir, "_configs_", "registry.json"),
      );
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /** List files in a directory within the cerveau tree. */
  async listFiles(relPath: string): Promise<FileEntry[]> {
    const absPath = this.resolve(relPath);
    this.guardPath(absPath);
    const entries: FileEntry[] = [];
    try {
      for await (const entry of Deno.readDir(absPath)) {
        const entryPath = join(absPath, entry.name);
        const info = await Deno.lstat(entryPath);
        entries.push({
          name: entry.name,
          path: join(relPath, entry.name),
          isDir: entry.isDirectory,
          isSymlink: info.isSymlink,
          size: entry.isFile ? info.size : undefined,
        });
      }
    } catch {
      // Directory not found or unreadable
    }
    return entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  /** Read a file's content within the cerveau tree. */
  async readFile(relPath: string): Promise<string> {
    const absPath = this.resolve(relPath);
    this.guardPath(absPath);
    return await Deno.readTextFile(absPath);
  }

  /** List available protocol rule names in a subdirectory (stack, practices, workflow). */
  async protocolRuleNames(subdir: string): Promise<string[]> {
    const dir = join(this.baseDir, "_protocol_", ".claude", "rules", subdir);
    const names: string[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isDirectory || !entry.name.endsWith(".md")) continue;
        names.push(entry.name.slice(0, -3));
      }
    } catch {
      // Directory missing
    }
    return names.sort();
  }

  /** List available protocol hooks. */
  async protocolHooks(): Promise<string[]> {
    const dir = join(this.baseDir, "_protocol_", ".claude", "hooks");
    const names: string[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isDirectory) continue;
        names.push(entry.name);
      }
    } catch {
      // Directory missing
    }
    return names.sort();
  }

  /** List available protocol skills. */
  async protocolSkills(): Promise<string[]> {
    const dir = join(this.baseDir, "_protocol_", ".claude", "skills");
    const names: string[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (!entry.isDirectory) continue;
        names.push(entry.name);
      }
    } catch {
      // Directory missing
    }
    return names.sort();
  }

  /** List available protocol agents. */
  async protocolAgents(): Promise<string[]> {
    const dir = join(this.baseDir, "_protocol_", ".claude", "agents");
    const names: string[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isDirectory || !entry.name.endsWith(".md")) continue;
        names.push(entry.name.slice(0, -3));
      }
    } catch {
      // Directory missing
    }
    return names.sort();
  }

  /** Read the brain memory section from a brain's local-dev.md. */
  async brainMemory(brainRelPath: string): Promise<string> {
    const localDev = join(
      this.baseDir,
      brainRelPath,
      ".claude",
      "rules",
      "workflow",
      "local-dev.md",
    );
    try {
      const content = await Deno.readTextFile(localDev);
      const memIdx = content.indexOf("## Brain Memory");
      if (memIdx === -1) return "";
      return content.slice(memIdx);
    } catch {
      return "";
    }
  }

  /** Resolve a relative path within the cerveau directory. */
  private resolve(relPath: string): string {
    const resolved = join(this.baseDir, relPath);
    return resolved;
  }

  /** Guard against path traversal outside the cerveau directory. */
  private guardPath(absPath: string): void {
    const rel = relative(this.baseDir, absPath);
    if (rel.startsWith("..") || rel.startsWith("/")) {
      throw new Error("Path traversal outside cerveau directory");
    }
  }
}
