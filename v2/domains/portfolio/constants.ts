// Portfolio cache table name and schema constants.

export const PORTFOLIO_TABLE = "portfolio";

export const PORTFOLIO_SCHEMA = `CREATE TABLE IF NOT EXISTS ${PORTFOLIO_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  client TEXT,
  revenue REAL,
  expenses REAL,
  progress INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  team TEXT,
  tech_stack TEXT,
  logo TEXT,
  license TEXT,
  github_repo TEXT,
  billing_customer_id TEXT,
  brain_managed INTEGER,
  linked_goals TEXT,
  kpis TEXT,
  urls TEXT,
  status_updates TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;
