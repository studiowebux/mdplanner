import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { JournalEntry } from "../../types/journal.types.ts";
import {
  JOURNAL_MOOD_LABELS,
  JOURNAL_MOODS,
} from "../../types/journal.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import type { BadgeVariant } from "../../components/ui/status-badge.tsx";

// ---------------------------------------------------------------------------
// Mood badge variants
// ---------------------------------------------------------------------------

export const JOURNAL_MOOD_VARIANTS: Record<string, BadgeVariant> = {
  great: "success",
  good: "teal",
  neutral: "neutral",
  bad: "warning",
  awful: "error",
};

// ---------------------------------------------------------------------------
// Mood filter options
// ---------------------------------------------------------------------------

export const JOURNAL_MOOD_OPTIONS = JOURNAL_MOODS.map((m) => ({
  value: m,
  label: JOURNAL_MOOD_LABELS[m],
}));

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("journal", "journal-form-container");

export const JOURNAL_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/journal/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "date", label: "Date", sortable: true },
  { key: "mood", label: "Mood", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const JOURNAL_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "date",
    name: "date",
    label: "Date",
    required: true,
  },
  {
    type: "select",
    name: "mood",
    label: "Mood",
    options: JOURNAL_MOOD_OPTIONS,
  },
  {
    type: "textarea",
    name: "content",
    label: "Content (Markdown supported)",
    rows: 8,
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

export function journalToRow(e: JournalEntry): Record<string, unknown> {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    mood: e.mood ?? "",
  };
}
