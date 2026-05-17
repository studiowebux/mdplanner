// Lean Canvas view routes — factory list + custom detail + inline editing.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { leanCanvasConfig } from "../../domains/lean-canvas/config.tsx";
import { getLeanCanvasService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { LeanCanvasDetailView } from "../lean-canvas-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import {
  LEAN_CANVAS_SECTIONS,
  type LeanCanvasSectionKey,
} from "../../types/lean-canvas.types.ts";

const VALID_SECTIONS = new Set<string>(
  LEAN_CANVAS_SECTIONS.map((s) => s.key),
);

export const leanCanvasesRouter = createDomainRoutes(leanCanvasConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getLeanCanvasService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <LeanCanvasDetailView
      {...viewProps(c, "/lean-canvases")}
      item={item}
      editing={editing}
    />,
  );
}

// Detail page — view or edit mode via ?editing=true.
leanCanvasesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});

// Inline add: POST /lean-canvases/:id/:section — append item to section.
leanCanvasesRouter.post("/:id/:section", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  if (!VALID_SECTIONS.has(section)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();
  if (!text) return renderDetail(c, id);

  const item = await getLeanCanvasService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as LeanCanvasSectionKey], text];
  await getLeanCanvasService().update(id, { [section]: items });
  publish("lean-canvas.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item added" } }),
  );
  return renderDetail(c, id);
});

// Inline edit: PUT /lean-canvases/:id/:section/:index — update item text.
leanCanvasesRouter.put("/:id/:section/:index", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_SECTIONS.has(section) || isNaN(index)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();

  const item = await getLeanCanvasService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as LeanCanvasSectionKey]];
  if (index >= 0 && index < items.length && text) {
    items[index] = text;
    await getLeanCanvasService().update(id, { [section]: items });
    publish("lean-canvas.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item updated" },
    }),
  );
  return c.body(null, 204);
});

// Inline remove: DELETE /lean-canvases/:id/:section/:index — remove item.
leanCanvasesRouter.delete("/:id/:section/:index", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_SECTIONS.has(section) || isNaN(index)) return c.notFound();

  const item = await getLeanCanvasService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as LeanCanvasSectionKey]];
  if (index >= 0 && index < items.length) {
    items.splice(index, 1);
    await getLeanCanvasService().update(id, { [section]: items });
    publish("lean-canvas.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item removed" },
    }),
  );
  return renderDetail(c, id);
});
