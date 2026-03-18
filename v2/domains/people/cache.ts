// People entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, json, parseJson, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { PeopleRepository } from "../../repositories/people.repository.ts";
import type { Person } from "../../types/person.types.ts";
import { PEOPLE_SCHEMA, PEOPLE_TABLE } from "./constants.cache.ts";

/** Deserialize a SQLite row to a Person. */
export function rowToPerson(row: Record<string, unknown>): Person {
  const person: Person = {
    id: row.id as string,
    name: row.name as string,
  };
  if (row.title != null) person.title = row.title as string;
  if (row.role != null) person.role = row.role as string;
  const depts = parseJson<string[]>(row.departments);
  if (depts) person.departments = depts;
  if (row.reports_to != null) person.reportsTo = row.reports_to as string;
  if (row.email != null) person.email = row.email as string;
  if (row.phone != null) person.phone = row.phone as string;
  if (row.start_date != null) person.startDate = row.start_date as string;
  if (row.hours_per_day != null) person.hoursPerDay = row.hours_per_day as number;
  const wd = parseJson<string[]>(row.working_days);
  if (wd) person.workingDays = wd as Person["workingDays"];
  if (row.notes != null) person.notes = row.notes as string;
  if (row.agent_type != null) {
    person.agentType = row.agent_type as Person["agentType"];
  }
  const skills = parseJson<string[]>(row.skills);
  if (skills) person.skills = skills;
  const models = parseJson<Person["models"]>(row.models);
  if (models) person.models = models;
  if (row.system_prompt != null) {
    person.systemPrompt = row.system_prompt as string;
  }
  if (row.status != null) person.status = row.status as Person["status"];
  if (row.last_seen != null) person.lastSeen = row.last_seen as string;
  if (row.current_task_id != null) {
    person.currentTaskId = row.current_task_id as string;
  }
  return person;
}

/** Insert or replace a Person in the cache table. */
export function insertPersonRow(
  db: CacheDatabase,
  p: Person,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${PEOPLE_TABLE} (id, name, title, role,
       departments, reports_to, email, phone, start_date, hours_per_day,
       working_days, notes, agent_type, skills, models, system_prompt,
       status, last_seen, current_task_id, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(p.id),
      val(p.name),
      val(p.title),
      val(p.role),
      json(p.departments),
      val(p.reportsTo),
      val(p.email),
      val(p.phone),
      val(p.startDate),
      p.hoursPerDay ?? null,
      json(p.workingDays),
      val(p.notes),
      val(p.agentType),
      json(p.skills),
      json(p.models),
      val(p.systemPrompt),
      val(p.status),
      val(p.lastSeen),
      val(p.currentTaskId),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the people cache entity. Call from initServices(). */
export function registerPeopleEntity(repo: PeopleRepository): void {
  const entity: EntityDef = {
    table: PEOPLE_TABLE,
    schema: PEOPLE_SCHEMA,
    fts: {
      type: "person",
      columns: ["id", "name", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const people = await repo.findAllFromDisk();
      for (const p of people) insertPersonRow(db, p, syncedAt);
      return people.length;
    },
  };
  ENTITIES.push(entity);
}
