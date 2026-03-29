// Milestone domain constants.

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
  synced_at TEXT
)`;
