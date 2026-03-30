// Milestone repository — reads and writes milestone markdown files from disk or SQLite cache.

import { join } from "@std/path";
import { log } from "../singletons/logger.ts";
import { serializeFrontmatter } from "../utils/frontmatter.ts";
import { atomicWrite } from "../utils/safe-io.ts";
import { buildFrontmatter, mergeFields } from "../utils/repo-helpers.ts";
import { mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import type {
  CreateMilestone,
  MilestoneBase,
  UpdateMilestone,
} from "../types/milestone.types.ts";
import { rowToMilestone } from "../domains/milestone/cache.ts";
import {
  MILESTONE_BODY_KEYS,
  MILESTONE_TABLE,
} from "../domains/milestone/constants.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";

export class MilestoneRepository extends CachedMarkdownRepository<
  MilestoneBase,
  CreateMilestone,
  UpdateMilestone
> {
  protected readonly tableName = MILESTONE_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "milestones",
      idPrefix: "milestone",
      nameField: "name",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): MilestoneBase {
    return rowToMilestone(row);
  }

  // Filename may not match frontmatter id — try direct lookup, then full scan.
  override async findById(id: string): Promise<MilestoneBase | null> {
    const direct = await super.findById(id);
    if (direct) return direct;
    const all = await this.findAll();
    return all.find((item) => item.id === id) ?? null;
  }

  override async findByName(name: string): Promise<MilestoneBase | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${MILESTONE_TABLE}" WHERE name = ?`,
          [name],
        );
        if (row) return this.rowToEntity(row);
      } catch (err) {
        log.warn("[cache] milestone read failed, falling back to disk:", err);
      }
    }
    const all = await this.findAllFromDisk();
    return all.find((m) => m.name === name) ?? null;
  }

  // Special case: status change triggers completedAt.
  override async update(
    id: string,
    data: UpdateMilestone,
  ): Promise<MilestoneBase | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = mergeFields(
      { ...existing },
      data as Record<string, unknown>,
    );

    if (data.status !== undefined) {
      if (data.status === "completed" && existing.status !== "completed") {
        updated.completedAt = new Date().toISOString();
      } else if (data.status === "open") {
        updated.completedAt = undefined;
      }
    }

    const fm = mapKeysToFm(
      buildFrontmatter(
        updated as Record<string, unknown>,
        MILESTONE_BODY_KEYS,
      ),
    );
    const body = `# ${updated.name}\n\n${updated.description ?? ""}`.trimEnd();
    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, serializeFrontmatter(fm, body)),
    );

    return updated as MilestoneBase;
  }

  // ---------------------------------------------------------------------------
  // Parse / Serialize
  // ---------------------------------------------------------------------------

  protected fromCreateInput(
    data: CreateMilestone,
    id: string,
    now: string,
  ): MilestoneBase {
    return {
      id,
      name: data.name,
      status: data.status ?? "open",
      target: data.target,
      description: data.description,
      project: data.project,
      createdAt: now,
    };
  }

  protected parse(
    _filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): MilestoneBase | null {
    if (!fm.id) return null;

    const titleMatch = body.match(/^#\s+(.+)/m);
    const name = titleMatch?.[1]?.trim() ?? String(fm.id);

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
      completedAt: fm.completed_at != null
        ? String(fm.completed_at)
        : undefined,
      createdAt: fm.created_at != null ? String(fm.created_at) : undefined,
      updatedAt: fm.updated_at != null ? String(fm.updated_at) : undefined,
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  protected serialize(item: MilestoneBase): string {
    const fm = mapKeysToFm(
      buildFrontmatter(
        item as unknown as Record<string, unknown>,
        MILESTONE_BODY_KEYS,
      ),
    );
    const body = `# ${item.name}\n\n${item.description ?? ""}`.trimEnd();
    return serializeFrontmatter(fm, body);
  }
}
