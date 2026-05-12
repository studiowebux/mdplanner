// Capacity plan view routes — factory list/create/edit + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { capacityPlanConfig } from "../../domains/capacity-plan/config.tsx";
import {
  getCapacityPlanService,
  getMilestoneService,
  getPeopleService,
  getPortfolioService,
  getTaskService,
} from "../../singletons/services.ts";
import type { Task } from "../../types/task.types.ts";
import { CapacityPlanDetailView } from "../capacity-plan-detail.tsx";
import type {
  AllocationSummary,
  GridRow,
  WeekCol,
} from "../capacity-plan-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const capacityPlansViewRouter = createDomainRoutes(capacityPlanConfig);

// ---------------------------------------------------------------------------
// Week helpers
// ---------------------------------------------------------------------------

function getMondayOf(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

function generateWeeks(startDate: string, endDate: string): WeekCol[] {
  const weeks: WeekCol[] = [];
  const endMs = new Date(endDate + "T00:00:00Z").getTime();
  const monday = getMondayOf(startDate);

  while (monday.getTime() <= endMs) {
    const isoMonday = toIso(monday);
    const label = new Date(monday).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    weeks.push({ label, monday: isoMonday });
    monday.setUTCDate(monday.getUTCDate() + 7);
  }
  return weeks;
}

function taskOverlapsWeek(task: Task, weekMonday: string): boolean {
  const weekSunday = addDays(weekMonday, 6);
  const start = task.planned_start ?? task.due_date;
  const end = task.due_date ?? task.planned_start;
  if (!start || !end) return false;
  return start <= weekSunday && end >= weekMonday;
}

// ---------------------------------------------------------------------------
// Detail route
// ---------------------------------------------------------------------------

capacityPlansViewRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getCapacityPlanService().getById(id);
  if (!item) return c.notFound();

  const personIds = new Set(item.teamMembers.map((m) => m.personId));
  const hasProjectAllocs = item.allocations.some((a) =>
    a.targetType === "project"
  );
  const hasMilestoneAllocs = item.allocations.some((a) =>
    a.targetType === "milestone"
  );
  const hasDateRange = !!(item.startDate && item.endDate);
  const hasMembers = item.teamMembers.length > 0;

  const [people, portfolio, milestones, tasks] = await Promise.all([
    personIds.size > 0 ? getPeopleService().list() : Promise.resolve([]),
    hasProjectAllocs ? getPortfolioService().list() : Promise.resolve([]),
    hasMilestoneAllocs ? getMilestoneService().list() : Promise.resolve([]),
    hasMembers && hasDateRange ? getTaskService().list() : Promise.resolve([]),
  ]);

  // Lookup maps
  const personById: Record<string, string> = {};
  for (const p of people) personById[p.id] = p.name;

  // targetId → { title, href } for allocation summary display
  const targetById: Record<string, { title: string; href: string }> = {};
  for (const p of portfolio) {
    targetById[p.id] = { title: p.name, href: `/portfolio/${p.id}` };
  }
  for (const m of milestones) {
    targetById[m.id] = { title: m.name, href: `/milestones/${m.id}` };
  }

  // Allocation summary rows for the config table
  const allocationSummaries: AllocationSummary[] = item.allocations.map(
    (a) => ({
      id: a.id,
      planId: item.id,
      personName: personById[a.personId] ?? a.personId,
      targetTitle: targetById[a.targetId]?.title ?? a.targetId,
      targetHref: targetById[a.targetId]?.href,
      targetType: a.targetType,
      percentage: a.percentage ?? undefined,
      hoursPerWeek: a.hoursPerWeek ?? undefined,
      notes: a.notes ?? undefined,
    }),
  );

  // Grid — only when we have a date range
  let weeks: WeekCol[] = [];
  let gridRows: GridRow[] = [];

  if (hasDateRange) {
    weeks = generateWeeks(item.startDate!, item.endDate!);

    // Tasks assigned to plan members
    const memberTasks = tasks.filter(
      (t) => t.assignee && personIds.has(t.assignee),
    );

    gridRows = item.teamMembers.map((member) => {
      const availHoursPerWeek = (member.hoursPerDay ?? 8) *
        (member.workingDays?.length ?? 5);
      const personAllocs = item.allocations.filter((a) =>
        a.personId === member.personId
      );
      const personTasks = memberTasks.filter((t) =>
        t.assignee === member.personId
      );

      const cells: GridRow["cells"] = {};

      for (const week of weeks) {
        // Planned hours = sum of all allocations for this person this week
        let plannedHours = 0;
        for (const alloc of personAllocs) {
          if (alloc.percentage != null) {
            plannedHours += availHoursPerWeek * (alloc.percentage / 100);
          } else if (alloc.hoursPerWeek != null) {
            plannedHours += alloc.hoursPerWeek;
          }
        }

        // Task hours = estimate spread evenly across weeks the task spans
        const weekTasks: GridRow["cells"][string]["tasks"] = [];
        for (const task of personTasks) {
          if (!taskOverlapsWeek(task, week.monday)) continue;
          const spanCount = weeks.filter((w) =>
            taskOverlapsWeek(task, w.monday)
          ).length;
          const hours = task.effort ? task.effort / Math.max(spanCount, 1) : 0;
          weekTasks.push({ id: task.id, title: task.title, hours });
        }

        cells[week.monday] = {
          plannedHours,
          taskHours: weekTasks.reduce((s, t) => s + t.hours, 0),
          tasks: weekTasks,
        };
      }

      return {
        personId: member.personId,
        personName: personById[member.personId] ?? member.personId,
        cells,
        totalPlanned: Object.values(cells).reduce(
          (s, c) => s + c.plannedHours,
          0,
        ),
        totalTask: Object.values(cells).reduce((s, c) => s + c.taskHours, 0),
      };
    });
  }

  return c.html(
    <CapacityPlanDetailView
      {...viewProps(c, "/capacity-plans")}
      item={item}
      personById={personById}
      allocationSummaries={allocationSummaries}
      weeks={weeks}
      gridRows={gridRows}
    />,
  );
});
