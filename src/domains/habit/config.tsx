// Habit domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateHabit,
  Habit,
  UpdateHabit,
} from "../../types/habit.types.ts";
import { getHabitService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  HABIT_FORM_FIELDS,
  HABIT_TABLE_COLUMNS,
  habitToRow,
} from "./constants.tsx";
import { HabitCard } from "../../views/components/habit-card.tsx";
import { HabitHeatmap } from "../../views/habits/components/habit-heatmap.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import { resolveUserScope } from "../../utils/actor.ts";

export const habitConfig: DomainConfig<Habit, CreateHabit, UpdateHabit> = {
  name: "habits",
  singular: "Habit",
  plural: "Habits",
  path: "/habits",
  ssePrefix: "habit",
  styles: ["/css/views/habits.css"],
  scripts: ["/js/habits-heatmap.js", "/js/habits-toggle.js"],
  emptyMessage: "No habits yet. Create one to get started.",
  defaultView: "grid",

  stateKeys: ["view", "frequency", "q", "sort", "order"],
  columns: HABIT_TABLE_COLUMNS,
  formFields: HABIT_FORM_FIELDS,
  // `description` (rendered as "Notes") is edited in-place on the detail page.
  inlineEditFields: ["description"],

  filters: [
    {
      name: "frequency",
      label: "All frequencies",
      options: [],
    },
  ],

  // Per-user scoping: the list grid + heatmap show only the current user's
  // completions. Both go through listForUser so streaks/this-month/today on
  // each card and the heatmap reflect the acting user, not all users combined.
  listForRequest: async (c) => {
    const scope = await resolveUserScope(c);
    return getHabitService().listForUser({}, scope);
  },

  topSlot: async (c) => {
    const scope = await resolveUserScope(c);
    const habits = await getHabitService().listForUser({}, scope);
    return <HabitHeatmap habits={habits} />;
  },

  toRow: habitToRow,

  Card: ({ item, q }) => <HabitCard item={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(HABIT_FORM_FIELDS, body) as CreateHabit;
    return {
      ...parsed,
      targetPerPeriod: parsed.targetPerPeriod != null
        ? Number(parsed.targetPerPeriod)
        : 1,
    };
  },

  parseUpdate: (body) => {
    const parsed = parseFormBody(HABIT_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateHabit>;
    if (parsed.targetPerPeriod !== undefined) {
      parsed.targetPerPeriod = Number(parsed.targetPerPeriod);
    }
    return parsed;
  },

  getService: () => getHabitService(),

  extractFilterOptions: async () => {
    const items = await getHabitService().list();
    const frequencies = [
      ...new Set(items.map((h) => h.frequency).filter(Boolean) as string[]),
    ].sort();
    return { frequency: frequencies };
  },

  searchPredicate: createSearchPredicate<Habit>([
    { type: "string", get: (h) => h.title },
    { type: "string", get: (h) => h.description },
  ]),
};
