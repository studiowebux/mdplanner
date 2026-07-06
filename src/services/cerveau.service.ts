// Cerveau service — read-only access to a Cerveau root (_configs_, _packages_,
// version.txt). No repository/cache: it reads an external directory, not the
// project markdown store. The base dir comes from ProjectConfig.cerveauDir; when
// unset the viewer is not configured and methods throw CERVEAU_NOT_CONFIGURED.

import { join, relative } from "@std/path";
import type { ProjectService } from "./project.service.ts";
import type {
  CerveauBrain,
  CerveauFileEntry,
  CerveauPackage,
  CerveauProtocolOverview,
  CerveauRegistry,
} from "../types/cerveau.types.ts";

/** Read-only reader over the current Cerveau layout (registry + packages + brains). */
export class CerveauService {
  constructor(private projectService: ProjectService) {}

  /** Whether a cerveau root is configured. */
  async isConfigured(): Promise<boolean> {
    const dir = (await this.projectService.getConfig()).cerveauDir;
    return typeof dir === "string" && dir.length > 0;
  }

  /** Resolve the configured base dir or throw a clear error. */
  private async baseDir(): Promise<string> {
    const dir = (await this.projectService.getConfig()).cerveauDir;
    if (!dir) {
      throw new Error(
        "CERVEAU_NOT_CONFIGURED: set ProjectConfig.cerveauDir to a Cerveau root",
      );
    }
    return dir;
  }

  /** Read the cerveau version (version.txt at the root). */
  async version(): Promise<string | null> {
    try {
      const data = await Deno.readTextFile(
        join(await this.baseDir(), "version.txt"),
      );
      return data.trim();
    } catch {
      return null;
    }
  }

  /** Read all brains from _configs_/brains.json. */
  async brains(): Promise<CerveauBrain[]> {
    try {
      const data = await Deno.readTextFile(
        join(await this.baseDir(), "_configs_", "brains.json"),
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
        join(await this.baseDir(), "_configs_", "registry.json"),
      );
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /** All packages declared in the registry (empty if no registry). */
  async packages(): Promise<CerveauPackage[]> {
    const registry = await this.registry();
    return registry?.packages ?? [];
  }

  /**
   * Files of a package, optionally filtered by type. Identifies the package by
   * org + name (+ optional version; defaults to every matching version).
   */
  async packageFiles(
    org: string,
    name: string,
    version?: string,
    type?: string,
  ): Promise<string[]> {
    const pkgs = await this.packages();
    const matches = pkgs.filter((p) =>
      p.org === org && p.name === name &&
      (version === undefined || p.version === version)
    );
    const files = matches.flatMap((p) =>
      p.files.filter((f) => type === undefined || f.type === type)
    );
    return [...new Set(files.map((f) => f.name))].sort();
  }

  /**
   * Protocol overview — package file names grouped by type, aggregated across
   * the registry (e.g. { rules: [...], hooks: [...], skills: [...] }).
   */
  async protocolOverview(): Promise<CerveauProtocolOverview> {
    const pkgs = await this.packages();
    const byType: Record<string, Set<string>> = {};
    for (const pkg of pkgs) {
      for (const file of pkg.files) {
        (byType[file.type] ??= new Set()).add(file.name);
      }
    }
    const overview: CerveauProtocolOverview = {};
    for (const [type, names] of Object.entries(byType)) {
      overview[type] = [...names].sort();
    }
    return overview;
  }

  /** List files in a directory within the cerveau tree. */
  async listFiles(relPath: string): Promise<CerveauFileEntry[]> {
    const base = await this.baseDir();
    const absPath = this.resolve(base, relPath);
    this.guardPath(base, absPath);
    const entries: CerveauFileEntry[] = [];
    try {
      for await (const entry of Deno.readDir(absPath)) {
        const entryPath = join(absPath, entry.name);
        const linfo = await Deno.lstat(entryPath);
        // Follow symlinks to determine if the target is a directory.
        const resolved = linfo.isSymlink ? await Deno.stat(entryPath) : linfo;
        entries.push({
          name: entry.name,
          path: join(relPath, entry.name),
          isDir: resolved.isDirectory,
          isSymlink: linfo.isSymlink,
          size: resolved.isFile ? resolved.size : undefined,
        });
      }
    } catch {
      // Directory not found or unreadable.
    }
    return entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  /** Recursively list the full directory tree under a relative path. */
  async listTree(relPath: string): Promise<CerveauFileEntry[]> {
    const entries = await this.listFiles(relPath);
    for (const entry of entries) {
      if (entry.isDir) {
        entry.children = await this.listTree(entry.path);
      }
    }
    return entries;
  }

  /** Read a file's content within the cerveau tree. */
  async readFile(relPath: string): Promise<string> {
    const base = await this.baseDir();
    const absPath = this.resolve(base, relPath);
    this.guardPath(base, absPath);
    const info = await Deno.stat(absPath);
    if (info.isDirectory) {
      throw new Error("Is a directory");
    }
    return await Deno.readTextFile(absPath);
  }

  /** Read the Brain Memory section from a brain's local-dev.md. */
  async brainMemory(brainRelPath: string): Promise<string> {
    const localDev = join(
      await this.baseDir(),
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
  private resolve(base: string, relPath: string): string {
    return join(base, relPath);
  }

  /** Guard against path traversal outside the cerveau directory. */
  private guardPath(base: string, absPath: string): void {
    const rel = relative(base, absPath);
    if (rel.startsWith("..") || rel.startsWith("/")) {
      throw new Error("Path traversal outside cerveau directory");
    }
  }
}
