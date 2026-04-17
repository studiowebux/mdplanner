// Note domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateNote, Note, UpdateNote } from "../../types/note.types.ts";
import { getNoteService } from "../../singletons/services.ts";
import { parseFormBody } from "../../utils/form-parser.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import { extractProjectNames } from "../../utils/filter-helpers.ts";
import { NOTE_TABLE_COLUMNS, noteToRow } from "./constants.tsx";
import { NoteCard } from "../../views/components/note-card.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";

const FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  { type: "textarea", name: "content", label: "Content", rows: 8 },
];

export const noteConfig: DomainConfig<Note, CreateNote, UpdateNote> = {
  name: "notes",
  singular: "Note",
  path: "/notes",
  ssePrefix: "note",
  styles: [
    "/css/vendor/highlight-github-11.11.1.min.css",
    "/css/vendor/highlight-github-dark-scoped-11.11.1.css",
    "/css/views/notes.css",
  ],
  scripts: [
    "/js/vendor/highlight-11.11.1.min.js",
    "/js/note-highlight.js",
    "/js/note-tabs.js",
  ],
  defaultView: "table",
  pageSize: 50,
  pageSizeOptions: [5, 10, 20, 50, 100],
  emptyMessage: "No notes yet. Create one to get started.",

  stateKeys: ["view", "project", "q", "sort", "order", "limit"],
  columns: NOTE_TABLE_COLUMNS,
  formFields: FORM_FIELDS,

  filters: [
    {
      name: "project",
      label: "All projects",
      options: [],
    },
  ],

  toRow: noteToRow,

  Card: ({ item, q }) => <NoteCard note={item} q={q} />,

  parseCreate: (body) => parseFormBody(FORM_FIELDS, body) as CreateNote,

  parseUpdate: (body) =>
    parseFormBody(FORM_FIELDS, body, { clearEmpty: true }) as Partial<
      UpdateNote
    >,

  getService: () => getNoteService(),

  extractFilterOptions: async () => ({
    project: await extractProjectNames(),
  }),

  searchPredicate: createSearchPredicate<Note>([
    { type: "string", get: (i) => i.title },
    { type: "string", get: (i) => i.content },
    { type: "string", get: (i) => i.project },
  ]),
};
