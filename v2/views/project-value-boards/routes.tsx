// Project Value Board view routes — factory list + custom detail + inline editing.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { projectValueBoardConfig } from "../../domains/project-value-board/config.tsx";
import { getProjectValueBoardService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { ProjectValueBoardDetailView } from "../project-value-board-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import {
  PROJECT_VALUE_BOARD_SECTION_KEYS,
  type ProjectValueBoardSectionKey,
} from "../../types/project-value-board.types.ts";

const VALID_SECTIONS = new Set<string>(PROJECT_VALUE_BOARD_SECTION_KEYS);

export const projectValueBoardRouter = createDomainRoutes(
  projectValueBoardConfig,
);

async function renderDetail(c: AppContext, id: string) {
  const item = await getProjectValueBoardService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <ProjectValueBoardDetailView
      {...viewProps(c, "/project-value")}
      item={item}
      editing={editing}
    />,
  );
}

// Detail page — view or edit mode via ?editing=true.
projectValueBoardRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});

// In-place notes save (Edit Mode). Registered before /:id/:section wildcards
// as a defensive habit (segment counts differ — no actual conflict).
projectValueBoardRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getProjectValueBoardService().update(id, { notes });
  publish("project-value-board.updated");
  return renderDetail(c, id);
});

// Inline add: POST /project-value/:id/:section — append item to section.
projectValueBoardRouter.post("/:id/:section", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  if (!VALID_SECTIONS.has(section)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();
  if (!text) return renderDetail(c, id);

  const item = await getProjectValueBoardService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as ProjectValueBoardSectionKey], text];
  await getProjectValueBoardService().update(id, { [section]: items });
  publish("project-value-board.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item added" } }),
  );
  return renderDetail(c, id);
});

// Inline edit: PUT /project-value/:id/:section/:index — update item text.
projectValueBoardRouter.put("/:id/:section/:index", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_SECTIONS.has(section) || isNaN(index)) return c.notFound();

  const body = await c.req.parseBody();
  const text = String(body.text ?? "").trim();

  const item = await getProjectValueBoardService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as ProjectValueBoardSectionKey]];
  if (index >= 0 && index < items.length && text) {
    items[index] = text;
    await getProjectValueBoardService().update(id, { [section]: items });
    publish("project-value-board.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item updated" } }),
  );
  return c.body(null, 204);
});

// Inline remove: DELETE /project-value/:id/:section/:index — remove item.
projectValueBoardRouter.delete("/:id/:section/:index", async (c) => {
  const id = c.req.param("id");
  const section = c.req.param("section");
  const index = parseInt(c.req.param("index"), 10);
  if (!VALID_SECTIONS.has(section) || isNaN(index)) return c.notFound();

  const item = await getProjectValueBoardService().getById(id);
  if (!item) return c.notFound();

  const items = [...item[section as ProjectValueBoardSectionKey]];
  if (index >= 0 && index < items.length) {
    items.splice(index, 1);
    await getProjectValueBoardService().update(id, { [section]: items });
    publish("project-value-board.updated");
  }
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item removed" },
    }),
  );
  return renderDetail(c, id);
});
