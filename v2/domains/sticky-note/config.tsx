// Sticky Note domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { ViewMode } from "../../types/app.ts";
import type {
  CreateStickyNote,
  StickyNote,
  UpdateStickyNote,
} from "../../types/sticky-note.types.ts";
import { getStickyNoteService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  STICKY_NOTE_COLOR_OPTIONS,
  STICKY_NOTE_FORM_FIELDS,
  STICKY_NOTE_TABLE_COLUMNS,
  stickyNoteToRow,
} from "./constants.tsx";
import { StickyNoteCanvas } from "../../views/components/sticky-note-canvas.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const stickyNoteConfig: DomainConfig<
  StickyNote,
  CreateStickyNote,
  UpdateStickyNote
> = {
  name: "sticky-notes",
  singular: "Sticky Note",
  path: "/sticky-notes",
  ssePrefix: "sticky_note",
  styles: ["/css/views/sticky-notes.css"],
  scripts: ["/js/sticky-note-canvas.js"],
  emptyMessage: "No sticky notes yet. Double-click the canvas to add one.",
  defaultView: "canvas" as unknown as ViewMode,

  stateKeys: ["view", "color", "q"],
  columns: STICKY_NOTE_TABLE_COLUMNS,
  formFields: STICKY_NOTE_FORM_FIELDS,

  hideDefaultViews: true,
  extraViewModes: [
    { key: "canvas", label: "Canvas" },
    { key: "table", label: "Table" },
  ],

  filters: [
    {
      name: "color",
      label: "All colors",
      options: STICKY_NOTE_COLOR_OPTIONS,
    },
  ],

  toRow: stickyNoteToRow,

  parseCreate: (body) =>
    parseFormBody(STICKY_NOTE_FORM_FIELDS, body) as CreateStickyNote,

  parseUpdate: (body) =>
    parseFormBody(STICKY_NOTE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateStickyNote>,

  getService: () => getStickyNoteService(),

  customViewRenderer: async (view, _state, items, nonce) => {
    if (view !== "canvas") return undefined;
    return <StickyNoteCanvas notes={items} nonce={nonce} />;
  },

  searchPredicate: createSearchPredicate<StickyNote>([
    { type: "string", get: (n) => n.content },
    { type: "string", get: (n) => n.color },
  ]),
};
