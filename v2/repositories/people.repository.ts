// People repository — reads and writes person markdown files from disk or SQLite cache.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import {
  buildFrontmatter,
  findFileById,
  mergeFields,
} from "../utils/repo-helpers.ts";
import { mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import type {
  CreatePerson,
  Person,
  UpdatePerson,
} from "../types/person.types.ts";
import { ciEquals } from "../utils/string.ts";
import { AgentModelSchema } from "../types/person.types.ts";
import { WEEKDAYS } from "../constants/mod.ts";
import type { CacheDatabase } from "../database/sqlite/mod.ts";
import { rowToPerson } from "../domains/people/cache.ts";
import { PEOPLE_BODY_KEYS, PEOPLE_TABLE } from "../domains/people/constants.ts";

export class PeopleRepository {
  private dir: string;
  private writer = new SafeWriter();
  private cacheDb: CacheDatabase | null = null;

  constructor(projectDir: string) {
    this.dir = join(projectDir, "people");
  }

  setCacheDb(db: CacheDatabase): void {
    this.cacheDb = db;
  }

  async findAll(): Promise<Person[]> {
    if (this.cacheDb) {
      try {
        const count = this.cacheDb.count(PEOPLE_TABLE);
        if (count > 0) {
          return this.cacheDb.query<Record<string, unknown>>(
            `SELECT * FROM "${PEOPLE_TABLE}"`,
          ).map(rowToPerson);
        }
      } catch { /* fall through to disk */ }
    }
    return this.findAllFromDisk();
  }

  /** Always read from disk — used by cache sync. */
  async findAllFromDisk(): Promise<Person[]> {
    const people: Person[] = [];
    try {
      for await (const entry of Deno.readDir(this.dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(join(this.dir, entry.name));
        const person = this.parse(content);
        if (person) people.push(person);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return people;
  }

  async findById(id: string): Promise<Person | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${PEOPLE_TABLE}" WHERE id = ?`,
          [id],
        );
        if (row) return rowToPerson(row);
      } catch { /* fall through to disk */ }
    }
    const { entity } = await findFileById(this.dir, (c) => this.parse(c), id);
    return entity;
  }

  async findByName(name: string): Promise<Person | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${PEOPLE_TABLE}" WHERE LOWER(name) = LOWER(?)`,
          [name],
        );
        if (row) return rowToPerson(row);
      } catch { /* fall through to disk */ }
    }
    const all = await this.findAllFromDisk();
    return all.find((p) => ciEquals(p.name, name)) ?? null;
  }

  async create(data: CreatePerson): Promise<Person> {
    await Deno.mkdir(this.dir, { recursive: true });
    const id = generateId("person");

    const { name, notes, ...rest } = data;
    const fm = mapKeysToFm({
      id,
      ...buildFrontmatter(rest as Record<string, unknown>, []),
    });

    const body = `# ${name}\n\n${notes ?? ""}`.trimEnd();
    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, serializeFrontmatter(fm, body)),
    );

    return { id, name, ...rest } as Person;
  }

  async update(id: string, data: UpdatePerson): Promise<Person | null> {
    const { file, entity: person } = await findFileById(
      this.dir,
      (c) => this.parse(c),
      id,
    );
    if (!file || !person) return null;

    const updated = mergeFields(
      { ...person },
      data as Record<string, unknown>,
    );

    const fm = mapKeysToFm(
      buildFrontmatter(updated as Record<string, unknown>, PEOPLE_BODY_KEYS),
    );
    const body = `# ${updated.name}\n\n${updated.notes ?? ""}`.trimEnd();
    await this.writer.write(
      id,
      () => atomicWrite(file, serializeFrontmatter(fm, body)),
    );

    return updated as Person;
  }

  async delete(id: string): Promise<boolean> {
    const { file } = await findFileById(this.dir, (c) => this.parse(c), id);
    if (!file) return false;
    await Deno.remove(file);
    return true;
  }

  private parse(content: string): Person | null {
    const { frontmatter: fm, body } = parseFrontmatter(content);
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
