// Milestone cache table name and schema constants.

export const MILESTONE_TABLE = "milestones";

export const MILESTONE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${MILESTONE_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT,
  target TEXT,
  description TEXT,
  project TEXT,
  completed_at TEXT,
  created_at TEXT,
  synced_at TEXT
)`;
