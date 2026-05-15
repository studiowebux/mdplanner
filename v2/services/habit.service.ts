// Habit service — business logic over HabitRepository.

import type { HabitRepository } from "../repositories/habit.repository.ts";
import type {
  CompletionEntry,
  CreateHabit,
  Habit,
  ListHabitOptions,
  UpdateHabit,
} from "../types/habit.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

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

  async markComplete(id: string, date: string): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    if (!habit.completedDates.some((e) => e.date === date)) {
      habit.completedDates = [...habit.completedDates, { date }].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
    return this.habitRepo.update(id, { completedDates: habit.completedDates });
  }

  async unmarkComplete(id: string, date: string): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    habit.completedDates = habit.completedDates.filter((e) => e.date !== date);
    return this.habitRepo.update(id, { completedDates: habit.completedDates });
  }

  async toggleDate(
    id: string,
    date: string,
    note?: string,
  ): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    const exists = habit.completedDates.some((e) => e.date === date);
    if (exists) {
      habit.completedDates = habit.completedDates.filter((e) =>
        e.date !== date
      );
    } else {
      const entry: CompletionEntry = { date };
      if (note) entry.note = note;
      habit.completedDates = [...habit.completedDates, entry].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
    return this.habitRepo.update(id, { completedDates: habit.completedDates });
  }

  async checkToday(id: string, note?: string): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    const today = new Date().toLocaleDateString("en-CA");
    const existing = habit.completedDates.find((e) => e.date === today);
    if (existing) {
      existing.note = note || existing.note;
    } else {
      const entry: CompletionEntry = { date: today };
      if (note) entry.note = note;
      habit.completedDates = [...habit.completedDates, entry].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
    return this.habitRepo.update(id, { completedDates: habit.completedDates });
  }

  async deleteCompletion(id: string, date: string): Promise<Habit | null> {
    const habit = await this.habitRepo.findById(id);
    if (!habit) return null;
    habit.completedDates = habit.completedDates.filter((e) => e.date !== date);
    return this.habitRepo.update(id, { completedDates: habit.completedDates });
  }
}
