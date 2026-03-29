// Idea service — business logic over IdeaRepository.

import type { IdeaRepository } from "../repositories/idea.repository.ts";
import type {
  CreateIdea,
  Idea,
  IdeaWithBacklinks,
  ListIdeaOptions,
  UpdateIdea,
} from "../types/idea.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";

export class IdeaService {
  constructor(private repo: IdeaRepository) {}

  async list(options?: ListIdeaOptions): Promise<Idea[]> {
    let ideas = await this.repo.findAll();
    if (options?.status) {
      ideas = ideas.filter((i) => i.status === options.status);
    }
    if (options?.category) {
      ideas = ideas.filter((i) => ciEquals(i.category, options.category));
    }
    if (options?.priority) {
      ideas = ideas.filter((i) => i.priority === options.priority);
    }
    if (options?.q) {
      ideas = ideas.filter((i) =>
        ciIncludes(i.title, options.q!) ||
        ciIncludes(i.description, options.q!)
      );
    }
    return ideas;
  }

  async listWithBacklinks(): Promise<IdeaWithBacklinks[]> {
    return this.repo.findAllWithBacklinks();
  }

  async getById(id: string): Promise<Idea | null> {
    return this.repo.findById(id);
  }

  async getByName(name: string): Promise<Idea | null> {
    return this.repo.findByName(name);
  }

  async create(data: CreateIdea): Promise<Idea> {
    return this.repo.create(data);
  }

  async update(id: string, data: UpdateIdea): Promise<Idea | null> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async linkIdeas(id1: string, id2: string): Promise<boolean> {
    return this.repo.linkIdeas(id1, id2);
  }

  async unlinkIdeas(id1: string, id2: string): Promise<boolean> {
    return this.repo.unlinkIdeas(id1, id2);
  }
}
