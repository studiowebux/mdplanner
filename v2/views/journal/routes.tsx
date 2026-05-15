// Journal view routes — factory-generated list + custom detail with edit-in-place.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { journalConfig } from "../../domains/journal/config.tsx";
import { getJournalService } from "../../singletons/services.ts";
import { JournalDetailView } from "../journal-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const journalRouter = createDomainRoutes(journalConfig);

journalRouter.get("/:id", async (c: AppContext) => {
  const id = c.req.param("id");
  const item = await getJournalService().getById(id!);
  if (!item) return c.notFound();
  const editMode = c.req.query("edit") === "1";
  return c.html(
    <JournalDetailView
      {...viewProps(c, "/journal")}
      item={item}
      editMode={editMode}
    />,
  );
});

journalRouter.post("/:id/save", async (c: AppContext) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();
  const date = String(body.date ?? "").trim() || undefined;
  const mood = String(body.mood ?? "").trim() || undefined;
  const content = String(body.content ?? "").trim() || undefined;
  const tagsRaw = String(body.tags ?? "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  await getJournalService().update(id!, {
    title,
    date,
    mood: mood as never,
    content,
    tags,
  });
  publish("journal.updated");
  return c.redirect(`/journal/${id}`);
});
