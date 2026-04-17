// People domain constants.

/** Keys stored in the markdown body, not in frontmatter. */
export const PEOPLE_BODY_KEYS = ["name", "notes"] as const;

export const PEOPLE_TABLE = "people";

export const PEOPLE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${PEOPLE_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  role TEXT,
  departments TEXT,
  reports_to TEXT,
  email TEXT,
  phone TEXT,
  start_date TEXT,
  hours_per_day REAL,
  working_days TEXT,
  notes TEXT,
  agent_type TEXT,
  skills TEXT,
  models TEXT,
  system_prompt TEXT,
  status TEXT,
  last_seen TEXT,
  current_task_id TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;
