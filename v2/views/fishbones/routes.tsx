// Fishbone view routes — factory list + custom detail + inline cause editing.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { fishboneConfig } from "../../domains/fishbone/config.tsx";
import { getFishboneService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { FishboneDetailView } from "../fishbone-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { FishboneCause } from "../../types/fishbone.types.ts";

export const fishboneRouter = createDomainRoutes(fishboneConfig);

/** Re-render the detail page. Reads ?editing from the query param. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getFishboneService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <FishboneDetailView
      {...viewProps(c, "/fishbones")}
      item={item}
      editing={editing}
    />,
  );
}

/** Deep-clone the cause array so mutations never alias the cached entity. */
function cloneCauses(causes: FishboneCause[]): FishboneCause[] {
  return causes.map((cause) => ({
    section: cause.section,
    items: [...cause.items],
  }));
}

/** Attach a success toast to the response. */
function toast(c: AppContext, message: string): void {
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message } }),
  );
}

// Detail page — view or edit mode via ?editing=true.
fishboneRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// Add category: POST /fishbones/:id/category — append a new cause category.
fishboneRouter.post("/:id/category", async (c) => {
  const id = c.req.param("id");

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();
  if (!text) return renderDetail(c, id);

  const item = await getFishboneService().getById(id);
  if (!item) return c.notFound();

  const causes = cloneCauses(item.causes);
  causes.push({ section: text, items: [] });
  await getFishboneService().update(id, { causes });
  publish("fishbone.updated");
  toast(c, "Category added");
  return renderDetail(c, id);
});

// Rename category: PUT /fishbones/:id/category/:cidx — update category name.
fishboneRouter.put("/:id/category/:cidx", async (c) => {
  const id = c.req.param("id");
  const cidx = parseInt(c.req.param("cidx"), 10);
  if (isNaN(cidx)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();

  const item = await getFishboneService().getById(id);
  if (!item) return c.notFound();

  const causes = cloneCauses(item.causes);
  if (cidx >= 0 && cidx < causes.length && text) {
    causes[cidx].section = text;
    await getFishboneService().update(id, { causes });
    publish("fishbone.updated");
  }
  toast(c, "Category renamed");
  return renderDetail(c, id);
});

// Remove category: DELETE /fishbones/:id/category/:cidx — drop a category.
fishboneRouter.delete("/:id/category/:cidx", async (c) => {
  const id = c.req.param("id");
  const cidx = parseInt(c.req.param("cidx"), 10);
  if (isNaN(cidx)) return c.notFound();

  const item = await getFishboneService().getById(id);
  if (!item) return c.notFound();

  const causes = cloneCauses(item.causes);
  if (cidx >= 0 && cidx < causes.length) {
    causes.splice(cidx, 1);
    await getFishboneService().update(id, { causes });
    publish("fishbone.updated");
  }
  toast(c, "Category removed");
  return renderDetail(c, id);
});

// Add cause: POST /fishbones/:id/category/:cidx/item — append an item.
fishboneRouter.post("/:id/category/:cidx/item", async (c) => {
  const id = c.req.param("id");
  const cidx = parseInt(c.req.param("cidx"), 10);
  if (isNaN(cidx)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();
  if (!text) return renderDetail(c, id);

  const item = await getFishboneService().getById(id);
  if (!item) return c.notFound();

  const causes = cloneCauses(item.causes);
  if (cidx >= 0 && cidx < causes.length) {
    causes[cidx].items.push(text);
    await getFishboneService().update(id, { causes });
    publish("fishbone.updated");
  }
  toast(c, "Cause added");
  return renderDetail(c, id);
});

// Edit cause: PUT /fishbones/:id/category/:cidx/item/:iidx — update item text.
fishboneRouter.put("/:id/category/:cidx/item/:iidx", async (c) => {
  const id = c.req.param("id");
  const cidx = parseInt(c.req.param("cidx"), 10);
  const iidx = parseInt(c.req.param("iidx"), 10);
  if (isNaN(cidx) || isNaN(iidx)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();

  const item = await getFishboneService().getById(id);
  if (!item) return c.notFound();

  const causes = cloneCauses(item.causes);
  if (
    cidx >= 0 && cidx < causes.length &&
    iidx >= 0 && iidx < causes[cidx].items.length && text
  ) {
    causes[cidx].items[iidx] = text;
    await getFishboneService().update(id, { causes });
    publish("fishbone.updated");
  }
  toast(c, "Cause updated");
  return renderDetail(c, id);
});

// Remove cause: DELETE /fishbones/:id/category/:cidx/item/:iidx — drop an item.
fishboneRouter.delete("/:id/category/:cidx/item/:iidx", async (c) => {
  const id = c.req.param("id");
  const cidx = parseInt(c.req.param("cidx"), 10);
  const iidx = parseInt(c.req.param("iidx"), 10);
  if (isNaN(cidx) || isNaN(iidx)) return c.notFound();

  const item = await getFishboneService().getById(id);
  if (!item) return c.notFound();

  const causes = cloneCauses(item.causes);
  if (
    cidx >= 0 && cidx < causes.length &&
    iidx >= 0 && iidx < causes[cidx].items.length
  ) {
    causes[cidx].items.splice(iidx, 1);
    await getFishboneService().update(id, { causes });
    publish("fishbone.updated");
  }
  toast(c, "Cause removed");
  return renderDetail(c, id);
});
