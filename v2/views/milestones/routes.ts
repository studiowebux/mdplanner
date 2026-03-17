import { Hono } from "hono";
import { getMilestoneService } from "../../singletons/services.ts";
import { readUiState, writeUiState, mergeParams } from "../../utils/ui-state.ts";
import { MilestonesView, MilestonesViewContainer } from "../milestones.tsx";
import type { MilestoneFilterState } from "../milestones.tsx";
import { MilestoneDetailView } from "../milestone-detail.tsx";
import { MILESTONE_DOMAIN, MILESTONE_STATE_KEYS } from "../../domains/milestone/constants.tsx";
import type { Milestone } from "../../types/milestone.types.ts";
import type { AppVariables, ViewMode } from "../../types/app.ts";

export const milestonesViewRouter = new Hono<{ Variables: AppVariables }>();

function buildState(merged: Record<string, string>): MilestoneFilterState {
  return {
    view: (merged.view || "grid") as ViewMode,
    status: merged.status || undefined,
    project: merged.project || undefined,
    q: merged.q || undefined,
    hideCompleted: merged.hideCompleted === "true",
    sort: merged.sort || undefined,
    order: (merged.order || "asc") as "asc" | "desc",
  };
}

function applyFilters(milestones: Milestone[], state: MilestoneFilterState): Milestone[] {
  let result = milestones;
  if (state.hideCompleted) result = result.filter((m) => m.status !== "completed");
  if (state.status) result = result.filter((m) => m.status === state.status);
  if (state.project) result = result.filter((m) => m.project === state.project);
  if (state.q) {
    const q = state.q.toLowerCase();
    result = result.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.description ?? "").toLowerCase().includes(q) ||
      (m.project ?? "").toLowerCase().includes(q)
    );
  }
  if (state.sort) {
    const key = state.sort as keyof Milestone;
    const dir = state.order === "desc" ? -1 : 1;
    result = [...result].sort((a, b) =>
      String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * dir
    );
  }
  return result;
}

function extractProjects(milestones: Milestone[]): string[] {
  return [...new Set(milestones.map((m) => m.project).filter(Boolean) as string[])].sort();
}

// Middleware — reads state from query params + cookie, persists after response.
// htmx requests: absent checkbox = unchecked (false). Full page load: fall back to cookie.
milestonesViewRouter.use("*", async (c, next) => {
  const isHtmx = c.req.header("HX-Request") === "true";
  const saved = readUiState<MilestoneFilterState>(c, MILESTONE_DOMAIN);
  const params: Record<string, string | undefined> = {};
  for (const key of MILESTONE_STATE_KEYS) {
    params[key] = c.req.query(key);
  }
  // For htmx requests, absent hideCompleted means unchecked → explicitly "false".
  if (isHtmx && params.hideCompleted === undefined) {
    params.hideCompleted = "false";
  }
  const state = buildState(mergeParams(params, saved));
  c.set("filterState" as never, state as never);
  await next();
  writeUiState(c, MILESTONE_DOMAIN, state);
});

// Full page load.
milestonesViewRouter.get("/", async (c) => {
  const state = c.get("filterState" as never) as MilestoneFilterState;
  const all = await getMilestoneService().list();
  return c.html(
    MilestonesView({
      milestones: applyFilters(all, state),
      nonce: c.get("nonce"),
      activePath: "/milestones",
      state,
      allProjects: extractProjects(all),
    }) as unknown as string,
  );
});

// View fragment — htmx swaps on filter change, view toggle, or SSE event.
milestonesViewRouter.get("/view", async (c) => {
  const state = c.get("filterState" as never) as MilestoneFilterState;
  const all = await getMilestoneService().list();
  return c.html(
    MilestonesViewContainer({ milestones: applyFilters(all, state), state, fragment: true }) as unknown as string,
  );
});

// Detail view.
milestonesViewRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const svc = getMilestoneService();
  const milestone = await svc.getById(id);
  if (!milestone) return c.notFound();
  const tasks = await svc.getTasksForMilestone(milestone.name);
  return c.html(
    MilestoneDetailView({
      milestone,
      tasks,
      nonce: c.get("nonce"),
      activePath: "/milestones",
    }) as unknown as string,
  );
});
