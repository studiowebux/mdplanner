// Meeting entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  jsonVal,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { MeetingRepository } from "../../repositories/meeting.repository.ts";
import type { Meeting, MeetingAction } from "../../types/meeting.types.ts";

export const MEETING_TABLE = "meetings";

/** Deserialize a SQLite row to a Meeting. */
export function rowToMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? new Date().toISOString().split("T")[0],
    attendees: parseJson<string[]>(row.attendees_json) ?? [],
    agenda: row.agenda as string | undefined,
    notes: row.notes as string | undefined,
    actions: parseJson<MeetingAction[]>(row.actions_json) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

/** Flatten searchable text fields for FTS. */
function meetingToText(m: Meeting): string {
  return [
    m.agenda ?? "",
    m.notes ?? "",
    (m.attendees ?? []).join(" "),
    m.actions.map((a) => a.description).join(" "),
  ].join(" ");
}

const MEETING_SCHEMA = `CREATE TABLE IF NOT EXISTS ${MEETING_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  attendees_json TEXT,
  agenda TEXT,
  notes TEXT,
  actions_json TEXT,
  search_text TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertMeetingRow(
  db: CacheDatabase,
  m: Meeting,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${MEETING_TABLE} (id, title, date,
       attendees_json, agenda, notes, actions_json, search_text,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(m.id),
      val(m.title),
      val(m.date),
      jsonVal(m.attendees ?? []),
      val(m.agenda),
      val(m.notes),
      jsonVal(m.actions),
      meetingToText(m),
      ...auditVals(m),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the meeting cache entity. Call from initServices(). */
export function registerMeetingEntity(repo: MeetingRepository): void {
  const entity: EntityDef = {
    table: MEETING_TABLE,
    schema: MEETING_SCHEMA,
    fts: {
      type: "meeting",
      columns: ["id", "title", "search_text"],
      titleCol: "title",
      contentCol: "search_text",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const m of items) insertMeetingRow(db, m, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
