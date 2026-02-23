/**
 * SQLite Cache Schema
 * Pattern: Repository pattern - schema definition
 *
 * Delegates to ENTITIES registry. Adding a new entity requires
 * only a new entry in entities.ts — no changes here.
 */

import { CacheDatabase } from "./database.ts";
import { buildFtsDropSql, buildFtsSql, ENTITIES } from "./entities.ts";

/**
 * Initialize all cache tables.
 */
export function initSchema(db: CacheDatabase): void {
  for (const entity of ENTITIES) {
    db.exec(entity.schema);
  }
  for (const entity of ENTITIES) {
    if (entity.fts) {
      db.exec(buildFtsSql(entity));
    }
  }
  db.exec(INDEX_SQL);
  db.exec(META_SQL);
}

/**
 * Drop all tables (for rebuild).
 */
export function dropSchema(db: CacheDatabase): void {
  // Drop FTS triggers and tables first
  for (const entity of [...ENTITIES].reverse()) {
    if (entity.fts) {
      db.exec(buildFtsDropSql(entity));
    }
  }
  // Drop base tables in reverse order (respect FK deps)
  for (const entity of [...ENTITIES].reverse()) {
    db.exec(`DROP TABLE IF EXISTS ${entity.table}`);
  }
  db.exec("DROP TABLE IF EXISTS cache_meta");
}

// Indexes for common queries (cross-table, kept explicit)
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

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_start ON onboarding(start_date);
CREATE INDEX IF NOT EXISTS idx_financial_periods_period ON financial_periods(period);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_period ON kpi_snapshots(period);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);
`;

const META_SQL = `
CREATE TABLE IF NOT EXISTS cache_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`;
