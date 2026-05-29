// Task view routes — factory-generated + custom detail + quick actions.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { createDomainForm } from "../../factories/domain-view.tsx";
import { TASK_FORM_FIELDS, taskConfig } from "../../domains/task/config.tsx";
import { sortTasks } from "../../domains/task/constants.tsx";
import type { AppContext } from "../../types/app.ts";
import {
  getGitHubService,
  getPortfolioService,
  getProjectDir,
  getTaskService,
} from "../../singletons/services.ts";
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
  return c.html(TaskForm({ prefillValues }) as unknown as string);
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
  c.header(
    "HX-Trigger",
    hxTrigger("success", assignee ? `Assigned to ${assignee}` : "Unassigned"),
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
  if (!task.project) return null;
  const all = await getPortfolioService().list();
  const match = all.find((p) =>
    p.name.toLowerCase() === task.project!.toLowerCase()
  );
  if (!match?.githubRepo) return null;
  return { repo: match.githubRepo, inherited: match.name };
}

async function renderGitHubFragment(
  // deno-lint-ignore no-explicit-any
  c: { html: (h: any) => any },
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

// POST /:id/reorder — drag-and-drop order within section
tasksRouter.post("/:id/reorder", async (c) => {
  const id = c.req.param("id")!;
  const body = await c.req.json<{ afterId?: string | null }>();
  const afterId = body.afterId ?? null;

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

  const all = await getTaskService().list();
  const sectionTasks = sortTasks(all.filter((t) => t.section === task.section));
  const without = sectionTasks.filter((t) => t.id !== id);

  let insertIdx = 0;
  if (afterId != null) {
    const afterIdx = without.findIndex((t) => t.id === afterId);
    insertIdx = afterIdx === -1 ? without.length : afterIdx + 1;
  }
  without.splice(insertIdx, 0, task);

  await Promise.all(
    without.map((t, i) => {
      const normalized = (i + 1) * 10;
      if (t.order !== normalized) {
        return getTaskService().update(t.id, { order: normalized });
      }
      return Promise.resolve();
    }),
  );

  // Clear sort state so page refresh respects drag order
  deleteUiStateKeys(c, "tasks", ["sort", "order"]);

  publish("task.updated");
  return new Response(null, { status: 204 });
});

// POST /batch — bulk update tasks (move section, tag add/remove)
tasksRouter.post("/batch", async (c) => {
  const items = await c.req.json<
    Array<{ id: string; updates: Record<string, unknown> }>
  >();
  if (!Array.isArray(items) || items.length === 0) {
    return new Response(null, {
      status: 400,
      headers: { "HX-Trigger": hxTrigger("error", "No items provided") },
    });
  }
  // Per-id archive guard: archived ids are dropped from the batch; the
  // rest flow through batchUpdate. Mirrors the OpenAPI batch route.
  const svc = getTaskService();
  const live: typeof items = [];
  let droppedArchived = 0;
  for (const u of items) {
    const current = await svc.getById(u.id);
    if (current && current.archived === true) droppedArchived++;
    else live.push(u);
  }
  if (live.length > 0) await svc.batchUpdate(live);
  publish("task.updated");
  return new Response(null, {
    status: 204,
    ...(droppedArchived > 0
      ? {
        headers: {
          "HX-Trigger": hxTrigger(
            "error",
            `${droppedArchived} archived task(s) skipped`,
          ),
        },
      }
      : {}),
  });
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
