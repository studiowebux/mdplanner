// Eisenhower Matrix repository — markdown file CRUD under eisenhower/.
// Quadrant arrays stored as frontmatter fields (not body sections).

import type {
  CreateEisenhower,
  Eisenhower,
  UpdateEisenhower,
} from "../types/eisenhower.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  EISENHOWER_TABLE,
  rowToEisenhower,
} from "../domains/eisenhower/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
export class EisenhowerRepository extends CachedMarkdownRepository<
  Eisenhower,
  CreateEisenhower,
  UpdateEisenhower
> {
  protected readonly tableName = EISENHOWER_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "eisenhower",
      idPrefix: "eisenhower",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): Eisenhower {
    return rowToEisenhower(row);
  }

  protected fromCreateInput(
    data: CreateEisenhower,
    id: string,
    now: string,
  ): Eisenhower {
    return {
      ...data,
      id,
      date: data.date ?? new Date().toISOString().split("T")[0],
      urgentImportant: data.urgentImportant ?? [],
      notUrgentImportant: data.notUrgentImportant ?? [],
      urgentNotImportant: data.urgentNotImportant ?? [],
      notUrgentNotImportant: data.notUrgentNotImportant ?? [],
      ...stampAuditFields(now),
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter only (arrays stored as YAML lists)
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Eisenhower | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const headingMatch = body.match(/^#\s+(.+)$/m);
    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1].trim()
      : "";

    const toStringArray = (v: unknown): string[] =>
      Array.isArray(v) ? (v as unknown[]).map(String) : [];

    return {
      id,
      title: title || "Untitled Eisenhower",
      date: fm.date ? String(fm.date) : new Date().toISOString().split("T")[0],
      urgentImportant: toStringArray(fm.urgentImportant),
      notUrgentImportant: toStringArray(fm.notUrgentImportant),
      urgentNotImportant: toStringArray(fm.urgentNotImportant),
      notUrgentNotImportant: toStringArray(fm.notUrgentNotImportant),
      project: fm.project != null ? String(fm.project) : undefined,
      notes: fm.notes != null ? String(fm.notes) : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — all fields in frontmatter, title heading in body
  // serializeStandard(item, [], body) runs mapKeysToFm (camelCase→snake_case)
  // and serializeFrontmatter — audit fields included automatically.
  // ---------------------------------------------------------------------------

  protected serialize(item: Eisenhower): string {
    return this.serializeStandard(item, [], `# ${item.title}`);
  }
}
