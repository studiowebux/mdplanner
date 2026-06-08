// Task view routes — factory-generated + custom detail + quick actions.

import {
  createDomainRoutes,
  resolveDomainHelpers,
} from "../../factories/domain-routes.ts";
import { createDomainForm } from "../../factories/domain-view.tsx";
import { loadFilteredItems } from "../../factories/domain-routes-collection.ts";
import { TASK_FORM_FIELDS, taskConfig } from "../../domains/task/config.tsx";
import {
  DEFAULT_TASKS_PER_SECTION,
  getMoveSectionOrder,
  sortTasks,
  sortTasksInSection,
} from "../../domains/task/constants.tsx";
import { TaskRow } from "../components/task-list.tsx";
import { BoardCard } from "../components/task-board.tsx";
import { SectionLoadMore } from "../components/task-pagination.tsx";
import type { AppContext } from "../../types/app.ts";
import type { DomainFilterState } from "../../factories/domain.types.ts";
import {
  getGitHubService,
  getPeopleService,
  getPortfolioService,
  getProjectDir,
  getProjectService,
  getTaskService,
} from "../../singletons/services.ts";
import { personLabel } from "../../utils/person-name-match.ts";
import { publish } from "../../singletons/event-bus.ts";
import {
  TaskGitHubEmpty,
  TaskGitHubError,
  TaskGitHubSection,
} from "../task-github.tsx";
import {
  LogTimeForm,
  resolveTaskDetailProps,
  TaskDetailView,
} from "../task-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { toHtml } from "../../utils/html.ts";
import { deleteUiStateKeys } from "../../utils/ui-state.ts";
import type { Task } from "../../types/task.types.ts";

export const tasksRouter = createDomainRoutes(taskConfig);

const TaskForm = createDomainForm({
  domain: "tasks",
  singular: "Task",
  fields: TASK_FORM_FIELDS,
});

/**
 * Guard a single-task mutation: resolves the task, returns a 422 with an
 * HX-Trigger error toast when archived, 404 when missing. Returns
 * `{ task }` when safe to proceed. Pattern: Strategic Levels view-route
 * guard (commit 9039731).
 */
async function requireLiveTask(
  c: AppContext,
  id: string,
): Promise<{ task: Task } | { response: Response }> {
  const task = await getTaskService().getById(id);
  if (!task) return { response: await c.notFound() };
  if (task.archived === true) {
    return {
      response: new Response(
        JSON.stringify({ error: "Task is archived" }),
        {
          status: 422,
          headers: {
            "Content-Type": "application/json",
            "HX-Trigger": hxTrigger("error", "Task is archived"),
          },
        },
      ),
    };
  }
  return { task };
}

// ---------------------------------------------------------------------------
// GET /prefill-new — create-task form with query-param prefill
// Used by meeting action items to seed the title field.
// ---------------------------------------------------------------------------

tasksRouter.get("/prefill-new", (c) => {
  const title = c.req.query("title") ?? "";
  const description = c.req.query("description") ?? "";
  const prefillValues: Record<string, string> = {};
  if (title) prefillValues.title = title;
  if (description) prefillValues.description = description;
  return c.html(toHtml(TaskForm({ prefillValues })));
});

// ---------------------------------------------------------------------------
// Shared — fetch task + resolve props + render
// ---------------------------------------------------------------------------

async function renderDetailPage(c: AppContext, id: string) {
  const task = await getTaskService().getById(id);
  if (!task) return c.notFound();
  const props = await resolveTaskDetailProps(task);
  return c.html(
    <TaskDetailView {...viewProps(c, "/tasks")} task={task} {...props} />,
  );
}

// ---------------------------------------------------------------------------
// GET /more-section — per-section pagination for the list/board views.
// Registered BEFORE GET /:id so the literal path is not captured as an id.
// Reads the target `section`, the `view` (list|board), and the `offset` already
// rendered above; carries the current filter state forward in the query so the
// next chunk matches exactly what the view shows. Rebuilds the IDENTICAL filter
// pipeline via resolveDomainHelpers + loadFilteredItems (shared with /view) so
// pagination never drifts from the rendered set. Returns the next chunk of
// rows/cards plus a fresh load-more control while more remain.
// ---------------------------------------------------------------------------

tasksRouter.get("/more-section", async (c) => {
  const section = c.req.query("section") ?? "";
  const view = c.req.query("view") === "board" ? "board" : "list";
  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0", 10) || 0);
  if (!section) return c.body(null, 204);

  const state = c.get("filterState" as never) as DomainFilterState;
  const { helpers } = resolveDomainHelpers(taskConfig);
  const { filtered } = await loadFilteredItems(c, taskConfig, helpers, state);

  const sectionTasks = filtered.filter((t) => t.section === section);
  const sorted = view === "board"
    ? sortTasks(sectionTasks)
    : sortTasksInSection(sectionTasks, state.sort, state.order);

  const config = await getProjectService().getConfig();
  const pageSize = config.tasksPerSection ?? DEFAULT_TASKS_PER_SECTION;
  const chunk = sorted.slice(offset, offset + pageSize);
  const nextOffset = offset + chunk.length;
  const remaining = sorted.length - nextOffset;

  if (view === "board") {
    return c.html(
      toHtml(
        <>
          {chunk.map((t) => <BoardCard key={t.id} task={t} />)}
          {remaining > 0 && (
            <SectionLoadMore
              state={state}
              section={section}
              view="board"
              offset={nextOffset}
              remaining={remaining}
            />
          )}
        </>,
      ),
    );
  }

  const people = await getPeopleService().list();
  const peopleOptions = people
    .map((p) => ({ value: p.id, label: p.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const moveSections = getMoveSectionOrder(filtered);
  return c.html(
    toHtml(
      <>
        {chunk.map((t, i) => (
          <TaskRow
            key={t.id}
            task={t}
            peopleOptions={peopleOptions}
            moveSections={moveSections}
            index={offset + i}
            archived={state.archived === "true"}
          />
        ))}
        {remaining > 0 && (
          <SectionLoadMore
            state={state}
            section={section}
            view="list"
            offset={nextOffset}
            remaining={remaining}
          />
        )}
      </>,
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /:id — detail page
// ---------------------------------------------------------------------------

tasksRouter.get("/:id", async (c) => {
  return renderDetailPage(c, c.req.param("id"));
});

// ---------------------------------------------------------------------------
// POST /:id/complete — mark task complete, move to Done
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/complete", async (c) => {
  const id = c.req.param("id");
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  const svc = getTaskService();
  await svc.update(id, { completed: true });
  await svc.moveTask(id, "Done");
  publish("task.updated");
  c.header("HX-Trigger", hxTrigger("success", "Task marked complete"));
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// POST /:id/reopen — unmark complete, move to Todo
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/reopen", async (c) => {
  const id = c.req.param("id");
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  const svc = getTaskService();
  await svc.update(id, { completed: false });
  await svc.moveTask(id, "Todo");
  publish("task.updated");
  c.header("HX-Trigger", hxTrigger("success", "Task reopened"));
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// POST /:id/move — change section
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/move", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const section = String(body.section ?? "");
  if (!section) return c.text("Missing section", 400);

  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  await getTaskService().moveTask(id, section);
  publish("task.updated");
  c.header("HX-Trigger", hxTrigger("success", `Moved to ${section}`));
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// POST /:id/assign — set assignee
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/assign", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const assignee = String(body.assignee ?? "").trim() || undefined;

  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  await getTaskService().update(id, { assignee });
  publish("task.updated");
  // assignee is a person ID — resolve to the name for the toast (falls back to
  // the raw value for legacy free-text data).
  const assigneeName = assignee
    ? personLabel(assignee, await getPeopleService().list())
    : "";
  c.header(
    "HX-Trigger",
    hxTrigger(
      "success",
      assignee ? `Assigned to ${assigneeName}` : "Unassigned",
    ),
  );
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// POST /:id/comments — add a comment (form-urlencoded from inline form)
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/comments", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const text = String(body.body ?? "").trim();
  if (!text) return c.text("Missing body", 400);

  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  await getTaskService().addComment(id, text);
  publish("task.updated");
  c.header("HX-Trigger", hxTrigger("success", "Comment added"));
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// GitHub section fragment + link/unlink actions
// ---------------------------------------------------------------------------

async function resolveGitHubRepo(
  task: { githubRepo?: string | null; project?: string | null },
): Promise<{ repo: string; inherited: string | null } | null> {
  if (task.githubRepo) return { repo: task.githubRepo, inherited: null };
  const project = task.project;
  if (!project) return null;
  const all = await getPortfolioService().list();
  const match = all.find((p) => p.name.toLowerCase() === project.toLowerCase());
  if (!match?.githubRepo) return null;
  return { repo: match.githubRepo, inherited: match.name };
}

async function renderGitHubFragment(
  c: AppContext,
  taskId: string,
) {
  const task = await getTaskService().getById(taskId);
  if (!task) return c.html(<TaskGitHubEmpty taskId={taskId} />);

  const resolved = await resolveGitHubRepo(task);
  if (!resolved) {
    return c.html(<TaskGitHubEmpty taskId={taskId} />);
  }

  const effectiveRepo = resolved.repo;
  try {
    const gh = getGitHubService();
    const [issue, pr] = await Promise.all([
      task.githubIssue
        ? gh.getIssue(effectiveRepo, task.githubIssue)
        : Promise.resolve(null),
      task.githubPR
        ? gh.getPR(effectiveRepo, task.githubPR)
        : Promise.resolve(null),
    ]);
    return c.html(
      <TaskGitHubSection
        task={task}
        issue={issue}
        pr={pr}
        inheritedFrom={resolved.inherited}
        effectiveRepo={effectiveRepo}
      />,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(<TaskGitHubError taskId={taskId} message={msg} />);
  }
}

tasksRouter.get("/:id/github", async (c) => {
  return renderGitHubFragment(c, c.req.param("id"));
});

tasksRouter.post("/:id/github/link-issue", async (c) => {
  const id = c.req.param("id");
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  const body = await c.req.parseBody();
  const issueNumber = Number(body.issueNumber) || undefined;
  const prNumber = Number(body.prNumber) || undefined;
  const githubRepo = String(body.githubRepo ?? "").trim() || undefined;
  const updates: Record<string, unknown> = {};
  if (issueNumber) updates.githubIssue = issueNumber;
  if (prNumber) updates.githubPR = prNumber;
  if (githubRepo) updates.githubRepo = githubRepo;
  if (Object.keys(updates).length > 0) {
    await getTaskService().update(id, updates);
    publish("task.updated");
  }
  return renderGitHubFragment(c, id);
});

tasksRouter.post("/:id/github/link-pr", async (c) => {
  const id = c.req.param("id");
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  const body = await c.req.parseBody();
  const prNumber = Number(body.prNumber) || undefined;
  const githubRepo = String(body.githubRepo ?? "").trim() || undefined;
  const updates: Record<string, unknown> = {};
  if (prNumber) updates.githubPR = prNumber;
  if (githubRepo) updates.githubRepo = githubRepo;
  if (Object.keys(updates).length > 0) {
    await getTaskService().update(id, updates);
    publish("task.updated");
  }
  return renderGitHubFragment(c, id);
});

tasksRouter.post("/:id/github/unlink-issue", async (c) => {
  const id = c.req.param("id");
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  await getTaskService().update(id, { githubIssue: undefined });
  publish("task.updated");
  return renderGitHubFragment(c, id);
});

tasksRouter.post("/:id/github/unlink-pr", async (c) => {
  const id = c.req.param("id");
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  await getTaskService().update(id, { githubPR: undefined });
  publish("task.updated");
  return renderGitHubFragment(c, id);
});

// Parse repeated `taskId` form fields (hx-include of checked row checkboxes)
// into a string[] — shared by the htmx bulk-bar endpoints below.
function parseTaskIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return raw != null ? [String(raw)] : [];
}

// POST /reorder — SortableJS drag reorder/move. Reads the target
// `reorderSection` plus the ordered `sid` fields (one hidden input per row, in
// post-drag DOM order) and reconciles section + order in a single pass. A
// cross-section drag posts twice — the source list and the target list each
// reconcile their own section. See
// `[decision] MD Planner — htmx drag strategy: Sortable for lists ...`.
tasksRouter.post("/reorder", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const section = String(body["reorderSection"] ?? "").trim();
  const ids = parseTaskIds(body["sid"]);
  if (!section || ids.length === 0) return c.body(null, 204);

  const all = await getTaskService().list();
  const byId = new Map(all.map((t) => [t.id, t]));

  await Promise.all(
    ids.map((id, i) => {
      const task = byId.get(id);
      if (!task || task.archived === true) return Promise.resolve();
      const order = (i + 1) * 10;
      const patch: { section?: string; order?: number } = {};
      if (task.section !== section) patch.section = section;
      if (task.order !== order) patch.order = order;
      if (Object.keys(patch).length === 0) return Promise.resolve();
      return getTaskService().update(id, patch);
    }),
  );

  // Clear sort state so a page refresh respects the new drag order.
  await deleteUiStateKeys(c, "tasks", ["sort", "order"]);
  publish("task.updated");
  return c.body(null, 204);
});

// POST /batch-delete — htmx bulk soft-delete (archive) for the task-list bulk
// bar. Reads repeated `taskId` form fields from hx-include of checked row
// checkboxes, archives each (skipping missing/already-archived), then asks htmx
// to refresh so the deleted rows drop out of the list.
tasksRouter.post("/batch-delete", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const ids = parseTaskIds(body["taskId"]);

  let archived = 0;
  for (const id of ids) {
    const task = await getTaskService().getById(id);
    if (!task || task.archived === true) continue;
    if (await getTaskService().delete(id)) archived++;
  }

  if (archived > 0) publish("task.deleted");
  c.header("HX-Refresh", "true");
  return c.body(null, 204);
});

// POST /batch-move — htmx bulk section move for the task-list bulk bar.
// Reads checked `taskId` fields + the target `section`, moves each live task,
// then refreshes the list.
tasksRouter.post("/batch-move", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const ids = parseTaskIds(body["taskId"]);
  const section = String(body["section"] ?? "").trim();

  if (ids.length > 0 && section) {
    const svc = getTaskService();
    const updates: Array<{ id: string; updates: { section: string } }> = [];
    for (const id of ids) {
      const task = await svc.getById(id);
      if (!task || task.archived === true) continue;
      updates.push({ id, updates: { section } });
    }
    if (updates.length > 0) {
      await svc.batchUpdate(updates);
      publish("task.updated");
    }
  }

  c.header("HX-Refresh", "true");
  return c.body(null, 204);
});

// POST /batch-complete — htmx bulk "mark complete & move to Done" for the
// task-list bulk bar. Reads checked `taskId` fields, sets completed:true and
// moves each live task to Done in one pass (moveToSection is just
// update({section})), then refreshes the list. Distinct from /batch-move,
// which must NOT set completed. Idempotent for already-done/already-completed
// tasks; archived tasks are skipped.
tasksRouter.post("/batch-complete", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const ids = parseTaskIds(body["taskId"]);

  if (ids.length > 0) {
    const svc = getTaskService();
    const updates: Array<
      { id: string; updates: { completed: boolean; section: string } }
    > = [];
    for (const id of ids) {
      const task = await svc.getById(id);
      if (!task || task.archived === true) continue;
      updates.push({ id, updates: { completed: true, section: "Done" } });
    }
    if (updates.length > 0) {
      await svc.batchUpdate(updates);
      publish("task.updated");
    }
  }

  c.header("HX-Refresh", "true");
  return c.body(null, 204);
});

// POST /batch-tag — htmx bulk add/remove a tag for the task-list bulk bar.
// Reads checked `taskId` fields, the `tag`, and `mode` (add|remove); the next
// tag set is computed per task server-side, then the list refreshes.
tasksRouter.post("/batch-tag", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const ids = parseTaskIds(body["taskId"]);
  const tag = String(body["tag"] ?? "").trim();
  const mode = String(body["mode"] ?? "add");

  if (ids.length > 0 && tag) {
    const svc = getTaskService();
    const updates: Array<{ id: string; updates: { tags: string[] } }> = [];
    for (const id of ids) {
      const task = await svc.getById(id);
      if (!task || task.archived === true) continue;
      const current = task.tags ?? [];
      const next = mode === "remove"
        ? current.filter((t) => t !== tag)
        : current.includes(tag)
        ? current
        : [...current, tag];
      updates.push({ id, updates: { tags: next } });
    }
    if (updates.length > 0) {
      await svc.batchUpdate(updates);
      publish("task.updated");
    }
  }

  c.header("HX-Refresh", "true");
  return c.body(null, 204);
});

// POST /:id/time-entries — create time entry, reload detail page
tasksRouter.post("/:id/time-entries", async (c) => {
  const id = c.req.param("id");
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  const body = await c.req.parseBody();
  const hours = Number(body.hours);
  if (!hours || isNaN(hours)) {
    return new Response(null, {
      status: 422,
      headers: { "HX-Trigger": hxTrigger("error", "Hours is required") },
    });
  }
  const entry = await getTaskService().addTimeEntry(id, {
    date: String(body.date ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    hours,
    person: String(body.person ?? "").trim() || undefined,
    description: String(body.description ?? "").trim() || undefined,
  });
  if (!entry) return c.notFound();
  publish("task.updated");
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/tasks/${id}` },
  });
});

// DELETE /:id/time-entries/:entryId — remove time entry, reload detail page
tasksRouter.delete("/:id/time-entries/:entryId", async (c) => {
  const id = c.req.param("id");
  const entryId = c.req.param("entryId");
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  await getTaskService().deleteTimeEntry(id, entryId);
  publish("task.updated");
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/tasks/${id}` },
  });
});

// GET /:id/time-entries/new — log time sidenav form
tasksRouter.get("/:id/time-entries/new", async (c) => {
  const id = c.req.param("id");
  const task = await getTaskService().getById(id);
  if (!task) return c.notFound();
  const actor = c.get("actor");
  const isAnon = !actor || actor.source === "anonymous";
  return c.html(
    <LogTimeForm
      taskId={id}
      actorName={isAnon ? undefined : actor.name}
      actorId={isAnon ? undefined : actor.id}
    />,
  );
});

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /:id/upload — multipart file upload
tasksRouter.post("/:id/upload", async (c) => {
  const id = c.req.param("id")!;
  const task = await getTaskService().getById(id);
  if (!task) return c.notFound();
  if (task.archived === true) {
    return new Response(
      JSON.stringify({ error: "Task is archived" }),
      {
        status: 422,
        headers: {
          "Content-Type": "application/json",
          "HX-Trigger": hxTrigger("error", "Task is archived"),
        },
      },
    );
  }
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || typeof file === "string") {
    return new Response(null, {
      status: 400,
      headers: { "HX-Trigger": hxTrigger("error", "No file provided") },
    });
  }
  if ((file as File).size > MAX_UPLOAD_BYTES) {
    return new Response(null, {
      status: 413,
      headers: { "HX-Trigger": hxTrigger("error", "Max 10 MB per file") },
    });
  }
  const uploadsDir = `${getProjectDir()}/uploads/${id}`;
  await Deno.mkdir(uploadsDir, { recursive: true });
  const safeName = (file as File).name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const bytes = new Uint8Array(await (file as File).arrayBuffer());
  await Deno.writeFile(`${uploadsDir}/${safeName}`, bytes);
  const relPath = `uploads/${id}/${safeName}`;
  await getTaskService().addAttachments(id, [relPath]);
  publish("task.updated");
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/tasks/${id}` },
  });
});

// DELETE /:id/upload/:filename — remove an uploaded file
tasksRouter.delete("/:id/upload/:filename", async (c) => {
  const id = c.req.param("id")!;
  const guard = await requireLiveTask(c, id);
  if ("response" in guard) return guard.response;
  const safeName = c.req.param("filename").replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${getProjectDir()}/uploads/${id}/${safeName}`;
  try {
    await Deno.remove(filePath);
  } catch {
    return c.notFound();
  }
  const task = await getTaskService().getById(id);
  if (task) {
    const relPath = `uploads/${id}/${safeName}`;
    const remaining = (task.attachments ?? []).filter((a) => a !== relPath);
    await getTaskService().update(id, { attachments: remaining });
  }
  publish("task.updated");
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/tasks/${id}` },
  });
});
