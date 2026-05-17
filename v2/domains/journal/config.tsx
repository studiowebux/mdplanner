// Journal domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateJournalEntry,
  JournalEntry,
  UpdateJournalEntry,
} from "../../types/journal.types.ts";
import { getJournalService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  JOURNAL_FORM_FIELDS,
  JOURNAL_MOOD_OPTIONS,
  JOURNAL_TABLE_COLUMNS,
  journalToRow,
} from "./constants.tsx";
import { JournalCard } from "../../views/components/journal-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const journalConfig: DomainConfig<
  JournalEntry,
  CreateJournalEntry,
  UpdateJournalEntry
> = {
  name: "journal",
  singular: "Journal Entry",
  plural: "Journal",
  path: "/journal",
  ssePrefix: "journal",
  styles: ["/css/views/journal.css"],
  emptyMessage: "No journal entries yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "mood", "from", "to", "q", "sort", "order"],
  columns: JOURNAL_TABLE_COLUMNS,
  formFields: JOURNAL_FORM_FIELDS,
  // `content` is edited in-place on the detail page via "Edit Mode".
  inlineEditFields: ["content"],

  filters: [
    {
      name: "mood",
      label: "All moods",
      options: JOURNAL_MOOD_OPTIONS,
    },
  ],

  toRow: journalToRow,

  Card: ({ item, q }) => <JournalCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(JOURNAL_FORM_FIELDS, body) as CreateJournalEntry,

  parseUpdate: (body) =>
    parseFormBody(JOURNAL_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateJournalEntry>,

  getService: () => getJournalService(),

  extractFilterOptions: async () => {
    const items = await getJournalService().list();
    const moods = [
      ...new Set(items.map((e) => e.mood).filter(Boolean) as string[]),
    ].sort();
    return { mood: moods };
  },

  searchPredicate: createSearchPredicate<JournalEntry>([
    { type: "string", get: (e) => e.title },
    { type: "string", get: (e) => e.content },
  ]),
};
