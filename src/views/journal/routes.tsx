// Journal view routes — factory-generated list + custom detail.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `content` edits in-place via "Edit Mode" (?editing=true, PUT /:id/content).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { journalConfig } from "../../domains/journal/config.tsx";
import { getJournalService } from "../../singletons/services.ts";
import { JournalDetailView } from "../journal-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const journalRouter = createDomainRoutes(journalConfig);

/** Render the detail page; `?editing=true` enables in-place content editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getJournalService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <JournalDetailView
      {...viewProps(c, "/journal")}
      item={item}
      editing={editing}
    />,
  );
}

journalRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

// In-place content save (Edit Mode). Factory provides edit/delete routes.
journalRouter.put("/:id/content", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const content = String(body.content ?? "").trim() || undefined;
  await getJournalService().update(id, { content });
  publish("journal.updated");
  return renderDetail(c, id);
});
