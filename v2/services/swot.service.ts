// SWOT service — business logic over SwotRepository.

import type { SwotRepository } from "../repositories/swot.repository.ts";
import type {
  CreateSwot,
  ListSwotOptions,
  Swot,
  UpdateSwot,
} from "../types/swot.types.ts";

export class SwotService {
  constructor(private repo: SwotRepository) {}

  async list(options?: ListSwotOptions): Promise<Swot[]> {
    let items = await this.repo.findAll();
    if (options?.project) {
      const p = options.project.toLowerCase();
      items = items.filter((s) => s.project?.toLowerCase() === p);
    }
    if (options?.q) {
      const q = options.q.toLowerCase();
      items = items.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.strengths.some((i) => i.toLowerCase().includes(q)) ||
        s.weaknesses.some((i) => i.toLowerCase().includes(q)) ||
        s.opportunities.some((i) => i.toLowerCase().includes(q)) ||
        s.threats.some((i) => i.toLowerCase().includes(q)) ||
        (s.notes ?? "").toLowerCase().includes(q)
      );
    }
    return items;
  }

  async getById(id: string): Promise<Swot | null> {
    return this.repo.findById(id);
  }

  async getByName(name: string): Promise<Swot | null> {
    return this.repo.findByName(name);
  }

  async create(data: CreateSwot): Promise<Swot> {
    return this.repo.create(data);
  }

  async update(id: string, data: UpdateSwot): Promise<Swot | null> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
