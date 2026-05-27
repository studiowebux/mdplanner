// Eisenhower view routes — factory-generated list + custom detail + inline editing.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { eisenhowerConfig } from "../../domains/eisenhower/config.tsx";
import { getEisenhowerService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { EisenhowerDetailView } from "../eisenhower-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import {
  EISENHOWER_QUADRANT_KEYS,
  type EisenhowerQuadrantKey,
} from "../../domains/eisenhower/constants.tsx";

const VALID_QUADRANTS = new Set<string>(EISENHOWER_QUADRANT_KEYS);

export const eisenhowerRouter = createDomainRoutes(eisenhowerConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getEisenhowerService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <EisenhowerDetailView
      {...viewProps(c, "/eisenhower")}
      item={item}
      editing={editing}
    />,
  );
}

// Detail page — view or edit mode via ?editing=true.
eisenhowerRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});

// In-place notes save (Edit Mode). Registered before the wildcard `:quadrant`
// route so the literal "/notes" path is not intercepted.
eisenhowerRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getEisenhowerService().update(id, { notes });
  publish("eisenhower.updated");
  return renderDetail(c, id);
});

// Inline add: POST /eisenhower/:id/:quadrant
eisenhowerRouter.post("/:id/:quadrant", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  if (!VALID_QUADRANTS.has(quadrant)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();
  if (!text) return renderDetail(c, id);

  const item = await getEisenhowerService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[quadrant as EisenhowerQuadrantKey], text];
  await getEisenhowerService().update(id, { [quadrant]: items });
  publish("eisenhower.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item added" } }),
  );
  return renderDetail(c, id);
});

// Inline edit: PUT /eisenhower/:id/:quadrant/:index
eisenhowerRouter.put("/:id/:quadrant/:index", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_QUADRANTS.has(quadrant) || isNaN(index)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();

  const item = await getEisenhowerService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[quadrant as EisenhowerQuadrantKey]];
  if (index >= 0 && index < items.length && text) {
    items[index] = text;
    await getEisenhowerService().update(id, { [quadrant]: items });
    publish("eisenhower.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item updated" },
    }),
  );
  return renderDetail(c, id);
});

// Inline remove: DELETE /eisenhower/:id/:quadrant/:index
eisenhowerRouter.delete("/:id/:quadrant/:index", async (c) => {
  const id = c.req.param("id");
  const quadrant = c.req.param("quadrant");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_QUADRANTS.has(quadrant) || isNaN(index)) return c.notFound();

  const item = await getEisenhowerService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[quadrant as EisenhowerQuadrantKey]];
  if (index >= 0 && index < items.length) {
    items.splice(index, 1);
    await getEisenhowerService().update(id, { [quadrant]: items });
    publish("eisenhower.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item removed" },
    }),
  );
  return renderDetail(c, id);
});
