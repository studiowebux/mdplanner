// Note routes — factory-generated list + grid views + custom preview.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { noteConfig } from "../../domains/note/config.tsx";
import { getNoteService } from "../../singletons/services.ts";
import { Sidenav } from "../../components/ui/sidenav.tsx";
import { NotePreview } from "../components/note-preview.tsx";
import { NoteDetailView } from "../note-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const notesRouter = createDomainRoutes(noteConfig);

// Detail — enhanced content with paragraphs, tabs, timeline, split-view
notesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const note = await getNoteService().getById(id);
  if (!note) return c.notFound();
  return c.html(
    NoteDetailView({
      ...viewProps(c, "/notes"),
      note,
    }) as unknown as string,
  );
});

// Update title — inline edit via htmx
notesRouter.post("/:id/title", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const title = String(body.title || "").trim();
  if (!title) return c.text("Title required", 400);
  const note = await getNoteService().update(id, { title });
  if (!note) return c.notFound();
  return c.html(
    NoteDetailView({
      ...viewProps(c, "/notes"),
      note,
    }) as unknown as string,
  );
});

// Update project — htmx autocomplete hidden input triggers this
notesRouter.post("/:id/project", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const project = body.project ? String(body.project) : null;
  const note = await getNoteService().update(id, { project });
  if (!note) return c.notFound();
  return c.html(
    NoteDetailView({
      ...viewProps(c, "/notes"),
      note,
    }) as unknown as string,
  );
});

// Preview — rendered markdown in sidenav (read-only)
notesRouter.get("/:id/preview", async (c) => {
  const id = c.req.param("id");
  const note = await getNoteService().getById(id);
  if (!note) return c.notFound();
  return c.html(
    Sidenav({
      id: "notes-preview-sidenav",
      title: note.title,
      open: true,
      children: NotePreview({ note }),
    }) as unknown as string,
  );
});
