// People repository — reads and writes person markdown files from disk or SQLite cache.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import type {
  CreatePerson,
  Person,
  UpdatePerson,
} from "../types/person.types.ts";
import { AgentModelSchema } from "../types/person.types.ts";
import { WEEKDAYS } from "../constants/mod.ts";
import type { CacheDatabase } from "../database/sqlite/mod.ts";
import { rowToPerson } from "../domains/people/cache.ts";
import { PEOPLE_TABLE } from "../domains/people/constants.cache.ts";

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
    const { person } = await this.findFileById(id);
    return person;
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
    const lower = name.toLowerCase();
    return all.find((p) => p.name.toLowerCase() === lower) ?? null;
  }

  async create(data: CreatePerson): Promise<Person> {
    await Deno.mkdir(this.dir, { recursive: true });
    const id = generateId("person");
    const fm: Record<string, unknown> = { id };

    if (data.title) fm.title = data.title;
    if (data.role) fm.role = data.role;
    if (data.departments?.length) fm.departments = data.departments;
    if (data.reportsTo) fm.reportsTo = data.reportsTo;
    if (data.email) fm.email = data.email;
    if (data.phone) fm.phone = data.phone;
    if (data.startDate) fm.startDate = data.startDate;
    if (data.hoursPerDay != null) fm.hoursPerDay = data.hoursPerDay;
    if (data.workingDays?.length) fm.workingDays = data.workingDays;
    if (data.agentType) fm.agentType = data.agentType;
    if (data.skills?.length) fm.skills = data.skills;
    if (data.models?.length) fm.models = data.models;
    if (data.systemPrompt) fm.systemPrompt = data.systemPrompt;

    const body = `# ${data.name}\n\n${data.notes ?? ""}`.trimEnd();
    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, serializeFrontmatter(fm, body)),
    );

    return { id, name: data.name, ...this.optionals(data) };
  }

  async update(id: string, data: UpdatePerson): Promise<Person | null> {
    const { file, person } = await this.findFileById(id);
    if (!file || !person) return null;

    const updated: Person = { ...person };
    if (data.name !== undefined) updated.name = data.name;
    if (data.title !== undefined) updated.title = data.title ?? undefined;
    if (data.role !== undefined) updated.role = data.role ?? undefined;
    if (data.departments !== undefined) {
      updated.departments = data.departments ?? undefined;
    }
    if (data.reportsTo !== undefined) {
      updated.reportsTo = data.reportsTo ?? undefined;
    }
    if (data.email !== undefined) updated.email = data.email ?? undefined;
    if (data.phone !== undefined) updated.phone = data.phone ?? undefined;
    if (data.startDate !== undefined) {
      updated.startDate = data.startDate ?? undefined;
    }
    if (data.hoursPerDay !== undefined) {
      updated.hoursPerDay = data.hoursPerDay ?? undefined;
    }
    if (data.workingDays !== undefined) {
      updated.workingDays = data.workingDays ?? undefined;
    }
    if (data.notes !== undefined) updated.notes = data.notes ?? undefined;
    if (data.agentType !== undefined) {
      updated.agentType = data.agentType ?? undefined;
    }
    if (data.skills !== undefined) updated.skills = data.skills ?? undefined;
    if (data.models !== undefined) updated.models = data.models ?? undefined;
    if (data.systemPrompt !== undefined) {
      updated.systemPrompt = data.systemPrompt ?? undefined;
    }
    if (data.status !== undefined) updated.status = data.status ?? undefined;
    if (data.lastSeen !== undefined) {
      updated.lastSeen = data.lastSeen ?? undefined;
    }
    if (data.currentTaskId !== undefined) {
      updated.currentTaskId = data.currentTaskId ?? undefined;
    }

    const fm = this.toFrontmatter(updated);
    const body = `# ${updated.name}\n\n${updated.notes ?? ""}`.trimEnd();
    await this.writer.write(
      id,
      () => atomicWrite(file, serializeFrontmatter(fm, body)),
    );

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { file } = await this.findFileById(id);
    if (!file) return false;
    await Deno.remove(file);
    return true;
  }

  private async findFileById(
    id: string,
  ): Promise<{ file: string | null; person: Person | null }> {
    try {
      for await (const entry of Deno.readDir(this.dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const filePath = join(this.dir, entry.name);
        const content = await Deno.readTextFile(filePath);
        const person = this.parse(content);
        if (person?.id === id) return { file: filePath, person };
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return { file: null, person: null };
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
    if (fm.reportsTo != null) person.reportsTo = String(fm.reportsTo);
    if (fm.email != null) person.email = String(fm.email);
    if (fm.phone != null) person.phone = String(fm.phone);
    if (fm.startDate != null) person.startDate = String(fm.startDate);
    if (typeof fm.hoursPerDay === "number") person.hoursPerDay = fm.hoursPerDay;
    const wd = this.toStringArray(fm.workingDays);
    if (wd) {
      person.workingDays = wd.filter(
        (d): d is typeof WEEKDAYS[number] =>
          (WEEKDAYS as readonly string[]).includes(d),
      );
    }
    if (notes) person.notes = notes;
    if (
      fm.agentType === "human" || fm.agentType === "ai" ||
      fm.agentType === "hybrid"
    ) {
      person.agentType = fm.agentType;
    }
    const skills = this.toStringArray(fm.skills);
    if (skills) person.skills = skills;
    if (Array.isArray(fm.models)) {
      const parsed = AgentModelSchema.array().safeParse(fm.models);
      if (parsed.success && parsed.data.length > 0) {
        person.models = parsed.data;
      }
    }
    if (fm.systemPrompt != null) person.systemPrompt = String(fm.systemPrompt);
    if (
      fm.status === "idle" || fm.status === "working" ||
      fm.status === "offline"
    ) {
      person.status = fm.status;
    }
    if (fm.lastSeen != null) person.lastSeen = String(fm.lastSeen);
    if (fm.currentTaskId != null) {
      person.currentTaskId = String(fm.currentTaskId);
    }

    return person;
  }

  private toFrontmatter(p: Person): Record<string, unknown> {
    const fm: Record<string, unknown> = { id: p.id };
    if (p.title) fm.title = p.title;
    if (p.role) fm.role = p.role;
    if (p.departments?.length) fm.departments = p.departments;
    if (p.reportsTo) fm.reportsTo = p.reportsTo;
    if (p.email) fm.email = p.email;
    if (p.phone) fm.phone = p.phone;
    if (p.startDate) fm.startDate = p.startDate;
    if (p.hoursPerDay != null) fm.hoursPerDay = p.hoursPerDay;
    if (p.workingDays?.length) fm.workingDays = p.workingDays;
    if (p.agentType) fm.agentType = p.agentType;
    if (p.skills?.length) fm.skills = p.skills;
    if (p.models?.length) fm.models = p.models;
    if (p.systemPrompt) fm.systemPrompt = p.systemPrompt;
    if (p.status) fm.status = p.status;
    if (p.lastSeen) fm.lastSeen = p.lastSeen;
    if (p.currentTaskId) fm.currentTaskId = p.currentTaskId;
    return fm;
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

  /** Extract optional fields from create data for the return object. */
  private optionals(
    data: CreatePerson,
  ): Omit<Person, "id" | "name"> {
    const p: Omit<Person, "id" | "name"> = {};
    if (data.title) p.title = data.title;
    if (data.role) p.role = data.role;
    if (data.departments?.length) p.departments = data.departments;
    if (data.reportsTo) p.reportsTo = data.reportsTo;
    if (data.email) p.email = data.email;
    if (data.phone) p.phone = data.phone;
    if (data.startDate) p.startDate = data.startDate;
    if (data.hoursPerDay != null) p.hoursPerDay = data.hoursPerDay;
    if (data.workingDays?.length) p.workingDays = data.workingDays;
    if (data.notes) p.notes = data.notes;
    if (data.agentType) p.agentType = data.agentType;
    if (data.skills?.length) p.skills = data.skills;
    if (data.models?.length) p.models = data.models;
    if (data.systemPrompt) p.systemPrompt = data.systemPrompt;
    return p;
  }
}
