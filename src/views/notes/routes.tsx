// Note routes — factory-generated list + grid views + custom preview.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { noteConfig } from "../../domains/note/config.tsx";
import { getNoteService } from "../../singletons/services.ts";
import { Sidenav } from "../../components/ui/sidenav.tsx";
import { NotePreview } from "../components/note-preview.tsx";
import { NoteDetailView } from "../note-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { markdownToHtml } from "../../utils/markdown.ts";
import { escapeHtml } from "../../utils/html.ts";

export const notesRouter = createDomainRoutes(noteConfig);

// PUT /:id — note-editor.js save (JSON body: paragraphs + customSections)
notesRouter.put("/:id", async (c) => {
  const id = c.req.param("id")!;
  const existing = await getNoteService().getById(id);
  if (!existing) return c.notFound();
  if (existing.archived === true) {
    return c.text("Note is archived — restore before editing", 422);
  }
  const body = await c.req.json<
    { paragraphs?: unknown[]; customSections?: unknown[] }
  >();
  const note = await getNoteService().update(id, body as never);
  if (!note) return c.notFound();
  return new Response(null, { status: 204 });
});

// Detail — enhanced content with paragraphs, tabs, timeline, split-view
notesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const note = await getNoteService().getById(id);
  if (!note) return c.notFound();
  return c.html(<NoteDetailView {...viewProps(c, "/notes")} note={note} />);
});

// Update title — inline edit via htmx
notesRouter.post("/:id/title", async (c) => {
  const id = c.req.param("id");
  const existing = await getNoteService().getById(id);
  if (!existing) return c.notFound();
  if (existing.archived === true) {
    return c.text("Note is archived — restore before editing", 422);
  }
  const body = await c.req.parseBody();
  const title = String(body.title || "").trim();
  if (!title) return c.text("Title required", 400);
  const note = await getNoteService().update(id, { title });
  if (!note) return c.notFound();
  c.header("HX-Trigger", hxTrigger("success", "Title updated"));
  return c.html(<NoteDetailView {...viewProps(c, "/notes")} note={note} />);
});

// Update project — htmx autocomplete hidden input triggers this
notesRouter.post("/:id/project", async (c) => {
  const id = c.req.param("id");
  const existing = await getNoteService().getById(id);
  if (!existing) return c.notFound();
  if (existing.archived === true) {
    return c.text("Note is archived — restore before editing", 422);
  }
  const body = await c.req.parseBody();
  const project = body.project ? String(body.project) : null;
  const note = await getNoteService().update(id, { project });
  if (!note) return c.notFound();
  c.header("HX-Trigger", hxTrigger("success", "Project updated"));
  return c.html(<NoteDetailView {...viewProps(c, "/notes")} note={note} />);
});

// Restore an archived note — drops `archived` / `archived_at` / `archived_by`.
notesRouter.post("/:id/restore", async (c) => {
  const id = c.req.param("id");
  const ok = await getNoteService().restore(id);
  if (!ok) return c.notFound();
  c.header("HX-Trigger", hxTrigger("success", "Note restored"));
  c.header("HX-Redirect", `/notes/${id}`);
  return new Response(null, { status: 204 });
});

// Permanently delete a note — removes the file from disk. No recovery.
notesRouter.post("/:id/destroy", async (c) => {
  const id = c.req.param("id");
  const ok = await getNoteService().hardDelete(id);
  if (!ok) return c.notFound();
  c.header("HX-Trigger", hxTrigger("success", "Note permanently deleted"));
  c.header("HX-Redirect", `/notes`);
  return new Response(null, { status: 204 });
});

// Preview a single block — returns a rendered HTML fragment (htmx swap target).
// Form-encoded (htmx default); code blocks are wrapped server-side so the
// editor needs no client-side render branch.
notesRouter.post("/preview-block", async (c) => {
  const body = await c.req.parseBody();
  const content = String(body.content ?? "");
  if (String(body.type ?? "") === "code") {
    const lang = String(body.lang ?? "");
    const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    return c.html(`<pre><code${cls}>${escapeHtml(content)}</code></pre>`);
  }
  return c.html(markdownToHtml(content) ?? "");
});

// Preview — rendered markdown in sidenav (read-only)
notesRouter.get("/:id/preview", async (c) => {
  const id = c.req.param("id");
  const note = await getNoteService().getById(id);
  if (!note) return c.notFound();
  return c.html(
    <Sidenav id="notes-preview-sidenav" title={note.title} open>
      <NotePreview note={note} />
    </Sidenav>,
  );
});
