/**
 * Cache Sync Engine
 * Pattern: Observer pattern - syncs markdown changes to SQLite cache
 *
 * Handles full and incremental synchronization from markdown
 * files (source of truth) to SQLite cache.
 */

import { type BindValue, CacheDatabase } from "./database.ts";
import { dropSchema, initSchema } from "./schema.ts";
import type { DirectoryMarkdownParser } from "../parser/directory/parser.ts";

// Helper to safely extract values for SQL binding
// deno-lint-ignore no-explicit-any
function val(v: any): BindValue {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return v;
  if (v instanceof Uint8Array) return v;
  return String(v);
}

// deno-lint-ignore no-explicit-any
function json(v: any): string {
  return JSON.stringify(v ?? []);
}

export interface SyncResult {
  tables: number;
  items: number;
  duration: number;
  errors: string[];
}

export interface SyncOptions {
  tables?: string[]; // Specific tables to sync, or all if empty
  force?: boolean; // Force rebuild even if cache exists
}

/**
 * Synchronizes markdown data to SQLite cache.
 */
export class CacheSync {
  private lastSyncTime: Date | null = null;

  constructor(
    private parser: DirectoryMarkdownParser,
    private db: CacheDatabase,
  ) {}

  /**
   * Initialize cache schema.
   */
  init(): void {
    initSchema(this.db);
    this.setMeta("initialized", new Date().toISOString());
  }

  /**
   * Full sync: rebuild entire cache from markdown in a single transaction.
   * If any table fails, the entire sync is rolled back so the cache
   * never lands in a partially-synced state.
   */
  async fullSync(options?: SyncOptions): Promise<SyncResult> {
    const start = Date.now();
    const result: SyncResult = { tables: 0, items: 0, duration: 0, errors: [] };
    const tables = options?.tables ?? ALL_TABLES;

    this.db.exec("BEGIN TRANSACTION");
    try {
      for (const table of tables) {
        const count = await this.syncTable(table);
        result.tables++;
        result.items += count;
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      result.errors.push(`sync rolled back: ${error}`);
      result.duration = Date.now() - start;
      return result;
    }

    this.lastSyncTime = new Date();
    this.setMeta("last_sync", this.lastSyncTime.toISOString());
    result.duration = Date.now() - start;

    return result;
  }

  /**
   * Rebuild cache: drop and recreate all tables.
   */
  async rebuild(): Promise<SyncResult> {
    dropSchema(this.db);
    initSchema(this.db);
    return this.fullSync({ force: true });
  }

  /**
   * Sync a single table.
   */
  private async syncTable(table: string): Promise<number> {
    const syncer = TABLE_SYNCERS[table];
    if (!syncer) {
      throw new Error(`Unknown table: ${table}`);
    }
    return syncer(this.parser, this.db);
  }

  /**
   * Get last sync time.
   */
  getLastSyncTime(): Date | null {
    if (this.lastSyncTime) return this.lastSyncTime;
    const meta = this.getMeta("last_sync");
    return meta ? new Date(meta) : null;
  }

  /**
   * Check if cache needs sync.
   * Returns true if a successful full sync has never been recorded.
   */
  needsSync(): boolean {
    return this.getMeta("last_sync") === null;
  }

  /**
   * Set metadata value.
   */
  private setMeta(key: string, value: string): void {
    this.db.execute(
      "INSERT OR REPLACE INTO cache_meta (key, value, updated_at) VALUES (?, ?, ?)",
      [key, value, new Date().toISOString()],
    );
  }

  /**
   * Get metadata value.
   */
  private getMeta(key: string): string | null {
    const row = this.db.queryOne<{ value: string }>(
      "SELECT value FROM cache_meta WHERE key = ?",
      [key],
    );
    return row?.value ?? null;
  }
}

// All syncable tables
const ALL_TABLES = [
  "tasks",
  "notes",
  "goals",
  "milestones",
  "ideas",
  "retrospectives",
  "sticky_notes",
  "mindmaps",
  "c4_components",
  "swot",
  "risk",
  "lean_canvas",
  "business_model",
  "project_value",
  "brief",
  "capacity_plans",
  "strategic_builders",
  "customers",
  "rates",
  "quotes",
  "invoices",
  "companies",
  "contacts",
  "deals",
  "interactions",
  "portfolio",
  "org_members",
  "people",
  "meetings",
];

// Table-specific sync functions
type TableSyncer = (
  parser: DirectoryMarkdownParser,
  db: CacheDatabase,
) => Promise<number>;

const TABLE_SYNCERS: Record<string, TableSyncer> = {
  tasks: async (parser, db) => {
    const tasks = await parser.readTasks();
    db.execute("DELETE FROM tasks");
    let count = 0;
    // deno-lint-ignore no-explicit-any
    const insertTask = (task: any, parentId?: string) => {
      const config = task.config ?? {};
      db.execute(
        `INSERT INTO tasks (id, title, completed, section, description, tags, due_date, assignee, priority, effort, milestone, blocked_by, planned_start, planned_end, parent_id, config)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          val(task.id),
          val(task.title),
          task.completed ? 1 : 0,
          val(task.section),
          Array.isArray(task.description) ? task.description.join("\n") : null,
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

  notes: async (parser, db) => {
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

  goals: async (parser, db) => {
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

  milestones: async (parser, db) => {
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

  ideas: async (parser, db) => {
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

  retrospectives: async (parser, db) => {
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

  sticky_notes: async (parser, db) => {
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

  mindmaps: async (parser, db) => {
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

  c4_components: async (parser, db) => {
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

  swot: async (parser, db) => {
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

  risk: async (parser, db) => {
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

  lean_canvas: async (parser, db) => {
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

  business_model: async (parser, db) => {
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

  project_value: async (parser, db) => {
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

  brief: async (parser, db) => {
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

  capacity_plans: async (parser, db) => {
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

  strategic_builders: async (parser, db) => {
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

  customers: async (parser, db) => {
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

  rates: async (parser, db) => {
    // Rates may not exist in all projects
    try {
      // deno-lint-ignore no-explicit-any
      const rates = await (parser as any).readRates?.() ?? [];
      db.execute("DELETE FROM rates");
      for (const r of rates) {
        db.execute(
          `INSERT INTO rates (id, name, type, amount, currency, description) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            val(r.id),
            val(r.name),
            val(r.type),
            val(r.amount),
            val(r.currency),
            val(r.description),
          ],
        );
      }
      return rates.length;
    } catch {
      return 0;
    }
  },

  quotes: async (parser, db) => {
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
          val(quote.date),
          val(quote.validUntil),
          json(quote.lineItems),
          val(quote.notes),
          val(quote.total),
        ],
      );
    }
    return quotes.length;
  },

  invoices: async (parser, db) => {
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
          val(inv.date),
          val(inv.dueDate),
          json(inv.lineItems),
          val(inv.notes),
          val(inv.total),
        ],
      );
    }
    return invoices.length;
  },

  companies: async (parser, db) => {
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

  contacts: async (parser, db) => {
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

  deals: async (parser, db) => {
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

  interactions: async (parser, db) => {
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

  portfolio: async (parser, db) => {
    const items = await parser.readPortfolioItems();
    db.execute("DELETE FROM portfolio");
    for (const p of items) {
      db.execute(
        `INSERT INTO portfolio (id, name, category, status, client, revenue, expenses, progress, start_date, end_date, team, kpis)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ],
      );
    }
    return items.length;
  },

  people: async (parser, db) => {
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

  meetings: async (parser, db) => {
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

  org_members: async (parser, db) => {
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
};
