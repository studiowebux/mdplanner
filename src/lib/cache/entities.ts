/**
 * Entity Registry
 * Pattern: Registry pattern - single source of truth for all cached entities
 *
 * To add a new entity:
 *   1. Add one EntityDef object to the ENTITIES array below.
 *   2. That is the entire interface.
 *
 * schema.ts, sync.ts, and search.ts iterate this array.
 * No other files need to change.
 */

import type { BindValue, CacheDatabase } from "./database.ts";
import type { DirectoryMarkdownParser } from "../parser/directory/parser.ts";

// ============================================================
// Types
// ============================================================

export interface FTSConfig {
  /** SearchResult.type value (e.g. "task", "note") */
  type: string;
  /** Columns in the FTS virtual table; must match base table columns */
  columns: string[];
  /** Which column becomes SearchResult.title */
  titleCol: string;
  /** Which column is used for snippet() */
  contentCol: string;
}

export type TableSyncer = (
  parser: DirectoryMarkdownParser,
  db: CacheDatabase,
) => Promise<number>;

export interface EntityDef {
  table: string;
  /** Full CREATE TABLE IF NOT EXISTS ... SQL */
  schema: string;
  /** Present = FTS enabled; absent = cached only */
  fts?: FTSConfig;
  sync: TableSyncer;
}

// ============================================================
// Helpers (exported so schema.ts / sync.ts can reuse them)
// ============================================================

// deno-lint-ignore no-explicit-any
export function val(v: any): BindValue {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return v;
  if (v instanceof Uint8Array) return v;
  return String(v);
}

// deno-lint-ignore no-explicit-any
export function json(v: any): string {
  return JSON.stringify(v ?? []);
}

// ============================================================
// FTS SQL generators
// ============================================================

/**
 * Generate CREATE VIRTUAL TABLE and three sync triggers for an FTS entity.
 */
export function buildFtsSql(def: EntityDef): string {
  const { table, fts } = def;
  if (!fts) return "";
  const colList = fts.columns.join(", ");
  const newVals = fts.columns.map((c) => `new.${c}`).join(", ");
  const oldVals = fts.columns.map((c) => `old.${c}`).join(", ");
  return `
CREATE VIRTUAL TABLE IF NOT EXISTS ${table}_fts USING fts5(
  ${fts.columns.join(",\n  ")},
  content='${table}',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS ${table}_ai AFTER INSERT ON ${table} BEGIN
  INSERT INTO ${table}_fts(rowid, ${colList})
  VALUES (new.rowid, ${newVals});
END;

CREATE TRIGGER IF NOT EXISTS ${table}_ad AFTER DELETE ON ${table} BEGIN
  INSERT INTO ${table}_fts(${table}_fts, rowid, ${colList})
  VALUES ('delete', old.rowid, ${oldVals});
END;

CREATE TRIGGER IF NOT EXISTS ${table}_au AFTER UPDATE ON ${table} BEGIN
  INSERT INTO ${table}_fts(${table}_fts, rowid, ${colList})
  VALUES ('delete', old.rowid, ${oldVals});
  INSERT INTO ${table}_fts(rowid, ${colList})
  VALUES (new.rowid, ${newVals});
END;
`.trim();
}

/**
 * Generate DROP TRIGGER and DROP TABLE statements for an FTS entity.
 */
export function buildFtsDropSql(def: EntityDef): string {
  const { table, fts } = def;
  if (!fts) return "";
  return `
DROP TRIGGER IF EXISTS ${table}_ai;
DROP TRIGGER IF EXISTS ${table}_ad;
DROP TRIGGER IF EXISTS ${table}_au;
DROP TABLE IF EXISTS ${table}_fts;
`.trim();
}

// ============================================================
// Entity Registry
// ============================================================

export const ENTITIES: EntityDef[] = [
  // ----------------------------------------------------------
  // Tasks
  // ----------------------------------------------------------
  {
    table: "tasks",
    schema: `CREATE TABLE IF NOT EXISTS tasks (
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
  project TEXT,
  config TEXT,         -- Full config as JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`,
    fts: {
      type: "task",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (parser, db) => {
      const tasks = await parser.readTasks();
      db.execute("DELETE FROM tasks");
      let count = 0;
      // deno-lint-ignore no-explicit-any
      const insertTask = (task: any, parentId?: string) => {
        const config = task.config ?? {};
        db.execute(
          `INSERT INTO tasks (id, title, completed, section, description, tags, due_date, assignee, priority, effort, milestone, blocked_by, planned_start, planned_end, parent_id, project, config)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(task.id),
            val(task.title),
            task.completed ? 1 : 0,
            val(task.section),
            Array.isArray(task.description)
              ? task.description.join("\n")
              : null,
            json(config.tag),
            val(config.due_date),
            val(config.assignee),
            val(config.priority),
            val(config.effort),
            val(config.milestone),
            json(config.blocked_by),
            val(config.planned_start),
            val(config.planned_end),
            val(parentId),
            val(config.project),
            JSON.stringify(config),
          ],
        );
        count++;
        if (task.children) {
          for (const child of task.children) {
            insertTask(child, task.id);
          }
        }
      };
      for (const task of tasks) insertTask(task);
      return count;
    },
  },

  // ----------------------------------------------------------
  // Notes
  // ----------------------------------------------------------
  {
    table: "notes",
    schema: `CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  mode TEXT DEFAULT 'simple',
  paragraphs TEXT,       -- JSON array
  custom_sections TEXT,  -- JSON array
  revision INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
)`,
    fts: {
      type: "note",
      columns: ["id", "title", "content"],
      titleCol: "title",
      contentCol: "content",
    },
    sync: async (parser, db) => {
      const notes = await parser.readNotes();
      db.execute("DELETE FROM notes");
      for (const n of notes) {
        db.execute(
          `INSERT INTO notes (id, title, content, mode, paragraphs, custom_sections, revision, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(n.id),
            val(n.title),
            val(n.content),
            val(n.mode) ?? "simple",
            json(n.paragraphs),
            json(n.customSections),
            val(n.revision) ?? 1,
            val(n.createdAt),
            val(n.updatedAt),
          ],
        );
      }
      return notes.length;
    },
  },

  // ----------------------------------------------------------
  // Goals
  // ----------------------------------------------------------
  {
    table: "goals",
    schema: `CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  kpi TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT
)`,
    fts: {
      type: "goal",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (parser, db) => {
      const goals = await parser.readGoals();
      db.execute("DELETE FROM goals");
      for (const g of goals) {
        db.execute(
          `INSERT INTO goals (id, title, description, type, kpi, start_date, end_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(g.id),
            val(g.title),
            val(g.description),
            val(g.type),
            val(g.kpi),
            val(g.startDate),
            val(g.endDate),
            val(g.status),
          ],
        );
      }
      return goals.length;
    },
  },

  // ----------------------------------------------------------
  // Milestones
  // ----------------------------------------------------------
  {
    table: "milestones",
    schema: `CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target TEXT,
  status TEXT,
  description TEXT
)`,
    sync: async (parser, db) => {
      const milestones = await parser.readMilestones();
      db.execute("DELETE FROM milestones");
      for (const m of milestones) {
        db.execute(
          `INSERT INTO milestones (id, name, target, status, description) VALUES (?, ?, ?, ?, ?)`,
          [
            val(m.id),
            val(m.name),
            val(m.target),
            val(m.status),
            val(m.description),
          ],
        );
      }
      return milestones.length;
    },
  },

  // ----------------------------------------------------------
  // Ideas
  // ----------------------------------------------------------
  {
    table: "ideas",
    schema: `CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT,
  category TEXT,
  description TEXT,
  links TEXT,           -- JSON array of linked idea IDs
  created TEXT
)`,
    fts: {
      type: "idea",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (parser, db) => {
      const ideas = await parser.readIdeas();
      db.execute("DELETE FROM ideas");
      for (const i of ideas) {
        db.execute(
          `INSERT INTO ideas (id, title, status, category, description, links, created)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(i.id),
            val(i.title),
            val(i.status),
            val(i.category),
            val(i.description),
            json(i.links),
            val(i.created),
          ],
        );
      }
      return ideas.length;
    },
  },

  // ----------------------------------------------------------
  // Retrospectives
  // ----------------------------------------------------------
  {
    table: "retrospectives",
    schema: `CREATE TABLE IF NOT EXISTS retrospectives (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  status TEXT,
  continue_items TEXT,  -- JSON array
  stop_items TEXT,      -- JSON array
  start_items TEXT      -- JSON array
)`,
    fts: {
      type: "retrospective",
      columns: ["id", "title"],
      titleCol: "title",
      contentCol: "title",
    },
    sync: async (parser, db) => {
      const retros = await parser.readRetrospectives();
      db.execute("DELETE FROM retrospectives");
      for (const r of retros) {
        db.execute(
          `INSERT INTO retrospectives (id, title, date, status, continue_items, stop_items, start_items)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(r.id),
            val(r.title),
            val(r.date),
            val(r.status),
            json(r.continue),
            json(r.stop),
            json(r.start),
          ],
        );
      }
      return retros.length;
    },
  },

  // ----------------------------------------------------------
  // Sticky Notes (Canvas)
  // ----------------------------------------------------------
  {
    table: "sticky_notes",
    schema: `CREATE TABLE IF NOT EXISTS sticky_notes (
  id TEXT PRIMARY KEY,
  content TEXT,
  color TEXT,
  position_x REAL,
  position_y REAL,
  width REAL,
  height REAL
)`,
    sync: async (parser, db) => {
      const notes = await parser.readStickyNotes();
      db.execute("DELETE FROM sticky_notes");
      for (const n of notes) {
        db.execute(
          `INSERT INTO sticky_notes (id, content, color, position_x, position_y, width, height)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(n.id),
            val(n.content),
            val(n.color),
            n.position?.x ?? 0,
            n.position?.y ?? 0,
            n.size?.width ?? null,
            n.size?.height ?? null,
          ],
        );
      }
      return notes.length;
    },
  },

  // ----------------------------------------------------------
  // Mindmaps
  // ----------------------------------------------------------
  {
    table: "mindmaps",
    schema: `CREATE TABLE IF NOT EXISTS mindmaps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  nodes TEXT            -- JSON tree structure
)`,
    sync: async (parser, db) => {
      const mindmaps = await parser.readMindmaps();
      db.execute("DELETE FROM mindmaps");
      for (const m of mindmaps) {
        db.execute(
          `INSERT INTO mindmaps (id, title, nodes) VALUES (?, ?, ?)`,
          [val(m.id), val(m.title), json(m.nodes)],
        );
      }
      return mindmaps.length;
    },
  },

  // ----------------------------------------------------------
  // C4 Components
  // ----------------------------------------------------------
  {
    table: "c4_components",
    schema: `CREATE TABLE IF NOT EXISTS c4_components (
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
)`,
    sync: async (parser, db) => {
      const components = await parser.readC4Components();
      db.execute("DELETE FROM c4_components");
      for (const c of components) {
        db.execute(
          `INSERT INTO c4_components (id, name, level, type, technology, description, position_x, position_y, connections, children, parent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(c.id),
            val(c.name),
            val(c.level),
            val(c.type),
            val(c.technology),
            val(c.description),
            c.position?.x ?? 0,
            c.position?.y ?? 0,
            json(c.connections),
            json(c.children),
            val(c.parent),
          ],
        );
      }
      return components.length;
    },
  },

  // ----------------------------------------------------------
  // SWOT Analysis
  // ----------------------------------------------------------
  {
    table: "swot",
    schema: `CREATE TABLE IF NOT EXISTS swot (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  strengths TEXT,       -- JSON array
  weaknesses TEXT,      -- JSON array
  opportunities TEXT,   -- JSON array
  threats TEXT          -- JSON array
)`,
    fts: {
      type: "swot",
      columns: ["id", "title"],
      titleCol: "title",
      contentCol: "title",
    },
    sync: async (parser, db) => {
      const analyses = await parser.readSwotAnalyses();
      db.execute("DELETE FROM swot");
      for (const s of analyses) {
        db.execute(
          `INSERT INTO swot (id, title, date, strengths, weaknesses, opportunities, threats)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(s.id),
            val(s.title),
            val(s.date),
            json(s.strengths),
            json(s.weaknesses),
            json(s.opportunities),
            json(s.threats),
          ],
        );
      }
      return analyses.length;
    },
  },

  // ----------------------------------------------------------
  // Risk Analysis
  // ----------------------------------------------------------
  {
    table: "risk",
    schema: `CREATE TABLE IF NOT EXISTS risk (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  high_impact_high_prob TEXT,  -- JSON array
  high_impact_low_prob TEXT,   -- JSON array
  low_impact_high_prob TEXT,   -- JSON array
  low_impact_low_prob TEXT     -- JSON array
)`,
    sync: async (parser, db) => {
      const analyses = await parser.readRiskAnalyses();
      db.execute("DELETE FROM risk");
      for (const r of analyses) {
        db.execute(
          `INSERT INTO risk (id, title, date, high_impact_high_prob, high_impact_low_prob, low_impact_high_prob, low_impact_low_prob)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(r.id),
            val(r.title),
            val(r.date),
            json(r.highImpactHighProb),
            json(r.highImpactLowProb),
            json(r.lowImpactHighProb),
            json(r.lowImpactLowProb),
          ],
        );
      }
      return analyses.length;
    },
  },

  // ----------------------------------------------------------
  // Lean Canvas
  // ----------------------------------------------------------
  {
    table: "lean_canvas",
    schema: `CREATE TABLE IF NOT EXISTS lean_canvas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  data TEXT             -- Full canvas as JSON
)`,
    sync: async (parser, db) => {
      const canvases = await parser.readLeanCanvases();
      db.execute("DELETE FROM lean_canvas");
      for (const c of canvases) {
        db.execute(
          `INSERT INTO lean_canvas (id, title, date, data) VALUES (?, ?, ?, ?)`,
          [val(c.id), val(c.title), val(c.date), JSON.stringify(c)],
        );
      }
      return canvases.length;
    },
  },

  // ----------------------------------------------------------
  // Business Model Canvas
  // ----------------------------------------------------------
  {
    table: "business_model",
    schema: `CREATE TABLE IF NOT EXISTS business_model (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  data TEXT             -- Full canvas as JSON
)`,
    sync: async (parser, db) => {
      const canvases = await parser.readBusinessModelCanvases();
      db.execute("DELETE FROM business_model");
      for (const c of canvases) {
        db.execute(
          `INSERT INTO business_model (id, title, date, data) VALUES (?, ?, ?, ?)`,
          [val(c.id), val(c.title), val(c.date), JSON.stringify(c)],
        );
      }
      return canvases.length;
    },
  },

  // ----------------------------------------------------------
  // Project Value Board
  // ----------------------------------------------------------
  {
    table: "project_value",
    schema: `CREATE TABLE IF NOT EXISTS project_value (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  data TEXT             -- Full board as JSON
)`,
    sync: async (parser, db) => {
      const boards = await parser.readProjectValueBoards();
      db.execute("DELETE FROM project_value");
      for (const b of boards) {
        db.execute(
          `INSERT INTO project_value (id, title, date, data) VALUES (?, ?, ?, ?)`,
          [val(b.id), val(b.title), val(b.date), JSON.stringify(b)],
        );
      }
      return boards.length;
    },
  },

  // ----------------------------------------------------------
  // Brief
  // ----------------------------------------------------------
  {
    table: "brief",
    schema: `CREATE TABLE IF NOT EXISTS brief (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  data TEXT             -- Full brief as JSON
)`,
    fts: {
      type: "brief",
      columns: ["id", "title"],
      titleCol: "title",
      contentCol: "title",
    },
    sync: async (parser, db) => {
      const briefs = await parser.readBriefs();
      db.execute("DELETE FROM brief");
      for (const b of briefs) {
        db.execute(
          `INSERT INTO brief (id, title, date, data) VALUES (?, ?, ?, ?)`,
          [val(b.id), val(b.title), val(b.date), JSON.stringify(b)],
        );
      }
      return briefs.length;
    },
  },

  // ----------------------------------------------------------
  // Capacity Plans
  // ----------------------------------------------------------
  {
    table: "capacity_plans",
    schema: `CREATE TABLE IF NOT EXISTS capacity_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  budget_hours INTEGER,
  team_members TEXT,    -- JSON array
  allocations TEXT      -- JSON array
)`,
    sync: async (parser, db) => {
      const plans = await parser.readCapacityPlans();
      db.execute("DELETE FROM capacity_plans");
      for (const p of plans) {
        db.execute(
          `INSERT INTO capacity_plans (id, title, date, budget_hours, team_members, allocations)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            val(p.id),
            val(p.title),
            val(p.date),
            val(p.budgetHours),
            json(p.teamMembers),
            json(p.allocations),
          ],
        );
      }
      return plans.length;
    },
  },

  // ----------------------------------------------------------
  // Strategic Levels Builders
  // ----------------------------------------------------------
  {
    table: "strategic_builders",
    schema: `CREATE TABLE IF NOT EXISTS strategic_builders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  levels TEXT           -- JSON array
)`,
    sync: async (parser, db) => {
      const builders = await parser.readStrategicLevelsBuilders();
      db.execute("DELETE FROM strategic_builders");
      for (const b of builders) {
        db.execute(
          `INSERT INTO strategic_builders (id, title, date, levels) VALUES (?, ?, ?, ?)`,
          [val(b.id), val(b.title), val(b.date), json(b.levels)],
        );
      }
      return builders.length;
    },
  },

  // ----------------------------------------------------------
  // Billing: Customers
  // ----------------------------------------------------------
  {
    table: "customers",
    schema: `CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT
)`,
    sync: async (parser, db) => {
      const customers = await parser.readCustomers();
      db.execute("DELETE FROM customers");
      for (const c of customers) {
        // deno-lint-ignore no-explicit-any
        const cust = c as any;
        db.execute(
          `INSERT INTO customers (id, name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            val(cust.id),
            val(cust.name),
            val(cust.email),
            val(cust.phone),
            val(cust.address),
            val(cust.notes),
          ],
        );
      }
      return customers.length;
    },
  },

  // ----------------------------------------------------------
  // Billing: Rates
  // ----------------------------------------------------------
  {
    table: "rates",
    schema: `CREATE TABLE IF NOT EXISTS rates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hourly_rate REAL,
  assignee TEXT,
  is_default INTEGER DEFAULT 0
)`,
    sync: async (parser, db) => {
      try {
        const rates = await parser.readBillingRates();
        db.execute("DELETE FROM rates");
        for (const r of rates) {
          db.execute(
            `INSERT INTO rates (id, name, hourly_rate, assignee, is_default) VALUES (?, ?, ?, ?, ?)`,
            [
              val(r.id),
              val(r.name),
              val(r.hourlyRate),
              val(r.assignee),
              r.isDefault ? 1 : 0,
            ],
          );
        }
        return rates.length;
      } catch {
        return 0;
      }
    },
  },

  // ----------------------------------------------------------
  // Billing: Quotes
  // ----------------------------------------------------------
  {
    table: "quotes",
    schema: `CREATE TABLE IF NOT EXISTS quotes (
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
)`,
    sync: async (parser, db) => {
      const quotes = await parser.readQuotes();
      db.execute("DELETE FROM quotes");
      for (const q of quotes) {
        // deno-lint-ignore no-explicit-any
        const quote = q as any;
        db.execute(
          `INSERT INTO quotes (id, number, customer_id, status, date, valid_until, line_items, notes, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(quote.id),
            val(quote.number),
            val(quote.customerId),
            val(quote.status),
            val(quote.date ?? quote.created),
            val(quote.validUntil),
            json(quote.lineItems),
            val(quote.notes),
            val(quote.total),
          ],
        );
      }
      return quotes.length;
    },
  },

  // ----------------------------------------------------------
  // Billing: Invoices
  // ----------------------------------------------------------
  {
    table: "invoices",
    schema: `CREATE TABLE IF NOT EXISTS invoices (
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
)`,
    sync: async (parser, db) => {
      const invoices = await parser.readInvoices();
      db.execute("DELETE FROM invoices");
      for (const i of invoices) {
        // deno-lint-ignore no-explicit-any
        const inv = i as any;
        db.execute(
          `INSERT INTO invoices (id, number, customer_id, quote_id, status, date, due_date, line_items, notes, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(inv.id),
            val(inv.number),
            val(inv.customerId),
            val(inv.quoteId),
            val(inv.status),
            val(inv.date ?? inv.created),
            val(inv.dueDate),
            json(inv.lineItems),
            val(inv.notes),
            val(inv.total),
          ],
        );
      }
      return invoices.length;
    },
  },

  // ----------------------------------------------------------
  // CRM: Companies
  // ----------------------------------------------------------
  {
    table: "companies",
    schema: `CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created TEXT
)`,
    fts: {
      type: "company",
      columns: ["id", "name", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    sync: async (parser, db) => {
      const companies = await parser.readCompanies();
      db.execute("DELETE FROM companies");
      for (const c of companies) {
        db.execute(
          `INSERT INTO companies (id, name, industry, website, phone, address, notes, created)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(c.id),
            val(c.name),
            val(c.industry),
            val(c.website),
            val(c.phone),
            val(c.address),
            val(c.notes),
            val(c.created),
          ],
        );
      }
      return companies.length;
    },
  },

  // ----------------------------------------------------------
  // CRM: Contacts
  // ----------------------------------------------------------
  {
    table: "contacts",
    schema: `CREATE TABLE IF NOT EXISTS contacts (
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
)`,
    fts: {
      type: "contact",
      columns: ["id", "first_name", "last_name", "notes"],
      titleCol: "first_name",
      contentCol: "notes",
    },
    sync: async (parser, db) => {
      const contacts = await parser.readContacts();
      db.execute("DELETE FROM contacts");
      for (const c of contacts) {
        db.execute(
          `INSERT INTO contacts (id, company_id, first_name, last_name, email, phone, title, is_primary, notes, created)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(c.id),
            val(c.companyId),
            val(c.firstName),
            val(c.lastName),
            val(c.email),
            val(c.phone),
            val(c.title),
            c.isPrimary ? 1 : 0,
            val(c.notes),
            val(c.created),
          ],
        );
      }
      return contacts.length;
    },
  },

  // ----------------------------------------------------------
  // CRM: Deals
  // ----------------------------------------------------------
  {
    table: "deals",
    schema: `CREATE TABLE IF NOT EXISTS deals (
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
)`,
    sync: async (parser, db) => {
      const deals = await parser.readDeals();
      db.execute("DELETE FROM deals");
      for (const d of deals) {
        db.execute(
          `INSERT INTO deals (id, company_id, contact_id, title, value, stage, probability, expected_close, closed_at, notes, created)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(d.id),
            val(d.companyId),
            val(d.contactId),
            val(d.title),
            val(d.value),
            val(d.stage),
            val(d.probability),
            val(d.expectedCloseDate),
            val(d.closedAt),
            val(d.notes),
            val(d.created),
          ],
        );
      }
      return deals.length;
    },
  },

  // ----------------------------------------------------------
  // CRM: Interactions
  // ----------------------------------------------------------
  {
    table: "interactions",
    schema: `CREATE TABLE IF NOT EXISTS interactions (
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
)`,
    sync: async (parser, db) => {
      const interactions = await parser.readInteractions();
      db.execute("DELETE FROM interactions");
      for (const i of interactions) {
        db.execute(
          `INSERT INTO interactions (id, company_id, contact_id, deal_id, type, summary, date, duration, next_follow_up, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(i.id),
            val(i.companyId),
            val(i.contactId),
            val(i.dealId),
            val(i.type),
            val(i.summary),
            val(i.date),
            val(i.duration),
            val(i.nextFollowUp),
            val(i.notes),
          ],
        );
      }
      return interactions.length;
    },
  },

  // ----------------------------------------------------------
  // Portfolio
  // ----------------------------------------------------------
  {
    table: "portfolio",
    schema: `CREATE TABLE IF NOT EXISTS portfolio (
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
  kpis TEXT,            -- JSON array
  tech_stack TEXT,      -- JSON array
  billing_customer_id TEXT
)`,
    fts: {
      type: "portfolio",
      columns: ["id", "name"],
      titleCol: "name",
      contentCol: "name",
    },
    sync: async (parser, db) => {
      const items = await parser.readPortfolioItems();
      db.execute("DELETE FROM portfolio");
      for (const p of items) {
        db.execute(
          `INSERT INTO portfolio (id, name, category, status, client, revenue, expenses, progress, start_date, end_date, team, kpis, tech_stack, billing_customer_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(p.id),
            val(p.name),
            val(p.category),
            val(p.status),
            val(p.client),
            val(p.revenue),
            val(p.expenses),
            val(p.progress),
            val(p.startDate),
            val(p.endDate),
            json(p.team),
            json(p.kpis),
            json(p.techStack),
            val(p.billingCustomerId),
          ],
        );
      }
      return items.length;
    },
  },

  // ----------------------------------------------------------
  // People (shared registry)
  // ----------------------------------------------------------
  {
    table: "people",
    schema: `CREATE TABLE IF NOT EXISTS people (
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
)`,
    fts: {
      type: "person",
      columns: ["id", "name", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    sync: async (parser, db) => {
      const people = await parser.readPeople();
      db.execute("DELETE FROM people");
      for (const p of people) {
        db.execute(
          `INSERT INTO people (id, name, title, role, departments, reports_to, email, phone, start_date, hours_per_day, working_days, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            val(p.hoursPerDay),
            json(p.workingDays),
            val(p.notes),
          ],
        );
      }
      return people.length;
    },
  },

  // ----------------------------------------------------------
  // Org Chart Members
  // ----------------------------------------------------------
  {
    table: "org_members",
    schema: `CREATE TABLE IF NOT EXISTS org_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  departments TEXT,  -- JSON array
  reports_to TEXT,
  email TEXT,
  phone TEXT,
  start_date TEXT,
  notes TEXT
)`,
    sync: async (parser, db) => {
      const members = await parser.readOrgChartMembers();
      db.execute("DELETE FROM org_members");
      for (const m of members) {
        db.execute(
          `INSERT INTO org_members (id, name, title, departments, reports_to, email, phone, start_date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(m.id),
            val(m.name),
            val(m.title),
            val(JSON.stringify(m.departments)),
            val(m.reportsTo),
            val(m.email),
            val(m.phone),
            val(m.startDate),
            val(m.notes),
          ],
        );
      }
      return members.length;
    },
  },

  // ----------------------------------------------------------
  // Meetings
  // ----------------------------------------------------------
  {
    table: "meetings",
    schema: `CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  attendees TEXT,   -- JSON array
  agenda TEXT,
  notes TEXT,       -- markdown body
  actions TEXT,     -- JSON array of MeetingAction
  created TEXT
)`,
    fts: {
      type: "meeting",
      columns: ["id", "title", "notes"],
      titleCol: "title",
      contentCol: "notes",
    },
    sync: async (parser, db) => {
      const meetings = await parser.readMeetings();
      db.execute("DELETE FROM meetings");
      for (const m of meetings) {
        db.execute(
          `INSERT INTO meetings (id, title, date, attendees, agenda, notes, actions, created)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(m.id),
            val(m.title),
            val(m.date),
            json(m.attendees),
            val(m.agenda),
            val(m.notes),
            json(m.actions),
            val(m.created),
          ],
        );
      }
      return meetings.length;
    },
  },

  // ----------------------------------------------------------
  // MoSCoW Analysis (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "moscow",
    schema: `CREATE TABLE IF NOT EXISTS moscow (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  must TEXT,    -- JSON array
  should TEXT,  -- JSON array
  could TEXT,   -- JSON array
  wont TEXT     -- JSON array
)`,
    fts: {
      type: "moscow",
      columns: ["id", "title"],
      titleCol: "title",
      contentCol: "title",
    },
    sync: async (parser, db) => {
      const analyses = await parser.readMoscowAnalyses();
      db.execute("DELETE FROM moscow");
      for (const m of analyses) {
        db.execute(
          `INSERT INTO moscow (id, title, date, must, should, could, wont)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(m.id),
            val(m.title),
            val(m.date),
            json(m.must),
            json(m.should),
            json(m.could),
            json(m.wont),
          ],
        );
      }
      return analyses.length;
    },
  },

  // ----------------------------------------------------------
  // Eisenhower Matrix (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "eisenhower",
    schema: `CREATE TABLE IF NOT EXISTS eisenhower (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  urgent_important TEXT,         -- JSON array
  not_urgent_important TEXT,     -- JSON array
  urgent_not_important TEXT,     -- JSON array
  not_urgent_not_important TEXT  -- JSON array
)`,
    fts: {
      type: "eisenhower",
      columns: ["id", "title"],
      titleCol: "title",
      contentCol: "title",
    },
    sync: async (parser, db) => {
      const matrices = await parser.readEisenhowerMatrices();
      db.execute("DELETE FROM eisenhower");
      for (const e of matrices) {
        db.execute(
          `INSERT INTO eisenhower (id, title, date, urgent_important, not_urgent_important, urgent_not_important, not_urgent_not_important)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(e.id),
            val(e.title),
            val(e.date),
            json(e.urgentImportant),
            json(e.notUrgentImportant),
            json(e.urgentNotImportant),
            json(e.notUrgentNotImportant),
          ],
        );
      }
      return matrices.length;
    },
  },

  // ----------------------------------------------------------
  // SAFE Agreements (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "safe_agreements",
    schema: `CREATE TABLE IF NOT EXISTS safe_agreements (
  id TEXT PRIMARY KEY,
  investor TEXT NOT NULL,
  amount REAL,
  valuation_cap REAL,
  discount REAL,
  type TEXT,
  date TEXT,
  status TEXT,
  notes TEXT
)`,
    sync: async (parser, db) => {
      const agreements = await parser.readSafeAgreements();
      db.execute("DELETE FROM safe_agreements");
      for (const s of agreements) {
        db.execute(
          `INSERT INTO safe_agreements (id, investor, amount, valuation_cap, discount, type, date, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(s.id),
            val(s.investor),
            val(s.amount),
            val(s.valuation_cap),
            val(s.discount),
            val(s.type),
            val(s.date),
            val(s.status),
            val(s.notes),
          ],
        );
      }
      return agreements.length;
    },
  },

  // ----------------------------------------------------------
  // Investors (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "investors",
    schema: `CREATE TABLE IF NOT EXISTS investors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  stage TEXT,
  status TEXT,
  amount_target REAL,
  contact TEXT,
  intro_date TEXT,
  last_contact TEXT,
  notes TEXT
)`,
    sync: async (parser, db) => {
      const investors = await parser.readInvestors();
      db.execute("DELETE FROM investors");
      for (const inv of investors) {
        db.execute(
          `INSERT INTO investors (id, name, type, stage, status, amount_target, contact, intro_date, last_contact, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(inv.id),
            val(inv.name),
            val(inv.type),
            val(inv.stage),
            val(inv.status),
            val(inv.amount_target),
            val(inv.contact),
            val(inv.intro_date),
            val(inv.last_contact),
            val(inv.notes),
          ],
        );
      }
      return investors.length;
    },
  },

  // ----------------------------------------------------------
  // KPI Snapshots (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "kpi_snapshots",
    schema: `CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  mrr REAL,
  arr REAL,
  churn_rate REAL,
  ltv REAL,
  cac REAL,
  growth_rate REAL,
  active_users INTEGER,
  nrr REAL,
  gross_margin REAL,
  notes TEXT
)`,
    sync: async (parser, db) => {
      const snapshots = await parser.readKpiSnapshots();
      db.execute("DELETE FROM kpi_snapshots");
      for (const k of snapshots) {
        db.execute(
          `INSERT INTO kpi_snapshots (id, period, mrr, arr, churn_rate, ltv, cac, growth_rate, active_users, nrr, gross_margin, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(k.id),
            val(k.period),
            val(k.mrr),
            val(k.arr),
            val(k.churn_rate),
            val(k.ltv),
            val(k.cac),
            val(k.growth_rate),
            val(k.active_users),
            val(k.nrr),
            val(k.gross_margin),
            val(k.notes),
          ],
        );
      }
      return snapshots.length;
    },
  },

  // ----------------------------------------------------------
  // Onboarding Records (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "onboarding",
    schema: `CREATE TABLE IF NOT EXISTS onboarding (
  id TEXT PRIMARY KEY,
  employee_name TEXT NOT NULL,
  role TEXT,
  start_date TEXT,
  person_id TEXT,
  steps TEXT,    -- JSON array of OnboardingStep
  notes TEXT,
  created TEXT
)`,
    fts: {
      type: "onboarding",
      columns: ["id", "employee_name"],
      titleCol: "employee_name",
      contentCol: "employee_name",
    },
    sync: async (parser, db) => {
      const records = await parser.readOnboardingRecords();
      db.execute("DELETE FROM onboarding");
      for (const r of records) {
        db.execute(
          `INSERT INTO onboarding (id, employee_name, role, start_date, person_id, steps, notes, created)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(r.id),
            val(r.employeeName),
            val(r.role),
            val(r.startDate),
            val(r.personId),
            json(r.steps),
            val(r.notes),
            val(r.created),
          ],
        );
      }
      return records.length;
    },
  },

  // ----------------------------------------------------------
  // Onboarding Templates (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "onboarding_templates",
    schema: `CREATE TABLE IF NOT EXISTS onboarding_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT,    -- JSON array of OnboardingStepDefinition
  created TEXT
)`,
    fts: {
      type: "onboarding_template",
      columns: ["id", "name"],
      titleCol: "name",
      contentCol: "name",
    },
    sync: async (parser, db) => {
      const templates = await parser.readOnboardingTemplates();
      db.execute("DELETE FROM onboarding_templates");
      for (const t of templates) {
        db.execute(
          `INSERT INTO onboarding_templates (id, name, description, steps, created)
           VALUES (?, ?, ?, ?, ?)`,
          [
            val(t.id),
            val(t.name),
            val(t.description),
            json(t.steps),
            val(t.created),
          ],
        );
      }
      return templates.length;
    },
  },

  // ----------------------------------------------------------
  // Financial Periods (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "financial_periods",
    schema: `CREATE TABLE IF NOT EXISTS financial_periods (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  cash_on_hand REAL,
  revenue TEXT,    -- JSON array of FinancePeriodItem
  expenses TEXT,   -- JSON array of FinancePeriodItem
  notes TEXT,
  created TEXT
)`,
    fts: {
      type: "financial_period",
      columns: ["id", "period"],
      titleCol: "period",
      contentCol: "period",
    },
    sync: async (parser, db) => {
      const periods = await parser.readFinancialPeriods();
      db.execute("DELETE FROM financial_periods");
      for (const p of periods) {
        db.execute(
          `INSERT INTO financial_periods (id, period, cash_on_hand, revenue, expenses, notes, created)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(p.id),
            val(p.period),
            val(p.cash_on_hand),
            json(p.revenue),
            json(p.expenses),
            val(p.notes),
            val(p.created),
          ],
        );
      }
      return periods.length;
    },
  },

  // ----------------------------------------------------------
  // Payments (Phase 3: new entity)
  // ----------------------------------------------------------
  {
    table: "payments",
    schema: `CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  amount REAL,
  date TEXT,
  method TEXT,
  reference TEXT,
  notes TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
)`,
    sync: async (parser, db) => {
      const payments = await parser.readPayments();
      db.execute("DELETE FROM payments");
      for (const p of payments) {
        db.execute(
          `INSERT INTO payments (id, invoice_id, amount, date, method, reference, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            val(p.id),
            val(p.invoiceId),
            val(p.amount),
            val(p.date),
            val(p.method),
            val(p.reference),
            val(p.notes),
          ],
        );
      }
      return payments.length;
    },
  },

  // ----------------------------------------------------------
  // Time Entries (Phase 3: new entity, flattened from Map<string, TimeEntry[]>)
  // ----------------------------------------------------------
  {
    table: "time_entries",
    schema: `CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  date TEXT,
  hours REAL,
  person TEXT,
  description TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
)`,
    sync: async (parser, db) => {
      const entriesMap = await parser.readTimeEntries();
      db.execute("DELETE FROM time_entries");
      let count = 0;
      for (const [taskId, entries] of entriesMap) {
        for (const e of entries) {
          db.execute(
            `INSERT INTO time_entries (id, task_id, date, hours, person, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              val(e.id),
              val(taskId),
              val(e.date),
              val(e.hours),
              val(e.person),
              val(e.description),
            ],
          );
          count++;
        }
      }
      return count;
    },
  },

  // ----------------------------------------------------------
  // Journal
  // ----------------------------------------------------------
  {
    table: "journal",
    schema: `CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  title TEXT,
  mood TEXT,
  tags TEXT,    -- JSON array
  body TEXT,
  created TEXT,
  updated TEXT
)`,
    fts: {
      type: "journal",
      columns: ["id", "title", "body"],
      titleCol: "title",
      contentCol: "body",
    },
    sync: async (parser, db) => {
      const entries = await parser.readJournalEntries();
      db.execute("DELETE FROM journal");
      for (const e of entries) {
        db.execute(
          `INSERT INTO journal (id, date, time, title, mood, tags, body, created, updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(e.id),
            val(e.date),
            val(e.time),
            val(e.title),
            val(e.mood),
            json(e.tags),
            val(e.body),
            val(e.created),
            val(e.updated),
          ],
        );
      }
      return entries.length;
    },
  },

  // ----------------------------------------------------------
  // DNS Domains
  // ----------------------------------------------------------
  {
    table: "dns_domains",
    schema: `CREATE TABLE IF NOT EXISTS dns_domains (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  expiry_date TEXT,
  auto_renew INTEGER,  -- 0/1
  renewal_cost_usd REAL,
  provider TEXT,
  nameservers TEXT,    -- JSON array
  last_fetched_at TEXT,
  notes TEXT,
  created TEXT,
  updated TEXT
)`,
    fts: {
      type: "dns_domain",
      columns: ["id", "domain", "notes"],
      titleCol: "domain",
      contentCol: "notes",
    },
    sync: async (parser, db) => {
      const domains = await parser.readDnsDomains();
      db.execute("DELETE FROM dns_domains");
      for (const d of domains) {
        db.execute(
          `INSERT INTO dns_domains (id, domain, expiry_date, auto_renew, renewal_cost_usd, provider, nameservers, last_fetched_at, notes, created, updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            val(d.id),
            val(d.domain),
            val(d.expiryDate),
            d.autoRenew !== undefined ? (d.autoRenew ? 1 : 0) : null,
            val(d.renewalCostUsd),
            val(d.provider),
            json(d.nameservers),
            val(d.lastFetchedAt),
            val(d.notes),
            val(d.created),
            val(d.updated),
          ],
        );
      }
      return domains.length;
    },
  },
];
