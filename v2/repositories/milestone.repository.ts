// Milestone repository — reads and writes milestone markdown files from disk or SQLite cache.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import { buildFrontmatter, mergeFields } from "../utils/repo-helpers.ts";
import type {
  CreateMilestone,
  MilestoneBase,
  UpdateMilestone,
} from "../types/milestone.types.ts";
import type { CacheDatabase } from "../database/sqlite/mod.ts";
import { rowToMilestone } from "../domains/milestone/cache.ts";
import {
  MILESTONE_BODY_KEYS,
  MILESTONE_TABLE,
} from "../domains/milestone/constants.cache.ts";

export class MilestoneRepository {
  private milestonesDir: string;
  private writer = new SafeWriter();
  private cacheDb: CacheDatabase | null = null;

  constructor(projectDir: string) {
    this.milestonesDir = join(projectDir, "milestones");
  }

  setCacheDb(db: CacheDatabase): void {
    this.cacheDb = db;
  }

  async findAll(): Promise<MilestoneBase[]> {
    if (this.cacheDb) {
      try {
        const count = this.cacheDb.count(MILESTONE_TABLE);
        if (count > 0) {
          return this.cacheDb.query<Record<string, unknown>>(
            `SELECT * FROM "${MILESTONE_TABLE}"`,
          ).map(rowToMilestone);
        }
      } catch { /* fall through to disk */ }
    }
    return this.findAllFromDisk();
  }

  /** Always read from disk — used by cache sync. */
  async findAllFromDisk(): Promise<MilestoneBase[]> {
    const milestones: MilestoneBase[] = [];
    try {
      for await (const entry of Deno.readDir(this.milestonesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(
          join(this.milestonesDir, entry.name),
        );
        const m = this.parse(content);
        if (m) milestones.push(m);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return milestones;
  }

  async findById(id: string): Promise<MilestoneBase | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${MILESTONE_TABLE}" WHERE id = ?`,
          [id],
        );
        if (row) return rowToMilestone(row);
      } catch { /* fall through to disk */ }
    }
    const { base } = await this.findFileById(id);
    return base;
  }

  async findByName(name: string): Promise<MilestoneBase | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${MILESTONE_TABLE}" WHERE name = ?`,
          [name],
        );
        if (row) return rowToMilestone(row);
      } catch { /* fall through to disk */ }
    }
    const all = await this.findAllFromDisk();
    return all.find((m) => m.name === name) ?? null;
  }

  async create(data: CreateMilestone): Promise<MilestoneBase> {
    await Deno.mkdir(this.milestonesDir, { recursive: true });
    const id = generateId("milestone");
    const createdAt = new Date().toISOString();
    const status = data.status ?? "open";

    const { name, description, ...rest } = data;
    const fm = {
      id,
      ...buildFrontmatter(rest as Record<string, unknown>, []),
      status,
      createdAt,
    };

    const body = `# ${name}\n\n${description ?? ""}`.trimEnd();
    const filePath = join(this.milestonesDir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, serializeFrontmatter(fm, body)),
    );

    return { id, name, status, target: data.target, description, project: data.project, createdAt };
  }

  async update(
    id: string,
    data: UpdateMilestone,
  ): Promise<MilestoneBase | null> {
    const { file, base } = await this.findFileById(id);
    if (!file || !base) return null;

    const updated = mergeFields(
      { ...base },
      data as Record<string, unknown>,
    );

    // Special case: status change triggers completedAt
    if (data.status !== undefined) {
      if (data.status === "completed" && base.status !== "completed") {
        updated.completedAt = new Date().toISOString();
      } else if (data.status === "open") {
        updated.completedAt = undefined;
      }
    }

    const fm = buildFrontmatter(
      updated as Record<string, unknown>,
      MILESTONE_BODY_KEYS,
    );
    const body = `# ${updated.name}\n\n${updated.description ?? ""}`.trimEnd();
    await this.writer.write(
      id,
      () => atomicWrite(file, serializeFrontmatter(fm, body)),
    );

    return updated as MilestoneBase;
  }

  async delete(id: string): Promise<boolean> {
    const { file } = await this.findFileById(id);
    if (!file) return false;
    await Deno.remove(file);
    return true;
  }

  private async findFileById(
    id: string,
  ): Promise<{ file: string | null; base: MilestoneBase | null }> {
    try {
      for await (const entry of Deno.readDir(this.milestonesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const filePath = join(this.milestonesDir, entry.name);
        const content = await Deno.readTextFile(filePath);
        const m = this.parse(content);
        if (m?.id === id) return { file: filePath, base: m };
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return { file: null, base: null };
  }

  private parse(content: string): MilestoneBase | null {
    const { frontmatter: fm, body } = parseFrontmatter(content);
    if (!fm.id) return null;

    // Title from first # heading
    const titleMatch = body.match(/^#\s+(.+)/m);
    const name = titleMatch?.[1]?.trim() ?? String(fm.id);

    // Description: everything after the title line
    const lines = body.split("\n");
    const titleIdx = lines.findIndex((l) => /^#\s+/.test(l));
    const desc = titleIdx >= 0
      ? lines.slice(titleIdx + 1).join("\n").trim()
      : undefined;

    return {
      id: String(fm.id),
      name,
      status: fm.status === "completed" ? "completed" : "open",
      target: fm.target != null ? String(fm.target) : undefined,
      description: desc || undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      completedAt: fm.completedAt != null ? String(fm.completedAt) : undefined,
      createdAt: fm.createdAt != null ? String(fm.createdAt) : undefined,
    };
  }
}
