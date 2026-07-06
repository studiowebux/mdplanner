// Meeting entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditFieldsFromRow,
  auditVals,
  jsonVal,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { MeetingRepository } from "../../repositories/meeting.repository.ts";
import type { Meeting, MeetingAction } from "../../types/meeting.types.ts";

export const MEETING_TABLE = "meetings";

/** Deserialize a SQLite row to a Meeting. */
export function rowToMeeting(
  row: Record<string, string | number | null>,
): Meeting {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? new Date().toISOString().split("T")[0],
    attendees: parseJson<string[]>(row.attendees_json) ?? [],
    agenda: row.agenda as string | undefined,
    notes: row.notes as string | undefined,
    actions: parseJson<MeetingAction[]>(row.actions_json) ?? [],
    project: row.project as string | undefined,
    relatedMeetings: parseJson<string[]>(row.related_meetings_json) ?? [],
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
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
  project TEXT,
  related_meetings_json TEXT,
  search_text TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertMeetingRow(
  db: CacheDatabase,
  m: Meeting,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${MEETING_TABLE} (id, title, date,
       attendees_json, agenda, notes, actions_json, project,
       related_meetings_json, search_text,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(m.id),
      val(m.title),
      val(m.date),
      jsonVal(m.attendees ?? []),
      val(m.agenda),
      val(m.notes),
      jsonVal(m.actions),
      val(m.project),
      jsonVal(m.relatedMeetings ?? []),
      meetingToText(m),
      ...archiveVals(m),
      ...auditVals(m),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the meeting cache entity. Call from initServices(). */
export function registerMeetingEntity(repo: MeetingRepository): void {
  registerEntityCache({
    table: MEETING_TABLE,
    schema: MEETING_SCHEMA,
    migrations: [
      `ALTER TABLE ${MEETING_TABLE} ADD COLUMN project TEXT`,
      `ALTER TABLE ${MEETING_TABLE} ADD COLUMN related_meetings_json TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_meetings_project ON ${MEETING_TABLE} (project)`,
      `CREATE INDEX IF NOT EXISTS idx_meetings_date ON ${MEETING_TABLE} (date)`,
      ...archiveMigrations(MEETING_TABLE),
    ],
    fts: {
      type: "meeting",
      columns: ["id", "title", "search_text"],
      titleCol: "title",
      contentCol: "search_text",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertMeetingRow,
  });
}
