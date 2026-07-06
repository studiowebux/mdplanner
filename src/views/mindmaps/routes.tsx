// Mindmap view routes — factory-generated list + custom detail/edit handlers.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { mindmapConfig } from "../../domains/mindmap/config.tsx";
import { getMindmapService } from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import { MindmapDetailView } from "../mindmap-detail.tsx";
import { parseBulletTree } from "../../repositories/mindmap.repository.ts";

export const mindmapRouter = createDomainRoutes(mindmapConfig);

/** Render the detail page; `?editing=true` swaps the canvas for the bullet-tree
 *  editor AND turns notes into an inline-editable section. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getMindmapService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <MindmapDetailView
      {...viewProps(c, "/mindmaps")}
      item={item}
      editing={editing}
    />,
  );
}

mindmapRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// In-place notes save (Edit Mode). Bullet-tree edits use POST /:id/body.
mindmapRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getMindmapService().update(id, { notes });
  return renderDetail(c, id);
});

mindmapRouter.post("/:id/body", async (c) => {
  const id = c.req.param("id");
  const item = await getMindmapService().getById(id);
  if (!item) return c.notFound();

  const body = String((await c.req.parseBody()).body ?? "");
  const nodes = parseBulletTree(body);

  if (nodes === null) {
    c.header(
      "HX-Trigger",
      JSON.stringify({
        showToast: {
          type: "error",
          message: "Invalid bullet indent — use 2-space indents, no tabs",
        },
      }),
    );
    return c.html(
      <MindmapDetailView
        {...viewProps(c, "/mindmaps")}
        item={item}
        editing
        rawBody={body}
      />,
    );
  }

  const updated = await getMindmapService().update(id, { nodes });
  if (!updated) return c.notFound();

  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Mindmap saved" },
    }),
  );
  return c.html(
    <MindmapDetailView {...viewProps(c, "/mindmaps")} item={updated} />,
  );
});
