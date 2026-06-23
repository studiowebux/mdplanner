// Portfolio entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  auditCols,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { PortfolioRepository } from "../../repositories/portfolio.repository.ts";
import type {
  PortfolioItem,
  PortfolioStatus,
  TeamMember,
} from "../../types/portfolio.types.ts";
import { PORTFOLIO_SCHEMA, PORTFOLIO_TABLE } from "./constants.ts";

// Nullable [column, PortfolioItem key] mappings, copied verbatim by type.
const PORTFOLIO_STR_COLS: readonly (readonly [string, keyof PortfolioItem])[] =
  [
    ["description", "description"],
    ["client", "client"],
    ["start_date", "startDate"],
    ["end_date", "endDate"],
    ["logo", "logo"],
    ["license", "license"],
    ["github_repo", "githubRepo"],
    ["billing_customer_id", "billingCustomerId"],
    ["created_at", "createdAt"],
    ["updated_at", "updatedAt"],
    ["created_by", "createdBy"],
    ["updated_by", "updatedBy"],
  ];
const PORTFOLIO_NUM_COLS: readonly (readonly [string, keyof PortfolioItem])[] =
  [
    ["revenue", "revenue"],
    ["expenses", "expenses"],
    ["progress", "progress"],
  ];

/** Deserialize a SQLite row to a PortfolioItem. */
export function rowToPortfolioItem(
  row: Record<string, string | number | null>,
): PortfolioItem {
  const item: PortfolioItem = {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    status: row.status as PortfolioStatus,
  };
  applyPortfolioScalars(item, row);
  applyPortfolioJson(item, row);
  const archive = archiveFieldsFromRow(row);
  if (archive.archived !== undefined) item.archived = archive.archived;
  if (archive.archivedAt !== undefined) item.archivedAt = archive.archivedAt;
  if (archive.archivedBy !== undefined) item.archivedBy = archive.archivedBy;
  return item;
}

/** Copy the nullable scalar columns (string/number/bool) onto the item. */
function applyPortfolioScalars(
  item: PortfolioItem,
  row: Record<string, string | number | null>,
): void {
  const t = item as Record<string, unknown>;
  for (const [col, key] of PORTFOLIO_STR_COLS) {
    if (row[col] != null) t[key] = row[col] as string;
  }
  for (const [col, key] of PORTFOLIO_NUM_COLS) {
    if (row[col] != null) t[key] = row[col] as number;
  }
  if (row.brain_managed != null) item.brainManaged = row.brain_managed === 1;
}

/** Parse and assign the JSON-encoded columns onto the item. */
function applyPortfolioJson(
  item: PortfolioItem,
  row: Record<string, string | number | null>,
): void {
  const teamRaw = parseJson<unknown[]>(row.team);
  if (teamRaw) {
    item.team = teamRaw.map((m): TeamMember =>
      typeof m === "string" ? { personId: m } : m as TeamMember
    );
  }
  const techStack = parseJson<string[]>(row.tech_stack);
  if (techStack) item.techStack = techStack;
  const linkedGoals = parseJson<string[]>(row.linked_goals);
  if (linkedGoals) item.linkedGoals = linkedGoals;
  const kpis = parseJson<PortfolioItem["kpis"]>(row.kpis);
  if (kpis) item.kpis = kpis;
  const urls = parseJson<PortfolioItem["urls"]>(row.urls);
  if (urls) item.urls = urls;
  const badges = parseJson<PortfolioItem["badges"]>(row.badges);
  if (badges) item.badges = badges;
  const statusUpdates = parseJson<PortfolioItem["statusUpdates"]>(
    row.status_updates,
  );
  if (statusUpdates) item.statusUpdates = statusUpdates;
}

/** Insert or replace a PortfolioItem in the cache table. */
export function insertPortfolioRow(
  db: CacheDatabase,
  p: PortfolioItem,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${PORTFOLIO_TABLE} (id, name, category, status,
       description, client, revenue, expenses, progress, start_date, end_date,
       team, tech_stack, logo, license, github_repo, billing_customer_id,
       brain_managed, linked_goals, kpis, urls, badges, status_updates,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(p.id),
      val(p.name),
      val(p.category),
      val(p.status),
      val(p.description),
      val(p.client),
      p.revenue ?? null,
      p.expenses ?? null,
      p.progress ?? 0,
      val(p.startDate),
      val(p.endDate),
      json(p.team),
      json(p.techStack),
      val(p.logo),
      val(p.license),
      val(p.githubRepo),
      val(p.billingCustomerId),
      p.brainManaged != null ? (p.brainManaged ? 1 : 0) : null,
      json(p.linkedGoals),
      json(p.kpis),
      json(p.urls),
      json(p.badges),
      json(p.statusUpdates),
      ...archiveVals(p),
      ...auditVals(p),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the portfolio cache entity. Call from initServices(). */
export function registerPortfolioEntity(repo: PortfolioRepository): void {
  registerEntityCache({
    table: PORTFOLIO_TABLE,
    schema: PORTFOLIO_SCHEMA,
    migrations: [
      "ALTER TABLE portfolio ADD COLUMN github_repo TEXT",
      "ALTER TABLE portfolio ADD COLUMN billing_customer_id TEXT",
      "ALTER TABLE portfolio ADD COLUMN badges TEXT",
      ...archiveMigrations(PORTFOLIO_TABLE),
    ],
    fts: {
      type: "portfolio",
      columns: ["id", "name", "description"],
      titleCol: "name",
      contentCol: "description",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertPortfolioRow,
    onSyncComplete: () => repo.markClean(),
  });
}
