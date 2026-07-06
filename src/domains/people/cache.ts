// People entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  auditCols,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { PeopleRepository } from "../../repositories/people.repository.ts";
import type { Person } from "../../types/person.types.ts";
import { PEOPLE_SCHEMA, PEOPLE_TABLE } from "./constants.ts";

// Nullable [column, Person key] string mappings, copied verbatim. Enum-typed
// columns (agent_type/status) widen through the Record cast at runtime — the
// stored value is whatever the DB holds, identical to the prior `as` casts.
const PERSON_STR_COLS: readonly (readonly [string, keyof Person])[] = [
  ["title", "title"],
  ["role", "role"],
  ["reports_to", "reportsTo"],
  ["email", "email"],
  ["phone", "phone"],
  ["start_date", "startDate"],
  ["notes", "notes"],
  ["agent_type", "agentType"],
  ["system_prompt", "systemPrompt"],
  ["status", "status"],
  ["last_seen", "lastSeen"],
  ["current_task_id", "currentTaskId"],
  ["created_at", "createdAt"],
  ["updated_at", "updatedAt"],
  ["created_by", "createdBy"],
  ["updated_by", "updatedBy"],
];

/** Deserialize a SQLite row to a Person. */
export function rowToPerson(
  row: Record<string, string | number | null>,
): Person {
  const person: Person = {
    id: row.id as string,
    name: row.name as string,
  };
  applyPersonScalars(person, row);
  applyPersonJson(person, row);
  const archive = archiveFieldsFromRow(row);
  if (archive.archived !== undefined) person.archived = archive.archived;
  if (archive.archivedAt !== undefined) person.archivedAt = archive.archivedAt;
  if (archive.archivedBy !== undefined) person.archivedBy = archive.archivedBy;
  return person;
}

/** Copy the nullable scalar columns (string/number) onto the person. */
function applyPersonScalars(
  person: Person,
  row: Record<string, string | number | null>,
): void {
  const p = person as Record<string, unknown>;
  for (const [col, key] of PERSON_STR_COLS) {
    if (row[col] != null) p[key] = row[col] as string;
  }
  if (row.hours_per_day != null) {
    person.hoursPerDay = row.hours_per_day as number;
  }
}

/** Parse and assign the JSON-encoded columns onto the person. */
function applyPersonJson(
  person: Person,
  row: Record<string, string | number | null>,
): void {
  const depts = parseJson<string[]>(row.departments);
  if (depts) person.departments = depts;
  const wd = parseJson<string[]>(row.working_days);
  if (wd) person.workingDays = wd as Person["workingDays"];
  const skills = parseJson<string[]>(row.skills);
  if (skills) person.skills = skills;
  const models = parseJson<Person["models"]>(row.models);
  if (models) person.models = models;
  const accounts = parseJson<Record<string, string>>(row.accounts);
  if (accounts) person.accounts = accounts;
  const preferences = parseJson<Person["preferences"]>(row.preferences);
  if (preferences) person.preferences = preferences;
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
       status, last_seen, current_task_id, accounts, preferences,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      json(p.accounts),
      json(p.preferences),
      ...archiveVals(p),
      ...auditVals(p),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the people cache entity. Call from initServices(). */
export function registerPeopleEntity(repo: PeopleRepository): void {
  registerEntityCache({
    table: PEOPLE_TABLE,
    schema: PEOPLE_SCHEMA,
    migrations: [
      "ALTER TABLE people ADD COLUMN reports_to TEXT",
      "ALTER TABLE people ADD COLUMN accounts TEXT",
      "ALTER TABLE people ADD COLUMN preferences TEXT",
      ...archiveMigrations(PEOPLE_TABLE),
    ],
    fts: {
      type: "person",
      columns: ["id", "name", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertPersonRow,
  });
}
