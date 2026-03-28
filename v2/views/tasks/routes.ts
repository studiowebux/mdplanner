// Task view routes — factory-generated + custom detail + quick actions.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { taskConfig } from "../../domains/task/config.tsx";
import type { AppContext } from "../../types/app.ts";
import { getGitHubService, getTaskService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import {
  TaskGitHubEmpty,
  TaskGitHubError,
  TaskGitHubSection,
} from "../task-github.tsx";
import { resolveTaskDetailProps, TaskDetailView } from "../task-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";

export const tasksRouter = createDomainRoutes(taskConfig);

// ---------------------------------------------------------------------------
// Shared — fetch task + resolve props + render
// ---------------------------------------------------------------------------

async function renderDetailPage(c: AppContext, id: string) {
  const task = await getTaskService().getById(id);
  if (!task) return c.notFound();
  const props = await resolveTaskDetailProps(task);
  return c.html(
    (TaskDetailView({
      ...viewProps(c, "/tasks"),
      task,
      ...props,
    }))!,
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

  await getTaskService().update(id, { assignee });
  publish("task.updated");
  c.header(
    "HX-Trigger",
    hxTrigger("success", assignee ? `Assigned to ${assignee}` : "Unassigned"),
  );
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// GitHub section fragment + link/unlink actions
// ---------------------------------------------------------------------------

async function renderGitHubFragment(
  // deno-lint-ignore no-explicit-any
  c: { html: (h: any) => any },
  taskId: string,
) {
  const task = await getTaskService().getById(taskId);
  if (!task || !task.githubRepo) {
    return c.html((TaskGitHubEmpty({ taskId }))!);
  }
  try {
    const gh = getGitHubService();
    const [issue, pr] = await Promise.all([
      task.githubIssue
        ? gh.getIssue(task.githubRepo, task.githubIssue)
        : Promise.resolve(null),
      task.githubPR
        ? gh.getPR(task.githubRepo, task.githubPR)
        : Promise.resolve(null),
    ]);
    return c.html(
      (TaskGitHubSection({ task, issue, pr }))!,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(
      (TaskGitHubError({ taskId, message: msg }))!,
    );
  }
}

tasksRouter.get("/:id/github", async (c) => {
  return renderGitHubFragment(c, c.req.param("id"));
});

tasksRouter.post("/:id/github/link-issue", async (c) => {
  const id = c.req.param("id");
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
  await getTaskService().update(id, { githubIssue: undefined });
  publish("task.updated");
  return renderGitHubFragment(c, id);
});

tasksRouter.post("/:id/github/unlink-pr", async (c) => {
  const id = c.req.param("id");
  await getTaskService().update(id, { githubPR: undefined });
  publish("task.updated");
  return renderGitHubFragment(c, id);
});
