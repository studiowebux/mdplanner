// Business Model Canvas view routes — factory list + custom detail + inline editing.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { businessModelConfig } from "../../domains/business-model/config.tsx";
import { getBusinessModelService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { BusinessModelDetailView } from "../business-model-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import {
  BUSINESS_MODEL_SECTION_KEYS,
  type BusinessModelSectionKey,
} from "../../types/business-model.types.ts";

const VALID_SECTIONS = new Set<string>(BUSINESS_MODEL_SECTION_KEYS);

export const businessModelRouter = createDomainRoutes(businessModelConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getBusinessModelService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <BusinessModelDetailView
      {...viewProps(c, "/business-models")}
      item={item}
      editing={editing}
    />,
  );
}

// Detail page — view or edit mode via ?editing=true.
businessModelRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});

// Inline add: POST /business-models/:id/:section — append item to section.
businessModelRouter.post("/:id/:section", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  if (!VALID_SECTIONS.has(section)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();
  if (!text) return renderDetail(c, id);

  const item = await getBusinessModelService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as BusinessModelSectionKey], text];
  await getBusinessModelService().update(id, {
    [section]: items,
  });
  publish("business_model.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item added" } }),
  );
  return renderDetail(c, id);
});

// Inline edit: PUT /business-models/:id/:section/:index — update item text.
businessModelRouter.put("/:id/:section/:index", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_SECTIONS.has(section) || isNaN(index)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();

  const item = await getBusinessModelService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as BusinessModelSectionKey]];
  if (index >= 0 && index < items.length && text) {
    items[index] = text;
    await getBusinessModelService().update(id, { [section]: items });
    publish("business_model.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item updated" },
    }),
  );
  return c.body(null, 204);
});

// Inline remove: DELETE /business-models/:id/:section/:index — remove item.
businessModelRouter.delete("/:id/:section/:index", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_SECTIONS.has(section) || isNaN(index)) return c.notFound();

  const item = await getBusinessModelService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as BusinessModelSectionKey]];
  if (index >= 0 && index < items.length) {
    items.splice(index, 1);
    await getBusinessModelService().update(id, { [section]: items });
    publish("business_model.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item removed" },
    }),
  );
  return renderDetail(c, id);
});
