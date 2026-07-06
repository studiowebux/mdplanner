/**
 * Guards the shared CanvasSectionBlock (extracted from the duplicated
 * business-model ↔ lean-canvas SectionBlock, task bse3e0): read mode lists
 * items, empty read mode shows the placeholder, edit mode wires the hx-* routes
 * to `basePath` and the swap targets to `#${rootId}`.
 */

import { assert } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { CanvasSectionBlock } from "../../src/views/components/canvas-section-block.tsx";

const base = {
  basePath: "/business-models",
  rootId: "bmc-detail-root",
  id: "bm1",
  sectionKey: "keyPartners",
  label: "Key Partners",
  items: ["Acme", "Globex"],
  editing: false,
  editSuffix: "",
};

Deno.test("read mode lists items and the section title", () => {
  const html = renderToString(CanvasSectionBlock(base));
  assert(html.includes("Key Partners"));
  assert(html.includes(">Acme</li>"));
  assert(html.includes(">Globex</li>"));
  assert(!html.includes("quadrant-card__add"), "no add form outside edit mode");
});

Deno.test("empty read mode shows the placeholder", () => {
  const html = renderToString(CanvasSectionBlock({ ...base, items: [] }));
  assert(html.includes("lc-section__empty"));
  assert(html.includes("Add items…"));
});

Deno.test("edit mode wires routes to basePath and targets to rootId", () => {
  const html = renderToString(
    CanvasSectionBlock({ ...base, editing: true, editSuffix: "?editing=true" }),
  );
  assert(
    html.includes(
      'hx-put="/business-models/bm1/keyPartners/0?editing=true"',
    ),
    "put route uses basePath + sectionKey",
  );
  assert(
    html.includes(
      'hx-delete="/business-models/bm1/keyPartners/1?editing=true"',
    ),
    "delete route uses basePath + index",
  );
  assert(
    html.includes('hx-post="/business-models/bm1/keyPartners?editing=true"'),
    "add route posts to the section",
  );
  assert(
    html.includes('hx-target="#bmc-detail-root"'),
    "swap target derives from rootId",
  );
  assert(html.includes('id="qed-keyPartners-0"'));
});

Deno.test("basePath and rootId are fully parameterized (lean-canvas wiring)", () => {
  const html = renderToString(
    CanvasSectionBlock({
      ...base,
      basePath: "/lean-canvases",
      rootId: "lc-detail-root",
      editing: true,
      editSuffix: "",
    }),
  );
  assert(html.includes('hx-put="/lean-canvases/bm1/keyPartners/0"'));
  assert(html.includes('hx-target="#lc-detail-root"'));
  assert(!html.includes("business-models"), "no leaked default basePath");
  assert(!html.includes("bmc-detail-root"), "no leaked default rootId");
});
