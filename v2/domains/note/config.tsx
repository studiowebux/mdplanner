// Note domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateNote, Note, UpdateNote } from "../../types/note.types.ts";
import {
  getNoteService,
  getPortfolioService,
} from "../../singletons/services.ts";
import { NOTE_TABLE_COLUMNS, noteToRow } from "./constants.tsx";
import { NoteCard } from "../../views/components/note-card.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";

const FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "title", label: "Title", required: true },
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
  emptyMessage: "No notes yet. Create one to get started.",

  stateKeys: ["view", "project", "q", "sort", "order"],
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

  parseCreate: (body) => ({
    title: String(body.title || ""),
    content: body.content ? String(body.content) : "",
    project: body.project ? String(body.project) : undefined,
  }),

  parseUpdate: (body) => ({
    title: body.title ? String(body.title) : undefined,
    content: body.content !== undefined ? String(body.content) : undefined,
    project: body.project ? String(body.project) : null,
  }),

  getService: () => getNoteService(),

  extractFilterOptions: async () => {
    const portfolio = await getPortfolioService().list();
    return {
      project: portfolio.map((p) => p.name).sort(),
    };
  },

  searchPredicate: (item, q) =>
    item.title.toLowerCase().includes(q) ||
    (item.content ?? "").toLowerCase().includes(q) ||
    (item.project ?? "").toLowerCase().includes(q),
};
