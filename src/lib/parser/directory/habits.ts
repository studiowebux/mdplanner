/**
 * Directory-based parser for Habits.
 * Each habit is stored as a separate markdown file under habits/.
 * Streak logic is calculated server-side on every read/write.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Habit } from "../../types.ts";

interface HabitFrontmatter {
  id: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekly";
  target_days?: string[];
  completions?: string[];
  streak_count?: number;
  longest_streak?: number;
  created: string;
  updated: string;
}

// ---------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns the ISO 8601 week string "YYYY-Www" for a given date.
 * ISO weeks start on Monday; week 1 contains January 4.
 */
function getISOWeek(d: Date): string {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Move to nearest Thursday (which defines the ISO week year)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Returns the Monday Date for an ISO week string "YYYY-Www".
 */
function weekToMonday(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7; // 0 = Mon
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7);
  return monday;
}

// ---------------------------------------------------------------
// Streak calculation
// ---------------------------------------------------------------

function calculateDailyStreaks(
  completions: string[],
): { streakCount: number; longestStreak: number } {
  if (completions.length === 0) return { streakCount: 0, longestStreak: 0 };

  const sorted = [...completions].sort().reverse(); // descending
  const today = toISODate(new Date());
  const yesterday = toISODate(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );

  // Current streak: active only if most recent completion is today or yesterday
  let streakCount = 0;
  if (sorted[0] === today || sorted[0] === yesterday) {
    streakCount = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = parseLocalDate(sorted[i - 1]);
      const curr = parseLocalDate(sorted[i]);
      const diff = Math.round(
        (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (diff === 1) {
        streakCount++;
      } else {
        break;
      }
    }
  }

  // Longest streak across all history
  let longestStreak = 0;
  let currentRun = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseLocalDate(sorted[i - 1]);
    const curr = parseLocalDate(sorted[i]);
    const diff = Math.round(
      (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diff === 1) {
      currentRun++;
    } else {
      if (currentRun > longestStreak) longestStreak = currentRun;
      currentRun = 1;
    }
  }
  if (currentRun > longestStreak) longestStreak = currentRun;

  return { streakCount, longestStreak };
}

function calculateWeeklyStreaks(
  completions: string[],
): { streakCount: number; longestStreak: number } {
  if (completions.length === 0) return { streakCount: 0, longestStreak: 0 };

  const weeks = [
    ...new Set(
      completions.map((d) => getISOWeek(parseLocalDate(d))),
    ),
  ].sort().reverse(); // descending

  if (weeks.length === 0) return { streakCount: 0, longestStreak: 0 };

  const currentWeek = getISOWeek(new Date());
  const lastWeek = getISOWeek(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );

  // Current streak: active if most recent week is this week or last week
  let streakCount = 0;
  if (weeks[0] === currentWeek || weeks[0] === lastWeek) {
    streakCount = 1;
    for (let i = 1; i < weeks.length; i++) {
      const prev = weekToMonday(weeks[i - 1]);
      const curr = weekToMonday(weeks[i]);
      const diff = Math.round(
        (prev.getTime() - curr.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      if (diff === 1) {
        streakCount++;
      } else {
        break;
      }
    }
  }

  // Longest streak across all history
  let longestStreak = 0;
  let currentRun = 1;
  for (let i = 1; i < weeks.length; i++) {
    const prev = weekToMonday(weeks[i - 1]);
    const curr = weekToMonday(weeks[i]);
    const diff = Math.round(
      (prev.getTime() - curr.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    if (diff === 1) {
      currentRun++;
    } else {
      if (currentRun > longestStreak) longestStreak = currentRun;
      currentRun = 1;
    }
  }
  if (currentRun > longestStreak) longestStreak = currentRun;

  return { streakCount, longestStreak };
}

export function calculateStreaks(
  frequency: "daily" | "weekly",
  completions: string[],
): { streakCount: number; longestStreak: number } {
  if (frequency === "weekly") {
    return calculateWeeklyStreaks(completions);
  }
  return calculateDailyStreaks(completions);
}

// ---------------------------------------------------------------
// Parser
// ---------------------------------------------------------------

export class HabitsDirectoryParser extends DirectoryParser<Habit> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "habits" });
  }

  protected parseFile(content: string, _filePath: string): Habit | null {
    const { frontmatter, content: body } = parseFrontmatter<HabitFrontmatter>(
      content,
    );

    if (!frontmatter.id) return null;

    const completions = frontmatter.completions ?? [];
    const frequency = frontmatter.frequency ?? "daily";
    const { streakCount, longestStreak } = calculateStreaks(
      frequency,
      completions,
    );

    return {
      id: frontmatter.id,
      name: frontmatter.name || "",
      description: frontmatter.description,
      frequency,
      targetDays: frontmatter.target_days,
      completions,
      streakCount,
      longestStreak,
      notes: body.trim() || undefined,
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated || new Date().toISOString(),
    };
  }

  protected serializeItem(habit: Habit): string {
    const frontmatter: HabitFrontmatter = {
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      completions: habit.completions,
      streak_count: habit.streakCount,
      longest_streak: habit.longestStreak,
      created: habit.created,
      updated: habit.updated,
    };

    if (habit.description) frontmatter.description = habit.description;
    if (habit.targetDays && habit.targetDays.length > 0) {
      frontmatter.target_days = habit.targetDays;
    }

    return buildFileContent(frontmatter, habit.notes ?? "");
  }

  async add(
    habit: Omit<
      Habit,
      "id" | "created" | "updated" | "streakCount" | "longestStreak"
    >,
  ): Promise<Habit> {
    const now = new Date().toISOString();
    const completions = habit.completions ?? [];
    const { streakCount, longestStreak } = calculateStreaks(
      habit.frequency,
      completions,
    );
    const newHabit: Habit = {
      ...habit,
      id: this.generateId("habit"),
      completions,
      streakCount,
      longestStreak,
      created: now,
      updated: now,
    };
    await this.write(newHabit);
    return newHabit;
  }

  async update(
    id: string,
    updates: Partial<Habit>,
  ): Promise<Habit | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const completions = updates.completions ?? existing.completions;
    const frequency = updates.frequency ?? existing.frequency;
    const { streakCount, longestStreak } = calculateStreaks(
      frequency,
      completions,
    );

    const updated: Habit = {
      ...existing,
      ...updates,
      id: existing.id,
      completions,
      streakCount,
      longestStreak,
      created: existing.created,
      updated: new Date().toISOString(),
    };
    await this.write(updated);
    return updated;
  }

  async markComplete(id: string, date?: string): Promise<Habit | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const targetDate = date ?? toISODate(new Date());
    // Idempotent: deduplicate, sort descending
    const completions = [
      ...new Set([...existing.completions, targetDate]),
    ].sort().reverse();

    return this.update(id, { completions });
  }

  async unmarkComplete(id: string, date: string): Promise<Habit | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const completions = existing.completions.filter((d) => d !== date);
    return this.update(id, { completions });
  }
}
