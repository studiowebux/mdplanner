// Portfolio entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, json, parseJson, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { PortfolioRepository } from "../../repositories/portfolio.repository.ts";
import type { PortfolioItem } from "../../types/portfolio.types.ts";
import { PORTFOLIO_SCHEMA, PORTFOLIO_TABLE } from "./constants.ts";

/** Deserialize a SQLite row to a PortfolioItem. */
export function rowToPortfolioItem(
  row: Record<string, unknown>,
): PortfolioItem {
  const item: PortfolioItem = {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    status: row.status as string,
  };
  if (row.description != null) item.description = row.description as string;
  if (row.client != null) item.client = row.client as string;
  if (row.revenue != null) item.revenue = row.revenue as number;
  if (row.expenses != null) item.expenses = row.expenses as number;
  if (row.progress != null) item.progress = row.progress as number;
  if (row.start_date != null) item.startDate = row.start_date as string;
  if (row.end_date != null) item.endDate = row.end_date as string;
  const team = parseJson<string[]>(row.team);
  if (team) item.team = team;
  const techStack = parseJson<string[]>(row.tech_stack);
  if (techStack) item.techStack = techStack;
  if (row.logo != null) item.logo = row.logo as string;
  if (row.license != null) item.license = row.license as string;
  if (row.github_repo != null) item.githubRepo = row.github_repo as string;
  if (row.billing_customer_id != null) {
    item.billingCustomerId = row.billing_customer_id as string;
  }
  if (row.brain_managed != null) item.brainManaged = row.brain_managed === 1;
  const linkedGoals = parseJson<string[]>(row.linked_goals);
  if (linkedGoals) item.linkedGoals = linkedGoals;
  const kpis = parseJson<PortfolioItem["kpis"]>(row.kpis);
  if (kpis) item.kpis = kpis;
  const urls = parseJson<PortfolioItem["urls"]>(row.urls);
  if (urls) item.urls = urls;
  const statusUpdates = parseJson<PortfolioItem["statusUpdates"]>(
    row.status_updates,
  );
  if (statusUpdates) item.statusUpdates = statusUpdates;
  return item;
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
       brain_managed, linked_goals, kpis, urls, status_updates, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      json(p.statusUpdates),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the portfolio cache entity. Call from initServices(). */
export function registerPortfolioEntity(repo: PortfolioRepository): void {
  const entity: EntityDef = {
    table: PORTFOLIO_TABLE,
    schema: PORTFOLIO_SCHEMA,
    fts: {
      type: "portfolio",
      columns: ["id", "name", "description"],
      titleCol: "name",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const p of items) insertPortfolioRow(db, p, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
