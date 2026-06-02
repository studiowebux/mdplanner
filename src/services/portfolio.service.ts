// Portfolio service — orchestrates repository + cache write-through.
// Consumed by API routes, MCP tools, and SSR views.

import type { CacheDatabase } from "../database/sqlite/mod.ts";
import type { PortfolioRepository } from "../repositories/portfolio.repository.ts";
import type {
  CreatePortfolioItem,
  PortfolioItem,
  PortfolioStatusUpdate,
  UpdatePortfolioItem,
} from "../types/portfolio.types.ts";
import { insertPortfolioRow } from "../domains/portfolio/cache.ts";
import { PORTFOLIO_TABLE } from "../domains/portfolio/constants.ts";
import { CachedService } from "./cached.service.ts";

export class PortfolioService extends CachedService<
  PortfolioItem,
  CreatePortfolioItem,
  UpdatePortfolioItem
> {
  protected readonly tableName = PORTFOLIO_TABLE;

  constructor(private portfolioRepo: PortfolioRepository) {
    super(portfolioRepo);
  }

  protected insertRow(db: CacheDatabase, item: PortfolioItem): void {
    insertPortfolioRow(db, item);
  }

  protected applyFilters(items: PortfolioItem[]): PortfolioItem[] {
    return items;
  }

  async search(query: string): Promise<PortfolioItem[]> {
    return this.portfolioRepo.search(query);
  }

  async addStatusUpdate(
    id: string,
    message: string,
  ): Promise<PortfolioStatusUpdate | null> {
    const update = await this.portfolioRepo.addStatusUpdate(id, message);
    if (update) await this.cacheRefreshFromDisk(id);
    return update;
  }

  async updateStatusUpdate(
    id: string,
    updateId: string,
    message: string,
  ): Promise<PortfolioStatusUpdate | null> {
    const update = await this.portfolioRepo.updateStatusUpdate(
      id,
      updateId,
      message,
    );
    if (update) await this.cacheRefreshFromDisk(id);
    return update;
  }

  async deleteStatusUpdate(id: string, updateId: string): Promise<boolean> {
    const deleted = await this.portfolioRepo.deleteStatusUpdate(id, updateId);
    if (deleted) await this.cacheRefreshFromDisk(id);
    return deleted;
  }

  /** Re-read from disk and upsert cache — avoids stale cache reads after sub-entity mutations. */
  private async cacheRefreshFromDisk(id: string): Promise<void> {
    this.cacheRemove(id);
    const fresh = await this.portfolioRepo.findFromDisk(id);
    if (fresh) this.cacheUpsert(fresh);
  }
}
