import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { CompletionEntry, Habit } from "../../types/habit.types.ts";
import {
  HABIT_FREQUENCIES,
  HABIT_FREQUENCY_LABELS,
} from "../../types/habit.types.ts";
import { Highlight } from "../../utils/highlight.tsx";
import type { BadgeVariant } from "../../components/ui/status-badge.tsx";

// ---------------------------------------------------------------------------
// Frequency badge variants
// ---------------------------------------------------------------------------

export const HABIT_FREQUENCY_VARIANTS: Record<string, BadgeVariant> = {
  daily: "success",
  weekly: "teal",
  monthly: "warning",
};

// ---------------------------------------------------------------------------
// Frequency filter options
// ---------------------------------------------------------------------------

export const HABIT_FREQUENCY_OPTIONS = HABIT_FREQUENCIES.map((f) => ({
  value: f,
  label: HABIT_FREQUENCY_LABELS[f],
}));

// ---------------------------------------------------------------------------
// Streak computation
// ---------------------------------------------------------------------------

/** Returns the current streak count based on frequency and completedDates. */
export function computeStreak(
  completedDates: CompletionEntry[],
  frequency: Habit["frequency"],
): number {
  if (!completedDates || completedDates.length === 0) return 0;

  const sorted = completedDates.map((e) => e.date).sort().reverse();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (frequency === "daily") {
    let streak = 0;
    let cursor = new Date(today);
    for (const date of sorted) {
      const d = new Date(date + "T00:00:00Z");
      const diff = Math.round(
        (cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diff === 0 || diff === 1) {
        streak++;
        cursor = d;
      } else {
        break;
      }
    }
    return streak;
  }

  if (frequency === "weekly") {
    const getWeek = (d: Date): number => {
      const start = new Date(d);
      start.setUTCDate(start.getUTCDate() - start.getUTCDay());
      return Math.floor(start.getTime() / (1000 * 60 * 60 * 24 * 7));
    };
    let streak = 0;
    let cursorWeek = getWeek(today);
    const seenWeeks = new Set(
      sorted.map((d) => getWeek(new Date(d + "T00:00:00Z"))),
    );
    while (seenWeeks.has(cursorWeek) || seenWeeks.has(cursorWeek - 1)) {
      if (seenWeeks.has(cursorWeek)) {
        streak++;
        cursorWeek--;
      } else {
        break;
      }
    }
    return streak;
  }

  // monthly
  const getYearMonth = (d: Date): number =>
    d.getUTCFullYear() * 12 + d.getUTCMonth();
  let streak = 0;
  let cursorYM = getYearMonth(today);
  const seenMonths = new Set(
    sorted.map((d) => getYearMonth(new Date(d + "T00:00:00Z"))),
  );
  while (seenMonths.has(cursorYM) || seenMonths.has(cursorYM - 1)) {
    if (seenMonths.has(cursorYM)) {
      streak++;
      cursorYM--;
    } else {
      break;
    }
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Derived stats helpers
// ---------------------------------------------------------------------------

export function computeLongestStreak(
  completedDates: CompletionEntry[],
  frequency: Habit["frequency"],
): number {
  if (!completedDates || completedDates.length === 0) return 0;
  const sorted = completedDates.map((e) => e.date).sort();
  let longest = 0;
  let current = 0;

  if (frequency === "daily") {
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) {
        current = 1;
      } else {
        const prev = new Date(sorted[i - 1] + "T00:00:00Z");
        const curr = new Date(sorted[i] + "T00:00:00Z");
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        current = diff === 1 ? current + 1 : 1;
      }
      if (current > longest) longest = current;
    }
    return longest;
  }

  // For weekly/monthly, reuse computeStreak logic on each contiguous window
  return computeStreak(completedDates, frequency);
}

export function computeThisMonth(completedDates: CompletionEntry[]): number {
  const now = new Date();
  const ym = `${now.getFullYear()}-${
    String(now.getMonth() + 1).padStart(2, "0")
  }`;
  return completedDates.filter((e) => e.date.startsWith(ym)).length;
}

export function lastCompleted(completedDates: CompletionEntry[]): string {
  if (!completedDates || completedDates.length === 0) return "—";
  return [...completedDates].sort((a, b) => b.date.localeCompare(a.date))[0]
    .date;
}

export function isDoneToday(completedDates: CompletionEntry[]): boolean {
  const today = new Date().toLocaleDateString("en-CA");
  return completedDates.some((e) => e.date === today);
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const HABIT_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/habits/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "description", label: "Notes", sortable: false },
  { key: "frequency", label: "Frequency", sortable: true },
  { key: "streak", label: "Streak", sortable: true },
  { key: "thisMonth", label: "This month", sortable: false },
  { key: "lastDone", label: "Last done", sortable: true },
  {
    key: "doneToday",
    label: "Today",
    sortable: false,
    render: (v) => <span>{v === "true" ? "✓" : "—"}</span>,
  },
  {
    key: "_actions",
    label: "",
    render: (_v, row) => {
      const id = row.id as string;
      return (
        <div class="card__actions">
          <a href={`/habits/${id}`} class="btn btn--secondary btn--sm">
            View
          </a>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            hx-get={`/habits/${id}/edit`}
            hx-target="#habits-form-container"
            hx-swap="innerHTML"
          >
            Edit
          </button>
          <button
            type="button"
            class="btn btn--danger btn--sm"
            hx-delete={`/habits/${id}`}
            hx-confirm={`Delete "${row.title}"? This cannot be undone.`}
            hx-swap="none"
          >
            Delete
          </button>
        </div>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const HABIT_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "select",
    name: "frequency",
    label: "Frequency",
    required: true,
    options: HABIT_FREQUENCY_OPTIONS,
  },
  {
    type: "text",
    name: "targetPerPeriod",
    label: "Target per period",
    placeholder: "1",
  },
  {
    type: "text",
    name: "unit",
    label: "Unit (e.g. times, minutes)",
  },
  {
    type: "textarea",
    name: "description",
    label: "Notes",
    rows: 3,
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function periodDenominator(frequency: Habit["frequency"]): number {
  const now = new Date();
  if (frequency === "daily") {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  if (frequency === "weekly") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .getDate();
    return Math.ceil(daysInMonth / 7);
  }
  return 1;
}

export function habitToRow(h: Habit): Record<string, unknown> {
  return {
    id: h.id,
    title: h.title,
    description: h.description ?? "",
    frequency: h.frequency,
    streak: String(computeStreak(h.completedDates, h.frequency)),
    thisMonth: `${computeThisMonth(h.completedDates)} / ${
      periodDenominator(h.frequency)
    }`,
    lastDone: lastCompleted(h.completedDates),
    doneToday: String(isDoneToday(h.completedDates)),
  };
}
