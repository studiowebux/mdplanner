// Habit repository — markdown file CRUD under habits/.
// completedDates stored as JSON array in frontmatter.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CompletionEntry,
  CreateHabit,
  Habit,
  UpdateHabit,
} from "../types/habit.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { HABIT_TABLE, rowToHabit } from "../domains/habit/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Habit entities as markdown with a SQLite cache mirror; per-user completions live in the body. */
export class HabitRepository extends CachedMarkdownRepository<
  Habit,
  CreateHabit,
  UpdateHabit
> {
  protected readonly tableName = HABIT_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "habits",
      idPrefix: "habit",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Habit {
    return rowToHabit(row);
  }

  protected fromCreateInput(data: CreateHabit, id: string, now: string): Habit {
    return {
      ...data,
      id,
      frequency: data.frequency ?? "daily",
      targetPerPeriod: data.targetPerPeriod ?? 1,
      completedDates: data.completedDates ?? [],
      tags: data.tags ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Habit | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const lines = body.split("\n");
    let title = fm.title ? String(fm.title) : fm.name ? String(fm.name) : "";
    const descLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("# ")) {
        if (!title) title = line.slice(2).trim();
        continue;
      }
      descLines.push(line);
    }

    const description = descLines.join("\n").trim() || undefined;

    // mapKeysFromFm has already converted snake_case → camelCase
    const rawDates: unknown[] = Array.isArray(fm.completedDates)
      ? fm.completedDates
      : typeof fm.completedDates === "string"
      ? JSON.parse(fm.completedDates)
      : [];
    const completedDates: CompletionEntry[] = rawDates.map((entry) =>
      typeof entry === "string" ? { date: entry } : {
        date: String((entry as Record<string, unknown>).date ?? ""),
        note: (entry as Record<string, unknown>).note as string | undefined,
        userId: (entry as Record<string, unknown>).userId as string | undefined,
      }
    );

    return {
      id,
      title: title || "Untitled Habit",
      description,
      frequency: (fm.frequency as Habit["frequency"]) ?? "daily",
      targetPerPeriod: fm.targetPerPeriod != null
        ? Number(fm.targetPerPeriod)
        : 1,
      unit: fm.unit != null ? String(fm.unit) : undefined,
      completedDates,
      color: fm.color != null ? String(fm.color) : undefined,
      tags: Array.isArray(fm.tags)
        ? fm.tags.map(String)
        : fm.tags != null
        ? [String(fm.tags)]
        : [],
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: Habit): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.title = item.title;
    fm.frequency = item.frequency;
    fm.target_per_period = item.targetPerPeriod;
    if (item.unit) fm.unit = item.unit;
    fm.completed_dates = item.completedDates;
    if (item.color) fm.color = item.color;
    if (item.tags && item.tags.length > 0) fm.tags = item.tags;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;

    // Preserve archive fields — custom serializers must round-trip these.
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    const body = item.description ? item.description : "";
    return serializeFrontmatter(fm, body);
  }
}
