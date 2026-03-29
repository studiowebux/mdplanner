// SWOT service — business logic over SwotRepository.

import type { SwotRepository } from "../repositories/swot.repository.ts";
import type {
  CreateSwot,
  ListSwotOptions,
  Swot,
  UpdateSwot,
} from "../types/swot.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";

export class SwotService {
  constructor(private repo: SwotRepository) {}

  async list(options?: ListSwotOptions): Promise<Swot[]> {
    let items = await this.repo.findAll();
    if (options?.project) {
      items = items.filter((s) => ciEquals(s.project, options.project));
    }
    if (options?.q) {
      const q = options.q!;
      items = items.filter((s) =>
        ciIncludes(s.title, q) ||
        s.strengths.some((i) => ciIncludes(i, q)) ||
        s.weaknesses.some((i) => ciIncludes(i, q)) ||
        s.opportunities.some((i) => ciIncludes(i, q)) ||
        s.threats.some((i) => ciIncludes(i, q)) ||
        ciIncludes(s.notes, q)
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
