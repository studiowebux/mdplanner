/**
 * SQLite Cache Schema
 * Pattern: Repository pattern - schema definition
 *
 * Defines tables for caching markdown data.
 * Complex nested structures stored as JSON.
 */

import { CacheDatabase } from "./database.ts";

/**
 * Initialize all cache tables.
 */
export function initSchema(db: CacheDatabase): void {
  db.exec(SCHEMA_SQL);
  db.exec(FTS_SQL);
  db.exec(INDEX_SQL);
}

/**
 * Drop all tables (for rebuild).
 */
export function dropSchema(db: CacheDatabase): void {
  db.exec(DROP_SQL);
}

// Core entity tables
const SCHEMA_SQL = `
-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  section TEXT,
  description TEXT,
  tags TEXT,           -- JSON array
  due_date TEXT,
  assignee TEXT,
  priority INTEGER,
  effort INTEGER,
  milestone TEXT,
  blocked_by TEXT,     -- JSON array
  planned_start TEXT,
  planned_end TEXT,
  parent_id TEXT,
  config TEXT,         -- Full config as JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  mode TEXT DEFAULT 'simple',
  paragraphs TEXT,       -- JSON array
  custom_sections TEXT,  -- JSON array
  revision INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  kpi TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target TEXT,
  status TEXT,
  description TEXT
);

-- Ideas
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT,
  category TEXT,
  description TEXT,
  links TEXT,           -- JSON array of linked idea IDs
  created TEXT
);

-- Retrospectives
CREATE TABLE IF NOT EXISTS retrospectives (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  status TEXT,
  continue_items TEXT,  -- JSON array
  stop_items TEXT,      -- JSON array
  start_items TEXT      -- JSON array
);

-- Canvas (Sticky Notes)
CREATE TABLE IF NOT EXISTS sticky_notes (
  id TEXT PRIMARY KEY,
  content TEXT,
  color TEXT,
  position_x REAL,
  position_y REAL,
  width REAL,
  height REAL
);

-- Mindmaps
CREATE TABLE IF NOT EXISTS mindmaps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  nodes TEXT            -- JSON tree structure
);

-- C4 Components
CREATE TABLE IF NOT EXISTS c4_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT,
  type TEXT,
  technology TEXT,
  description TEXT,
  position_x REAL,
  position_y REAL,
  connections TEXT,     -- JSON array
  children TEXT,        -- JSON array of IDs
  parent TEXT
);

-- SWOT Analysis
CREATE TABLE IF NOT EXISTS swot (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  strengths TEXT,       -- JSON array
  weaknesses TEXT,      -- JSON array
  opportunities TEXT,   -- JSON array
  threats TEXT          -- JSON array
);

-- Risk Analysis
CREATE TABLE IF NOT EXISTS risk (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  high_impact_high_prob TEXT,  -- JSON array
  high_impact_low_prob TEXT,   -- JSON array
  low_impact_high_prob TEXT,   -- JSON array
  low_impact_low_prob TEXT     -- JSON array
);

-- Lean Canvas
CREATE TABLE IF NOT EXISTS lean_canvas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  data TEXT             -- Full canvas as JSON
);

-- Business Model Canvas
CREATE TABLE IF NOT EXISTS business_model (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  data TEXT             -- Full canvas as JSON
);

-- Project Value Board
CREATE TABLE IF NOT EXISTS project_value (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  data TEXT             -- Full board as JSON
);

-- Brief
CREATE TABLE IF NOT EXISTS brief (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  data TEXT             -- Full brief as JSON
);

-- Capacity Plans
CREATE TABLE IF NOT EXISTS capacity_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  budget_hours INTEGER,
  team_members TEXT,    -- JSON array
  allocations TEXT      -- JSON array
);

-- Strategic Levels Builders
CREATE TABLE IF NOT EXISTS strategic_builders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  levels TEXT           -- JSON array
);

-- Billing: Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT
);

-- Billing: Rates
CREATE TABLE IF NOT EXISTS rates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  amount REAL,
  currency TEXT,
  description TEXT
);

-- Billing: Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  number TEXT,
  customer_id TEXT,
  status TEXT,
  date TEXT,
  valid_until TEXT,
  line_items TEXT,      -- JSON array
  notes TEXT,
  total REAL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Billing: Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT,
  customer_id TEXT,
  quote_id TEXT,
  status TEXT,
  date TEXT,
  due_date TEXT,
  line_items TEXT,      -- JSON array
  notes TEXT,
  total REAL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (quote_id) REFERENCES quotes(id)
);

-- CRM: Companies
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created TEXT
);

-- CRM: Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT,
  is_primary INTEGER DEFAULT 0,
  notes TEXT,
  created TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- CRM: Deals
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contact_id TEXT,
  title TEXT NOT NULL,
  value REAL,
  stage TEXT,
  probability INTEGER,
  expected_close TEXT,
  closed_at TEXT,
  notes TEXT,
  created TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

-- CRM: Interactions
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contact_id TEXT,
  deal_id TEXT,
  type TEXT,
  summary TEXT,
  date TEXT,
  duration INTEGER,
  next_follow_up TEXT,
  notes TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (deal_id) REFERENCES deals(id)
);

-- Portfolio Items
CREATE TABLE IF NOT EXISTS portfolio (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  status TEXT,
  client TEXT,
  revenue REAL,
  expenses REAL,
  progress INTEGER,
  start_date TEXT,
  end_date TEXT,
  team TEXT,            -- JSON array
  kpis TEXT             -- JSON array
);

-- People (shared registry)
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  role TEXT,
  departments TEXT,  -- JSON array
  reports_to TEXT,
  email TEXT,
  phone TEXT,
  start_date TEXT,
  hours_per_day REAL,
  working_days TEXT,  -- JSON array
  notes TEXT
);

-- Org Chart Members
CREATE TABLE IF NOT EXISTS org_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  departments TEXT,  -- JSON array
  reports_to TEXT,
  email TEXT,
  phone TEXT,
  start_date TEXT,
  notes TEXT
);

-- Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  attendees TEXT,   -- JSON array
  agenda TEXT,
  notes TEXT,       -- markdown body
  actions TEXT,     -- JSON array of MeetingAction
  created TEXT
);

-- Cache metadata
CREATE TABLE IF NOT EXISTS cache_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

// Full-text search tables
const FTS_SQL = `
-- FTS for tasks
CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  id,
  title,
  description,
  content='tasks',
  content_rowid='rowid'
);

-- FTS for notes
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  id,
  title,
  content,
  content='notes',
  content_rowid='rowid'
);

-- FTS for goals
CREATE VIRTUAL TABLE IF NOT EXISTS goals_fts USING fts5(
  id,
  title,
  description,
  content='goals',
  content_rowid='rowid'
);

-- FTS for ideas
CREATE VIRTUAL TABLE IF NOT EXISTS ideas_fts USING fts5(
  id,
  title,
  description,
  content='ideas',
  content_rowid='rowid'
);

-- FTS for meetings
CREATE VIRTUAL TABLE IF NOT EXISTS meetings_fts USING fts5(
  id,
  title,
  notes,
  content='meetings',
  content_rowid='rowid'
);

-- FTS for people
CREATE VIRTUAL TABLE IF NOT EXISTS people_fts USING fts5(
  id,
  name,
  notes,
  content='people',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts(rowid, id, title, description)
  VALUES (new.rowid, new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, id, title, description)
  VALUES ('delete', old.rowid, old.id, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, id, title, description)
  VALUES ('delete', old.rowid, old.id, old.title, old.description);
  INSERT INTO tasks_fts(rowid, id, title, description)
  VALUES (new.rowid, new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, id, title, content)
  VALUES (new.rowid, new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, id, title, content)
  VALUES ('delete', old.rowid, old.id, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, id, title, content)
  VALUES ('delete', old.rowid, old.id, old.title, old.content);
  INSERT INTO notes_fts(rowid, id, title, content)
  VALUES (new.rowid, new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS goals_ai AFTER INSERT ON goals BEGIN
  INSERT INTO goals_fts(rowid, id, title, description)
  VALUES (new.rowid, new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS goals_ad AFTER DELETE ON goals BEGIN
  INSERT INTO goals_fts(goals_fts, rowid, id, title, description)
  VALUES ('delete', old.rowid, old.id, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS goals_au AFTER UPDATE ON goals BEGIN
  INSERT INTO goals_fts(goals_fts, rowid, id, title, description)
  VALUES ('delete', old.rowid, old.id, old.title, old.description);
  INSERT INTO goals_fts(rowid, id, title, description)
  VALUES (new.rowid, new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS ideas_ai AFTER INSERT ON ideas BEGIN
  INSERT INTO ideas_fts(rowid, id, title, description)
  VALUES (new.rowid, new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS ideas_ad AFTER DELETE ON ideas BEGIN
  INSERT INTO ideas_fts(ideas_fts, rowid, id, title, description)
  VALUES ('delete', old.rowid, old.id, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS ideas_au AFTER UPDATE ON ideas BEGIN
  INSERT INTO ideas_fts(ideas_fts, rowid, id, title, description)
  VALUES ('delete', old.rowid, old.id, old.title, old.description);
  INSERT INTO ideas_fts(rowid, id, title, description)
  VALUES (new.rowid, new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS meetings_ai AFTER INSERT ON meetings BEGIN
  INSERT INTO meetings_fts(rowid, id, title, notes)
  VALUES (new.rowid, new.id, new.title, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS meetings_ad AFTER DELETE ON meetings BEGIN
  INSERT INTO meetings_fts(meetings_fts, rowid, id, title, notes)
  VALUES ('delete', old.rowid, old.id, old.title, old.notes);
END;

CREATE TRIGGER IF NOT EXISTS meetings_au AFTER UPDATE ON meetings BEGIN
  INSERT INTO meetings_fts(meetings_fts, rowid, id, title, notes)
  VALUES ('delete', old.rowid, old.id, old.title, old.notes);
  INSERT INTO meetings_fts(rowid, id, title, notes)
  VALUES (new.rowid, new.id, new.title, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS people_ai AFTER INSERT ON people BEGIN
  INSERT INTO people_fts(rowid, id, name, notes)
  VALUES (new.rowid, new.id, new.name, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS people_ad AFTER DELETE ON people BEGIN
  INSERT INTO people_fts(people_fts, rowid, id, name, notes)
  VALUES ('delete', old.rowid, old.id, old.name, old.notes);
END;

CREATE TRIGGER IF NOT EXISTS people_au AFTER UPDATE ON people BEGIN
  INSERT INTO people_fts(people_fts, rowid, id, name, notes)
  VALUES ('delete', old.rowid, old.id, old.name, old.notes);
  INSERT INTO people_fts(rowid, id, name, notes)
  VALUES (new.rowid, new.id, new.name, new.notes);
END;
`;

// Indexes for common queries
const INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_tasks_section ON tasks(section);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_notes_mode ON notes(mode);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);

CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);

CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);

CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_interactions_company ON interactions(company_id);

CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_org_reports_to ON org_members(reports_to);

CREATE INDEX IF NOT EXISTS idx_people_departments ON people(departments);
CREATE INDEX IF NOT EXISTS idx_people_reports_to ON people(reports_to);

CREATE INDEX IF NOT EXISTS idx_portfolio_status ON portfolio(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON portfolio(category);
`;

// Drop all tables for rebuild
const DROP_SQL = `
DROP TABLE IF EXISTS cache_meta;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS org_members;
DROP TABLE IF EXISTS portfolio;
DROP TABLE IF EXISTS interactions;
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS rates;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS strategic_builders;
DROP TABLE IF EXISTS capacity_plans;
DROP TABLE IF EXISTS brief;
DROP TABLE IF EXISTS project_value;
DROP TABLE IF EXISTS business_model;
DROP TABLE IF EXISTS lean_canvas;
DROP TABLE IF EXISTS risk;
DROP TABLE IF EXISTS swot;
DROP TABLE IF EXISTS c4_components;
DROP TABLE IF EXISTS mindmaps;
DROP TABLE IF EXISTS sticky_notes;
DROP TABLE IF EXISTS retrospectives;
DROP TABLE IF EXISTS ideas;
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS tasks;

DROP TRIGGER IF EXISTS tasks_ai;
DROP TRIGGER IF EXISTS tasks_ad;
DROP TRIGGER IF EXISTS tasks_au;
DROP TRIGGER IF EXISTS notes_ai;
DROP TRIGGER IF EXISTS notes_ad;
DROP TRIGGER IF EXISTS notes_au;
DROP TRIGGER IF EXISTS goals_ai;
DROP TRIGGER IF EXISTS goals_ad;
DROP TRIGGER IF EXISTS goals_au;
DROP TRIGGER IF EXISTS ideas_ai;
DROP TRIGGER IF EXISTS ideas_ad;
DROP TRIGGER IF EXISTS ideas_au;
DROP TRIGGER IF EXISTS meetings_ai;
DROP TRIGGER IF EXISTS meetings_ad;
DROP TRIGGER IF EXISTS meetings_au;
DROP TRIGGER IF EXISTS people_ai;
DROP TRIGGER IF EXISTS people_ad;
DROP TRIGGER IF EXISTS people_au;

DROP TABLE IF EXISTS people_fts;
DROP TABLE IF EXISTS meetings_fts;
DROP TABLE IF EXISTS ideas_fts;
DROP TABLE IF EXISTS goals_fts;
DROP TABLE IF EXISTS notes_fts;
DROP TABLE IF EXISTS tasks_fts;
`;
