// Milestone domain constants.

import {
  ARCHIVE_COLS_DDL,
  archiveMigrations,
} from "../../database/sqlite/mod.ts";

/** Keys stored in the markdown body, not in frontmatter. */
export const MILESTONE_BODY_KEYS = ["name", "description"] as const;

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
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  links TEXT,
  ${ARCHIVE_COLS_DDL},
  synced_at TEXT
)`;

export const MILESTONE_MIGRATIONS = [
  `ALTER TABLE ${MILESTONE_TABLE} ADD COLUMN links TEXT`,
  ...archiveMigrations(MILESTONE_TABLE),
];
