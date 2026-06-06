// Milestone repository — reads and writes milestone markdown files from disk or SQLite cache.

import { log } from "../singletons/logger.ts";
import { serializeFrontmatter } from "../utils/frontmatter.ts";
import { buildFrontmatter } from "../utils/repo-helpers.ts";
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
import type { QueryResult } from "../database/sqlite/mod.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";

/** Persists Milestone entities as markdown with a SQLite cache mirror. */
export class MilestoneRepository extends CachedMarkdownRepository<
  MilestoneBase,
  CreateMilestone,
  UpdateMilestone
> {
  protected readonly tableName = MILESTONE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "milestones",
      idPrefix: "milestone",
      nameField: "name",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): MilestoneBase {
    return rowToMilestone(row);
  }

  override async findByName(name: string): Promise<MilestoneBase | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<QueryResult>(
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

  // Special case: status change triggers completedAt. All file I/O delegated
  // to super.update() so orphan cleanup is handled in one place.
  override async update(
    id: string,
    data: UpdateMilestone,
  ): Promise<MilestoneBase | null> {
    if (data.status === undefined) return super.update(id, data);

    const existing = await this.findById(id);
    if (!existing) return null;

    const extra: Record<string, unknown> = {};
    if (data.status === "completed" && existing.status !== "completed") {
      extra.completedAt = new Date().toISOString();
    } else if (data.status === "open") {
      extra.completedAt = null; // null → mergeFields clears the field
    }

    return super.update(id, { ...data, ...extra } as UpdateMilestone);
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
      links: data.links,
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
      completedAt: fm.completedAt != null ? String(fm.completedAt) : undefined,
      createdAt: fm.createdAt != null ? String(fm.createdAt) : undefined,
      updatedAt: fm.updatedAt != null ? String(fm.updatedAt) : undefined,
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
      links: Array.isArray(fm.links)
        ? fm.links.map(String).filter(Boolean)
        : undefined,
    };
  }

  protected serialize(item: MilestoneBase): string {
    const fm = mapKeysToFm(
      buildFrontmatter(item, MILESTONE_BODY_KEYS),
    );
    // Preserve archive fields — custom serializers must round-trip these.
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;
    const body = `# ${item.name}\n\n${item.description ?? ""}`.trimEnd();
    return serializeFrontmatter(fm, body);
  }
}
