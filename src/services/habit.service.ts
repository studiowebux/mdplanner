// Habit service — business logic over HabitRepository.
//
// Completions are scoped per user. Each CompletionEntry carries a userId; a
// UserScope (resolved from the request actor) gates which entries a caller can
// read and mutate. Legacy entries written before per-user scoping have no
// userId — they are owned by the project's default user, so a scope with
// isDefault=true sees and can mutate them (lazy migration: they stay untagged
// in storage until rewritten, but render and aggregate correctly per user).

import type { HabitRepository } from "../repositories/habit.repository.ts";
import type {
  CompletionEntry,
  CreateHabit,
  Habit,
  ListHabitOptions,
  UpdateHabit,
} from "../types/habit.types.ts";
import type { UserScope } from "../utils/actor.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Habit service: CRUD plus per-user completion tracking (markComplete/unmarkComplete/toggleDate/checkToday); filters by frequency, tag, and text query (q). */
export class HabitService extends BaseService<
  Habit,
  CreateHabit,
  UpdateHabit,
  ListHabitOptions
> {
  constructor(private readonly habitRepo: HabitRepository) {
    super(habitRepo);
  }

  protected applyFilters(items: Habit[], options: ListHabitOptions): Habit[] {
    if (options.frequency) {
      items = items.filter((h) => h.frequency === options.frequency);
    }
    if (options.tag) {
      const tag = options.tag;
      items = items.filter((h) => h.tags?.includes(tag));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (h) =>
          ciIncludes(h.title, q) ||
          ciIncludes(h.description, q),
      );
    }
    return items;
  }

  // ── per-user scoping ──────────────────────────────────────────────────────

  /** Whether a completion entry belongs to the scoped user. */
  private ownedBy(entry: CompletionEntry, scope: UserScope): boolean {
    return entry.userId === scope.userId ||
      (entry.userId == null && scope.isDefault);
  }

  /** A view of the habit with completions filtered to the scoped user. */
  private filterForUser(habit: Habit, scope: UserScope): Habit {
    return {
      ...habit,
      completedDates: habit.completedDates.filter((e) =>
        this.ownedBy(e, scope)
      ),
    };
  }

  /** Get a habit with its completions scoped to the user. */
  async getForUser(id: string, scope: UserScope): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    return this.filterForUser(habit, scope);
  }

  /** List habits with each one's completions scoped to the user. */
  async listForUser(
    options: ListHabitOptions,
    scope: UserScope,
  ): Promise<Habit[]> {
    const items = await this.list(options);
    return items.map((h) => this.filterForUser(h, scope));
  }

  // ── completion mutations (scoped) ───────────────────────────────────────

  async markComplete(
    id: string,
    date: string,
    scope: UserScope,
  ): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    const exists = habit.completedDates.some((e) =>
      e.date === date && this.ownedBy(e, scope)
    );
    if (!exists) {
      habit.completedDates = [
        ...habit.completedDates,
        { date, userId: scope.userId },
      ].sort((a, b) => a.date.localeCompare(b.date));
      await this.update(id, {
        completedDates: habit.completedDates,
      });
    }
    return this.getForUser(id, scope);
  }

  async unmarkComplete(
    id: string,
    date: string,
    scope: UserScope,
  ): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    habit.completedDates = habit.completedDates.filter((e) =>
      !(e.date === date && this.ownedBy(e, scope))
    );
    await this.update(id, { completedDates: habit.completedDates });
    return this.getForUser(id, scope);
  }

  async toggleDate(
    id: string,
    date: string,
    scope: UserScope,
    note?: string,
  ): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    const exists = habit.completedDates.some((e) =>
      e.date === date && this.ownedBy(e, scope)
    );
    if (exists) {
      habit.completedDates = habit.completedDates.filter((e) =>
        !(e.date === date && this.ownedBy(e, scope))
      );
    } else {
      const entry: CompletionEntry = { date, userId: scope.userId };
      if (note) entry.note = note;
      habit.completedDates = [...habit.completedDates, entry].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
    await this.update(id, { completedDates: habit.completedDates });
    return this.getForUser(id, scope);
  }

  async checkToday(
    id: string,
    scope: UserScope,
    note?: string,
  ): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    const today = new Date().toLocaleDateString("en-CA");
    const existing = habit.completedDates.find((e) =>
      e.date === today && this.ownedBy(e, scope)
    );
    if (existing) {
      existing.note = note || existing.note;
    } else {
      const entry: CompletionEntry = { date: today, userId: scope.userId };
      if (note) entry.note = note;
      habit.completedDates = [...habit.completedDates, entry].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
    await this.update(id, { completedDates: habit.completedDates });
    return this.getForUser(id, scope);
  }

  async deleteCompletion(
    id: string,
    date: string,
    scope: UserScope,
  ): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    habit.completedDates = habit.completedDates.filter((e) =>
      !(e.date === date && this.ownedBy(e, scope))
    );
    await this.update(id, { completedDates: habit.completedDates });
    return this.getForUser(id, scope);
  }
}
