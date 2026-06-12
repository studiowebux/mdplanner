// SAFe view routes — factory-generated list + detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { safeConfig } from "../../domains/safe/config.tsx";
import { getSafeService } from "../../singletons/services.ts";
import { SafeDetailView } from "../safe-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const safeRouter = createDomainRoutes(safeConfig);

/** Render the detail page; `?editing=true` enables in-place notes editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getSafeService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <SafeDetailView
      {...viewProps(c, "/safe")}
      item={item}
      editing={editing}
    />,
  );
}

safeRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// In-place notes save (Edit Mode). Factory provides edit/delete routes.
safeRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getSafeService().update(id, { notes });
  return renderDetail(c, id);
});
