// People repository — reads and writes person markdown files from disk or SQLite cache.

import { join } from "@std/path";
import { log } from "../singletons/logger.ts";
import { serializeFrontmatter } from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite } from "../utils/safe-io.ts";
import { buildFrontmatter } from "../utils/repo-helpers.ts";
import { mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import type {
  CreatePerson,
  Person,
  UpdatePerson,
} from "../types/person.types.ts";
import {
  AgentModelSchema,
  PersonPreferencesSchema,
} from "../types/person.types.ts";
import { WEEKDAYS } from "../constants/mod.ts";
import { rowToPerson } from "../domains/people/cache.ts";
import { PEOPLE_BODY_KEYS, PEOPLE_TABLE } from "../domains/people/constants.ts";
import type { QueryResult } from "../database/sqlite/mod.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";

/**
 * Frontmatter keys copied verbatim into a Person as `String(value)` when
 * present. Kept as a typed list so `parse` collapses to one loop instead of a
 * per-field conditional chain. fm keys are already camelCase (mapKeysFromFm).
 */
const STRING_FM_FIELDS = [
  "title",
  "role",
  "reportsTo",
  "email",
  "phone",
  "startDate",
  "systemPrompt",
  "lastSeen",
  "currentTaskId",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
] as const satisfies readonly (keyof Person)[];

/** Persists Person entities as markdown with a SQLite cache mirror. */
export class PeopleRepository extends CachedMarkdownRepository<
  Person,
  CreatePerson,
  UpdatePerson
> {
  protected readonly tableName = PEOPLE_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "people",
      idPrefix: "person",
      nameField: "name",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Person {
    return rowToPerson(row);
  }

  override async findByName(name: string): Promise<Person | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<QueryResult>(
          `SELECT * FROM "${PEOPLE_TABLE}" WHERE LOWER(name) = LOWER(?)`,
          [name],
        );
        if (row) return this.rowToEntity(row);
      } catch (err) {
        log.warn("[cache] people read failed, falling back to disk:", err);
      }
    }
    const all = await this.findAllFromDisk();
    const lower = name.toLowerCase();
    return all.find((p) => p.name.toLowerCase() === lower) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Parse / Serialize
  // ---------------------------------------------------------------------------

  protected fromCreateInput(
    data: CreatePerson,
    id: string,
    _now: string,
  ): Person {
    const { name, notes, ...rest } = data;
    return { id, name, ...rest, ...(notes ? { notes } : {}) } as Person;
  }

  // Custom create: milestone-style body (# Name + notes), fm via buildFrontmatter.
  override async create(data: CreatePerson): Promise<Person> {
    await Deno.mkdir(this.dir, { recursive: true });
    const id = generateId(this.config.idPrefix);
    const { name, notes, ...rest } = data;
    const fm = mapKeysToFm({
      id,
      ...buildFrontmatter(rest as Record<string, unknown>, []),
    });

    const body = `# ${name}\n\n${notes ?? ""}`.trimEnd();
    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () =>
        atomicWrite(
          filePath,
          serializeFrontmatter(fm, body),
        ),
    );

    return { id, name, ...rest } as Person;
  }

  protected parse(
    _filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Person | null {
    if (!fm.id) return null;

    const titleMatch = body.match(/^#\s+(.+)/m);
    const name = titleMatch?.[1]?.trim() ?? "Unnamed Person";

    const lines = body.split("\n");
    const titleIdx = lines.findIndex((l) => /^#\s+/.test(l));
    const notes = titleIdx >= 0
      ? lines.slice(titleIdx + 1).join("\n").trim()
      : undefined;

    const person: Person = {
      id: String(fm.id),
      name,
    };
    // Note: fm keys are already camelCase (mapKeysFromFm applied by base repo).
    this.applyScalarFm(person, fm);
    this.applyArrayFm(person, fm);
    this.applyEnumFm(person, fm);
    this.applyStructuredFm(person, fm);
    if (notes) person.notes = notes;

    return person;
  }

  /** Verbatim string fields + the lone numeric field. */
  private applyScalarFm(person: Person, fm: Record<string, unknown>): void {
    for (const key of STRING_FM_FIELDS) {
      const v = fm[key];
      if (v != null) person[key] = String(v);
    }
    if (typeof fm.hoursPerDay === "number") {
      person.hoursPerDay = fm.hoursPerDay;
    }
  }

  /** List-valued fields, normalized via toStringArray. */
  private applyArrayFm(person: Person, fm: Record<string, unknown>): void {
    const depts = this.toStringArray(fm.departments);
    if (depts) person.departments = depts;
    const wd = this.toStringArray(fm.workingDays);
    if (wd) {
      person.workingDays = wd.filter(
        (d): d is typeof WEEKDAYS[number] =>
          (WEEKDAYS as readonly string[]).includes(d),
      );
    }
    const skills = this.toStringArray(fm.skills);
    if (skills) person.skills = skills;
  }

  /** Enum-constrained fields — assigned only on a valid literal. */
  private applyEnumFm(person: Person, fm: Record<string, unknown>): void {
    if (
      fm.agentType === "human" || fm.agentType === "ai" ||
      fm.agentType === "hybrid"
    ) {
      person.agentType = fm.agentType;
    }
    if (
      fm.status === "idle" || fm.status === "working" ||
      fm.status === "offline"
    ) {
      person.status = fm.status;
    }
  }

  /** Schema-validated / object-shaped fields: models, accounts, preferences. */
  private applyStructuredFm(person: Person, fm: Record<string, unknown>): void {
    if (Array.isArray(fm.models)) {
      const parsed = AgentModelSchema.array().safeParse(fm.models);
      if (parsed.success && parsed.data.length > 0) {
        person.models = parsed.data;
      }
    }
    if (
      fm.accounts != null && typeof fm.accounts === "object" &&
      !Array.isArray(fm.accounts)
    ) {
      const acc: Record<string, string> = {};
      for (
        const [k, v] of Object.entries(fm.accounts as Record<string, unknown>)
      ) {
        if (v != null) acc[k] = String(v);
      }
      if (Object.keys(acc).length > 0) person.accounts = acc;
    }
    if (
      fm.preferences != null && typeof fm.preferences === "object" &&
      !Array.isArray(fm.preferences)
    ) {
      const parsed = PersonPreferencesSchema.safeParse(fm.preferences);
      if (parsed.success && parsed.data != null) {
        person.preferences = parsed.data;
      }
    }
  }

  protected serialize(item: Person): string {
    const fm = mapKeysToFm(
      buildFrontmatter(item, PEOPLE_BODY_KEYS),
    );
    const body = `# ${item.name}\n\n${item.notes ?? ""}`.trimEnd();
    return serializeFrontmatter(fm, body);
  }

  /** Normalize a YAML value to string[] — handles both scalars and arrays. */
  private toStringArray(v: unknown): string[] | undefined {
    if (Array.isArray(v)) {
      const arr = v.map(String).filter(Boolean);
      return arr.length > 0 ? arr : undefined;
    }
    if (v != null && String(v)) return [String(v)];
    return undefined;
  }
}
