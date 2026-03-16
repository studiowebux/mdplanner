import { Hono } from "hono";
import { getMilestoneService } from "../../singletons/services.ts";
import { MilestonesView, MilestonesGrid, MilestonesTable } from "../milestones.tsx";
import { MilestoneDetailView } from "../milestone-detail.tsx";
import { MilestoneCard } from "../components/milestone-card.tsx";
import { MilestoneRow } from "../components/milestone-row.tsx";
import type { AppVariables } from "../../types/app.ts";
import { parseViewMode } from "../../utils/view.ts";

export const milestonesViewRouter = new Hono<{ Variables: AppVariables }>();

// Full page — renders only the active view (grid or table).
milestonesViewRouter.get("/", async (c) => {
  const view = parseViewMode(c.req.query("view"));
  const milestones = await getMilestoneService().list();
  return c.html(
    MilestonesView({ milestones, nonce: c.get("nonce"), activePath: "/milestones", view }) as unknown as string,
  );
});

// View fragment — htmx swaps this into #milestones-view on toggle.
milestonesViewRouter.get("/view", async (c) => {
  const mode = parseViewMode(c.req.query("mode"));
  const milestones = await getMilestoneService().list();
  const fragment = mode === "table"
    ? MilestonesTable({ milestones })
    : MilestonesGrid({ milestones });
  return c.html(fragment as unknown as string);
});

// Detail view — full milestone info + task list grouped by section.
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

// Row fragment — fetched by SSE client to swap table rows.
milestonesViewRouter.get("/:id/row", async (c) => {
  const id = c.req.param("id");
  const m = await getMilestoneService().getById(id);
  if (!m) return c.notFound();
  return c.html(
    MilestoneRow({ milestone: m }) as unknown as string,
  );
});

// Card fragment — fetched by SSE client to swap individual cards.
milestonesViewRouter.get("/:id/card", async (c) => {
  const id = c.req.param("id");
  const m = await getMilestoneService().getById(id);
  if (!m) return c.notFound();
  return c.html(
    MilestoneCard({ milestone: m }) as unknown as string,
  );
});
