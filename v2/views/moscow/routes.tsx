// MoSCoW view routes — factory-generated list + custom detail + inline editing.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { moscowConfig } from "../../domains/moscow/config.tsx";
import { getMoscowService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { MoscowDetailView } from "../moscow-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import {
  MOSCOW_QUADRANT_KEYS,
  type MoscowQuadrantKey,
} from "../../domains/moscow/constants.tsx";

const VALID_QUADRANTS = new Set<string>(MOSCOW_QUADRANT_KEYS);

export const moscowRouter = createDomainRoutes(moscowConfig);

/** Re-render the detail page. Reads ?editing from query param. */
async function renderDetail(c: AppContext, id: string) {
  const moscow = await getMoscowService().getById(id);
  if (!moscow) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <MoscowDetailView
      {...viewProps(c, "/moscow")}
      item={moscow}
      editing={editing}
    />,
  );
}

// Detail page — view or edit mode via ?editing=true.
moscowRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});

// Inline add: POST /moscow/:id/:quadrant — add item to quadrant.
moscowRouter.post("/:id/:quadrant", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  if (!VALID_QUADRANTS.has(quadrant)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();
  if (!text) return renderDetail(c, id);

  const moscow = await getMoscowService().getById(id);
  if (!moscow) return c.notFound();

  const items = [...moscow[quadrant as MoscowQuadrantKey], text];
  await getMoscowService().update(id, { [quadrant]: items });
  publish("moscow.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item added" } }),
  );
  return renderDetail(c, id);
});

// Inline edit: PUT /moscow/:id/:quadrant/:index — update item text.
moscowRouter.put("/:id/:quadrant/:index", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_QUADRANTS.has(quadrant) || isNaN(index)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();

  const moscow = await getMoscowService().getById(id);
  if (!moscow) return c.notFound();

  const items = [...moscow[quadrant as MoscowQuadrantKey]];
  if (index >= 0 && index < items.length && text) {
    items[index] = text;
    await getMoscowService().update(id, { [quadrant]: items });
    publish("moscow.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item updated" } }),
  );
  return renderDetail(c, id);
});

// Inline remove: DELETE /moscow/:id/:quadrant/:index — remove item.
moscowRouter.delete("/:id/:quadrant/:index", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_QUADRANTS.has(quadrant) || isNaN(index)) return c.notFound();

  const moscow = await getMoscowService().getById(id);
  if (!moscow) return c.notFound();

  const items = [...moscow[quadrant as MoscowQuadrantKey]];
  if (index >= 0 && index < items.length) {
    items.splice(index, 1);
    await getMoscowService().update(id, { [quadrant]: items });
    publish("moscow.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item removed" },
    }),
  );
  return renderDetail(c, id);
});
