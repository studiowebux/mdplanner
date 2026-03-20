// Task domain constants.

/** Keys stored in the markdown body, not in frontmatter. */
export const TASK_BODY_KEYS = ["title", "section", "children", "description"] as const;

export const TASK_TABLE = "tasks";

export const TASK_SCHEMA = `CREATE TABLE IF NOT EXISTS ${TASK_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  revision INTEGER DEFAULT 1,
  section TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  tags TEXT,
  due_date TEXT,
  assignee TEXT,
  priority INTEGER,
  effort INTEGER,
  blocked_by TEXT,
  milestone TEXT,
  planned_start TEXT,
  planned_end TEXT,
  time_entries TEXT,
  sort_order INTEGER,
  attachments TEXT,
  project TEXT,
  github_issue INTEGER,
  github_repo TEXT,
  github_pr INTEGER,
  comments TEXT,
  claimed_by TEXT,
  claimed_at TEXT,
  approval_request TEXT,
  files TEXT,
  synced_at TEXT
)`;
