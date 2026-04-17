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
import { AgentModelSchema } from "../types/person.types.ts";
import { WEEKDAYS } from "../constants/mod.ts";
import { rowToPerson } from "../domains/people/cache.ts";
import { PEOPLE_BODY_KEYS, PEOPLE_TABLE } from "../domains/people/constants.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";

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

  protected rowToEntity(row: Record<string, unknown>): Person {
    return rowToPerson(row);
  }

  override async findByName(name: string): Promise<Person | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
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
    if (fm.title != null) person.title = String(fm.title);
    if (fm.role != null) person.role = String(fm.role);
    const depts = this.toStringArray(fm.departments);
    if (depts) person.departments = depts;
    if (fm.reports_to != null) person.reportsTo = String(fm.reports_to);
    if (fm.email != null) person.email = String(fm.email);
    if (fm.phone != null) person.phone = String(fm.phone);
    if (fm.start_date != null) person.startDate = String(fm.start_date);
    if (typeof fm.hours_per_day === "number") {
      person.hoursPerDay = fm.hours_per_day;
    }
    const wd = this.toStringArray(fm.working_days);
    if (wd) {
      person.workingDays = wd.filter(
        (d): d is typeof WEEKDAYS[number] =>
          (WEEKDAYS as readonly string[]).includes(d),
      );
    }
    if (notes) person.notes = notes;
    if (
      fm.agent_type === "human" || fm.agent_type === "ai" ||
      fm.agent_type === "hybrid"
    ) {
      person.agentType = fm.agent_type;
    }
    const skills = this.toStringArray(fm.skills);
    if (skills) person.skills = skills;
    if (Array.isArray(fm.models)) {
      const parsed = AgentModelSchema.array().safeParse(fm.models);
      if (parsed.success && parsed.data.length > 0) {
        person.models = parsed.data;
      }
    }
    if (fm.system_prompt != null) {
      person.systemPrompt = String(fm.system_prompt);
    }
    if (
      fm.status === "idle" || fm.status === "working" ||
      fm.status === "offline"
    ) {
      person.status = fm.status;
    }
    if (fm.last_seen != null) person.lastSeen = String(fm.last_seen);
    if (fm.current_task_id != null) {
      person.currentTaskId = String(fm.current_task_id);
    }
    if (fm.created_at != null) person.createdAt = String(fm.created_at);
    if (fm.updated_at != null) person.updatedAt = String(fm.updated_at);
    if (fm.created_by != null) person.createdBy = String(fm.created_by);
    if (fm.updated_by != null) person.updatedBy = String(fm.updated_by);

    return person;
  }

  protected serialize(item: Person): string {
    const fm = mapKeysToFm(
      buildFrontmatter(
        item as unknown as Record<string, unknown>,
        PEOPLE_BODY_KEYS,
      ),
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
