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
import { BaseService } from "./base.service.ts";

export class IdeaService extends BaseService<
  Idea,
  CreateIdea,
  UpdateIdea,
  ListIdeaOptions
> {
  constructor(private ideaRepo: IdeaRepository) {
    super(ideaRepo);
  }

  protected applyFilters(ideas: Idea[], options: ListIdeaOptions): Idea[] {
    if (options.status) {
      ideas = ideas.filter((i) => i.status === options.status);
    }
    if (options.category) {
      ideas = ideas.filter((i) => ciEquals(i.category, options.category));
    }
    if (options.priority) {
      ideas = ideas.filter((i) => i.priority === options.priority);
    }
    if (options.q) {
      ideas = ideas.filter((i) =>
        ciIncludes(i.title, options.q!) ||
        ciIncludes(i.description, options.q!)
      );
    }
    return ideas;
  }

  async listWithBacklinks(): Promise<IdeaWithBacklinks[]> {
    return this.ideaRepo.findAllWithBacklinks();
  }

  async linkIdeas(id1: string, id2: string): Promise<boolean> {
    return this.ideaRepo.linkIdeas(id1, id2);
  }

  async unlinkIdeas(id1: string, id2: string): Promise<boolean> {
    return this.ideaRepo.unlinkIdeas(id1, id2);
  }
}
