// Journal service — business logic over JournalRepository.

import type { JournalRepository } from "../repositories/journal.repository.ts";
import type {
  CreateJournalEntry,
  JournalEntry,
  ListJournalOptions,
  UpdateJournalEntry,
} from "../types/journal.types.ts";
import {
  filterByDateRange,
  filterByQuery,
  filterByTag,
} from "../utils/list-filters.ts";
import { BaseService } from "./base.service.ts";

/** Journal CRUD service; filters by mood, tag, date range (from/to), and text query (q). */
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
    items = filterByTag(items, options.tag);
    items = filterByDateRange(items, options.from, options.to);
    items = filterByQuery(items, options.q, (e) => [e.title, e.content]);
    return items;
  }
}
