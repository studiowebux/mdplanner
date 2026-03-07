/**
 * BrainRegistry — loads/saves brains.json, provides CRUD for brain entries,
 * and lists available rule files from the protocol directory.
 */

import { dirname, join, resolve } from "@std/path";
import {
  type Brain,
  type BrainInfo,
  RegistryFileSchema,
  type UpdateBrain,
} from "./schemas.ts";

export class BrainRegistry {
  readonly path: string;
  readonly baseDir: string;
  private brains: Brain[] = [];

  constructor(registryPath: string) {
    this.path = resolve(registryPath);
    this.baseDir = dirname(this.path);
  }

  async load(): Promise<void> {
    try {
      const data = await Deno.readTextFile(this.path);
      const parsed = RegistryFileSchema.parse(JSON.parse(data));
      this.brains = parsed.brains.map((b) => ({
        ...b,
        path: resolve(this.baseDir, b.path),
      }));
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        this.brains = [];
        return;
      }
      throw e;
    }
  }

  private async save(): Promise<void> {
    const data = JSON.stringify({ brains: this.brains }, null, 2);
    await Deno.writeTextFile(this.path, data);
  }

  list(): Brain[] {
    return [...this.brains];
  }

  async listWithInfo(claudeDir: string): Promise<BrainInfo[]> {
    return await Promise.all(
      this.brains.map(async (b) => ({
        ...b,
        lastActive: await brainLastActive(claudeDir, b.path),
      })),
    );
  }

  get(name: string): Brain | undefined {
    return this.brains.find((b) => b.name === name);
  }

  core(): Brain | undefined {
    return this.brains.find((b) => b.isCore);
  }

  async register(brain: Brain): Promise<void> {
    if (this.brains.some((b) => b.name === brain.name)) {
      throw new Error(`brain "${brain.name}" already registered`);
    }
    try {
      await Deno.stat(brain.path);
    } catch {
      throw new Error(`path does not exist: ${brain.path}`);
    }
    if (brain.isCore) {
      for (const b of this.brains) b.isCore = false;
    }
    this.brains.push(brain);
    await this.save();
  }

  async remove(name: string): Promise<void> {
    const idx = this.brains.findIndex((b) => b.name === name);
    if (idx === -1) throw new Error(`brain "${name}" not found`);
    this.brains.splice(idx, 1);
    await this.save();
  }

  async update(name: string, patch: UpdateBrain): Promise<Brain> {
    const idx = this.brains.findIndex((b) => b.name === name);
    if (idx === -1) throw new Error(`brain "${name}" not found`);
    if (patch.isCore) {
      for (const b of this.brains) b.isCore = false;
    }
    const brain = this.brains[idx];
    if (patch.name !== undefined) brain.name = patch.name;
    if (patch.isCore !== undefined) brain.isCore = patch.isCore;
    if (patch.stacks !== undefined) brain.stacks = patch.stacks;
    if (patch.practices !== undefined) brain.practices = patch.practices;
    if (patch.workflows !== undefined) brain.workflows = patch.workflows;
    await this.save();
    return brain;
  }

  protocolRulesDir(): string {
    return join(this.baseDir, "_protocol_", ".claude", "rules");
  }

  async listRuleNames(subdir: string): Promise<string[]> {
    const dir = join(this.protocolRulesDir(), subdir);
    const names: string[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isDirectory || !entry.name.endsWith(".md")) continue;
        names.push(entry.name.slice(0, -3));
      }
    } catch {
      // Directory missing — return empty
    }
    return names.sort();
  }
}

/** Returns RFC3339 timestamp of the most recently modified session file, or null. */
async function brainLastActive(
  claudeDir: string,
  brainPath: string,
): Promise<string | null> {
  const slug = pathToSlug(brainPath);
  const dir = join(claudeDir, "projects", slug);
  let latest = 0;
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory || !entry.name.endsWith(".jsonl")) continue;
      const info = await Deno.stat(join(dir, entry.name));
      if (info.mtime && info.mtime.getTime() > latest) {
        latest = info.mtime.getTime();
      }
    }
  } catch {
    return null;
  }
  return latest > 0 ? new Date(latest).toISOString() : null;
}

/** Converts brain path to Claude session directory slug (/ and @ become -). */
export function pathToSlug(p: string): string {
  return p.replaceAll("/", "-").replaceAll("@", "-");
}
