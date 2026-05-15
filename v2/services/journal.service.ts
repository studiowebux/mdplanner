// Journal service — business logic over JournalRepository.

import type { JournalRepository } from "../repositories/journal.repository.ts";
import type {
  CreateJournalEntry,
  JournalEntry,
  ListJournalOptions,
  UpdateJournalEntry,
} from "../types/journal.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class JournalService extends BaseService<
  JournalEntry,
  CreateJournalEntry,
  UpdateJournalEntry,
  ListJournalOptions
> {
  constructor(repo: JournalRepository) {
    super(repo);
  }

  protected applyFilters(
    items: JournalEntry[],
    options: ListJournalOptions,
  ): JournalEntry[] {
    if (options.mood) {
      items = items.filter((e) => e.mood === options.mood);
    }
    if (options.tag) {
      const tag = options.tag;
      items = items.filter((e) => e.tags?.includes(tag));
    }
    if (options.from) {
      const from = options.from;
      items = items.filter((e) => e.date >= from);
    }
    if (options.to) {
      const to = options.to;
      items = items.filter((e) => e.date <= to);
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (e) =>
          ciIncludes(e.title, q) ||
          ciIncludes(e.content, q),
      );
    }
    return items;
  }
}
