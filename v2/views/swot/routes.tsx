// SWOT view routes — factory-generated list + custom detail + inline editing.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { swotConfig } from "../../domains/swot/config.tsx";
import { getSwotService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { SwotDetailView } from "../swot-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { SwotQuadrantKey } from "../../domains/swot/constants.tsx";
import { SWOT_QUADRANTS } from "../../domains/swot/constants.tsx";

const VALID_QUADRANTS = new Set(
  SWOT_QUADRANTS.map((n) => n.toLowerCase()),
);

export const swotRouter = createDomainRoutes(swotConfig);

/** Re-render the detail page. Reads ?editing from query param. */
async function renderDetail(c: AppContext, id: string) {
  const swot = await getSwotService().getById(id);
  if (!swot) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <SwotDetailView {...viewProps(c, "/swot")} item={swot} editing={editing} />,
  );
}

// Detail page — view or edit mode via ?editing=true.
swotRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});

// Inline add: POST /swot/:id/:quadrant — add item to quadrant.
swotRouter.post("/:id/:quadrant", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  if (!VALID_QUADRANTS.has(quadrant)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();
  if (!text) return renderDetail(c, id);

  const swot = await getSwotService().getById(id);
  if (!swot) return c.notFound();

  const items = [...swot[quadrant as SwotQuadrantKey], text];
  await getSwotService().update(id, { [quadrant]: items });
  publish("swot.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item added" } }),
  );
  return renderDetail(c, id);
});

// Inline edit: PUT /swot/:id/:quadrant/:index — update item text.
swotRouter.put("/:id/:quadrant/:index", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_QUADRANTS.has(quadrant) || isNaN(index)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();

  const swot = await getSwotService().getById(id);
  if (!swot) return c.notFound();

  const items = [...swot[quadrant as SwotQuadrantKey]];
  if (index >= 0 && index < items.length && text) {
    items[index] = text;
    await getSwotService().update(id, { [quadrant]: items });
    publish("swot.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item updated" } }),
  );
  return renderDetail(c, id);
});

// Inline remove: DELETE /swot/:id/:quadrant/:index — remove item.
swotRouter.delete("/:id/:quadrant/:index", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_QUADRANTS.has(quadrant) || isNaN(index)) return c.notFound();

  const swot = await getSwotService().getById(id);
  if (!swot) return c.notFound();

  const items = [...swot[quadrant as SwotQuadrantKey]];
  if (index >= 0 && index < items.length) {
    items.splice(index, 1);
    await getSwotService().update(id, { [quadrant]: items });
    publish("swot.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item removed" },
    }),
  );
  return renderDetail(c, id);
});
