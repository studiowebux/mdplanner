// Note routes — factory-generated list + grid views + custom preview.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { noteConfig } from "../../domains/note/config.tsx";
import { getNoteService } from "../../singletons/services.ts";
import { NotePreview } from "../components/note-preview.tsx";

export const notesRouter = createDomainRoutes(noteConfig);

// Preview — rendered markdown in sidenav (read-only)
notesRouter.get("/:id/preview", async (c) => {
  const id = c.req.param("id");
  const note = await getNoteService().getById(id);
  if (!note) return c.notFound();
  return c.html(NotePreview({ note }) as unknown as string);
});
