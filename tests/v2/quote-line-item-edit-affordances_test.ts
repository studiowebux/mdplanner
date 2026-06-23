/**
 * The draft-quote inline cell editor (bug task_1781989945296) must always offer
 * BOTH an accept (✓) and a cancel (✕) affordance — never a dirty-gated/hidden
 * Save with no escape. Cancel re-GETs the read cell so an open input is never
 * stranded and never committed implicitly. quadrant-edit.js (SWOT/Retro) is
 * untouched: the qli cells use qli-* attributes + /js/qli-edit.js.
 */

import { assert } from "@std/assert";
import {
  EditCell,
  EditTypeCell,
} from "../../src/views/components/quote-line-items-editor.tsx";
import { toHtml } from "../../src/utils/html.ts";

Deno.test("EditCell renders always-visible Save + Cancel, no dirty-gate, no quadrant attrs", async () => {
  const html = await toHtml(
    EditCell({ quoteId: "q1", index: 0, field: "description", value: "Work" }),
  );
  assert(html.includes("data-qli-edit"), "input carries data-qli-edit");
  assert(html.includes('hx-trigger="qli-save"'), "save commits via qli-save");
  assert(
    html.includes('data-qli-save-for="qli-0-description"'),
    "Save button paired to the input",
  );
  assert(
    html.includes('data-qli-cancel-for="qli-0-description"'),
    "Cancel button paired to the input",
  );
  assert(
    html.includes("/quotes/q1/line-items/0/cell?field=description"),
    "Cancel re-GETs the read cell",
  );
  assert(!html.includes("is-hidden"), "no dirty-gated hidden Save button");
  assert(!html.includes("data-quadrant"), "no shared quadrant-edit attrs");
});

Deno.test("EditTypeCell renders always-visible Save + Cancel and a freetext datalist", async () => {
  const html = await toHtml(
    EditTypeCell({
      quoteId: "q1",
      index: 2,
      value: "material",
      distinctTypes: ["material", "licence"],
    }),
  );
  assert(
    html.includes('data-qli-save-for="qli-2-type"'),
    "type Save button paired",
  );
  assert(
    html.includes('data-qli-cancel-for="qli-2-type"'),
    "type Cancel button paired",
  );
  assert(
    html.includes("/quotes/q1/line-items/2/cell?field=type"),
    "type Cancel re-GETs the read cell",
  );
  // Built-in + custom type both offered as suggestions.
  assert(html.includes('value="material"'), "built-in material suggested");
  assert(html.includes('value="licence"'), "custom type preserved as option");
  assert(!html.includes("is-hidden"), "type Save is never hidden");
});
