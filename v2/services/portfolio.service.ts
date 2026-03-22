// Portfolio service — orchestrates repository + cache write-through.
// Consumed by API routes, MCP tools, and SSR views.

import type { PortfolioRepository } from "../repositories/portfolio.repository.ts";
import type {
  PortfolioItem,
  PortfolioStatusUpdate,
} from "../types/portfolio.types.ts";
import type { CacheSync } from "../database/sqlite/mod.ts";
import { insertPortfolioRow } from "../domains/portfolio/cache.ts";
import { PORTFOLIO_TABLE } from "../domains/portfolio/constants.ts";

export class PortfolioService {
  private cache: CacheSync | null = null;

  constructor(private repo: PortfolioRepository) {}

  setCache(cache: CacheSync): void {
    this.cache = cache;
  }

  private cacheUpsert(item: PortfolioItem): void {
    if (!this.cache) return;
    this.cache.remove(PORTFOLIO_TABLE, item.id);
    insertPortfolioRow(this.cache.getDb(), item);
  }

  async list(): Promise<PortfolioItem[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<PortfolioItem | null> {
    return this.repo.findById(id);
  }

  async getByName(name: string): Promise<PortfolioItem | null> {
    return this.repo.findByName(name);
  }

  async search(query: string): Promise<PortfolioItem[]> {
    return this.repo.search(query);
  }

  async create(
    data: Partial<PortfolioItem> & { name: string },
  ): Promise<PortfolioItem> {
    const item = await this.repo.create(data);
    this.cacheUpsert(item);
    return item;
  }

  async update(
    id: string,
    data: Partial<PortfolioItem>,
  ): Promise<PortfolioItem | null> {
    const item = await this.repo.update(id, data);
    if (item) this.cacheUpsert(item);
    return item;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted) this.cache?.remove(PORTFOLIO_TABLE, id);
    return deleted;
  }

  async addStatusUpdate(
    id: string,
    message: string,
  ): Promise<PortfolioStatusUpdate | null> {
    const update = await this.repo.addStatusUpdate(id, message);
    if (update) {
      const item = await this.repo.findById(id);
      if (item) this.cacheUpsert(item);
    }
    return update;
  }

  async deleteStatusUpdate(id: string, updateId: string): Promise<boolean> {
    const deleted = await this.repo.deleteStatusUpdate(id, updateId);
    if (deleted) {
      const item = await this.repo.findById(id);
      if (item) this.cacheUpsert(item);
    }
    return deleted;
  }
}
