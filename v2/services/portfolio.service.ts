import type { PortfolioRepository } from "../repositories/portfolio.repository.ts";
import type { PortfolioItem, PortfolioStatusUpdate } from "../types/portfolio.types.ts";

export class PortfolioService {
  constructor(private repo: PortfolioRepository) {}

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

  async create(data: Partial<PortfolioItem> & { name: string }): Promise<PortfolioItem> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<PortfolioItem>): Promise<PortfolioItem | null> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async addStatusUpdate(id: string, message: string): Promise<PortfolioStatusUpdate | null> {
    return this.repo.addStatusUpdate(id, message);
  }

  async deleteStatusUpdate(id: string, updateId: string): Promise<boolean> {
    return this.repo.deleteStatusUpdate(id, updateId);
  }
}
