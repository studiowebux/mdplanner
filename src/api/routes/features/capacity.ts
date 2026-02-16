/**
 * Capacity Planning routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";
import { Task } from "../../../lib/types.ts";

export const capacityRouter = new Hono<{ Variables: AppVariables }>();

function getUnassignedTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const collect = (taskList: Task[]) => {
    for (const task of taskList) {
      if (!task.completed && !task.config.assignee) {
        result.push(task);
      }
      if (task.children) collect(task.children);
    }
  };
  collect(tasks);
  return result;
}

// GET /capacity - list all capacity plans
capacityRouter.get("/", async (c) => {
  const parser = getParser(c);
  const plans = await parser.readCapacityPlans();
  return jsonResponse(plans);
});

// POST /capacity - create capacity plan
capacityRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const plans = await parser.readCapacityPlans();
  const newPlan = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title || "New Capacity Plan",
    date: body.date || new Date().toISOString().split("T")[0],
    budgetHours: body.budgetHours,
    teamMembers: body.teamMembers || [],
    allocations: body.allocations || [],
  };
  plans.push(newPlan);
  await parser.saveCapacityPlans(plans);
  return jsonResponse(newPlan, 201);
});

// GET /capacity/:id - get single capacity plan
capacityRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === id);
  if (!plan) return errorResponse("Not found", 404);
  return jsonResponse(plan);
});

// PUT /capacity/:id - update capacity plan
capacityRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const plans = await parser.readCapacityPlans();
  const index = plans.findIndex((p) => p.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  plans[index] = { ...plans[index], ...body };
  await parser.saveCapacityPlans(plans);
  return jsonResponse(plans[index]);
});

// DELETE /capacity/:id - delete capacity plan
capacityRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const plans = await parser.readCapacityPlans();
  const filtered = plans.filter((p) => p.id !== id);
  if (filtered.length === plans.length) return errorResponse("Not found", 404);
  await parser.saveCapacityPlans(filtered);
  return jsonResponse({ success: true });
});

// POST /capacity/:id/members - add team member
capacityRouter.post("/:id/members", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const body = await c.req.json();
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  const newMember = {
    id: crypto.randomUUID().substring(0, 8),
    name: body.name,
    role: body.role,
    hoursPerDay: body.hoursPerDay || 8,
    workingDays: body.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
  };
  plan.teamMembers.push(newMember);
  await parser.saveCapacityPlans(plans);
  return jsonResponse(newMember, 201);
});

// PUT /capacity/:id/members/:mid - update team member
capacityRouter.put("/:id/members/:mid", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const memberId = c.req.param("mid");
  const body = await c.req.json();
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  const memberIndex = plan.teamMembers.findIndex((m) => m.id === memberId);
  if (memberIndex === -1) return errorResponse("Member not found", 404);

  plan.teamMembers[memberIndex] = { ...plan.teamMembers[memberIndex], ...body };
  await parser.saveCapacityPlans(plans);
  return jsonResponse(plan.teamMembers[memberIndex]);
});

// DELETE /capacity/:id/members/:mid - delete team member
capacityRouter.delete("/:id/members/:mid", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const memberId = c.req.param("mid");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  const filtered = plan.teamMembers.filter((m) => m.id !== memberId);
  if (filtered.length === plan.teamMembers.length) {
    return errorResponse("Member not found", 404);
  }

  plan.teamMembers = filtered;
  plan.allocations = plan.allocations.filter((a) => a.memberId !== memberId);
  await parser.saveCapacityPlans(plans);
  return jsonResponse({ success: true });
});

// POST /capacity/:id/allocations - add allocation
capacityRouter.post("/:id/allocations", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const body = await c.req.json();
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  const newAllocation = {
    id: crypto.randomUUID().substring(0, 8),
    memberId: body.memberId,
    weekStart: body.weekStart,
    allocatedHours: body.allocatedHours || 0,
    targetType: body.targetType || "project",
    targetId: body.targetId,
    notes: body.notes,
  };
  plan.allocations.push(newAllocation);
  await parser.saveCapacityPlans(plans);
  return jsonResponse(newAllocation, 201);
});

// PUT /capacity/:id/allocations/:aid - update allocation
capacityRouter.put("/:id/allocations/:aid", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const allocId = c.req.param("aid");
  const body = await c.req.json();
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  const allocIndex = plan.allocations.findIndex((a) => a.id === allocId);
  if (allocIndex === -1) return errorResponse("Allocation not found", 404);

  plan.allocations[allocIndex] = { ...plan.allocations[allocIndex], ...body };
  await parser.saveCapacityPlans(plans);
  return jsonResponse(plan.allocations[allocIndex]);
});

// DELETE /capacity/:id/allocations/:aid - delete allocation
capacityRouter.delete("/:id/allocations/:aid", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const allocId = c.req.param("aid");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  const filtered = plan.allocations.filter((a) => a.id !== allocId);
  if (filtered.length === plan.allocations.length) {
    return errorResponse("Allocation not found", 404);
  }

  plan.allocations = filtered;
  await parser.saveCapacityPlans(plans);
  return jsonResponse({ success: true });
});

// GET /capacity/:id/utilization - get utilization report
capacityRouter.get("/:id/utilization", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  const timeEntries = await parser.readTimeEntries();

  const utilization = plan.teamMembers.map((member) => {
    const weeklyCapacity = member.hoursPerDay * member.workingDays.length;
    const allocatedByWeek = new Map<string, number>();

    for (
      const alloc of plan.allocations.filter((a) => a.memberId === member.id)
    ) {
      const current = allocatedByWeek.get(alloc.weekStart) || 0;
      allocatedByWeek.set(alloc.weekStart, current + alloc.allocatedHours);
    }

    let actualHours = 0;
    for (const [, entries] of timeEntries) {
      for (const entry of entries) {
        if (entry.person === member.name || entry.person === member.id) {
          actualHours += entry.hours;
        }
      }
    }

    const totalAllocated = Array.from(allocatedByWeek.values()).reduce(
      (a, b) => a + b,
      0,
    );

    return {
      memberId: member.id,
      memberName: member.name,
      weeklyCapacity,
      allocatedByWeek: Object.fromEntries(allocatedByWeek),
      totalAllocated,
      actualHours,
      utilizationPercent: weeklyCapacity > 0
        ? Math.round((totalAllocated / weeklyCapacity) * 100)
        : 0,
    };
  });

  return jsonResponse(utilization);
});

// GET /capacity/:id/suggest-assignments - auto-assign suggestions
capacityRouter.get("/:id/suggest-assignments", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  const tasks = await parser.readTasks();
  const unassignedTasks = getUnassignedTasks(tasks).sort((a, b) =>
    (a.config.priority || 999) - (b.config.priority || 999)
  );

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(monday.getDate() - monday.getDay() + 1);
  const weekStart = monday.toISOString().split("T")[0];

  const memberCapacity = new Map<string, number>();
  for (const member of plan.teamMembers) {
    const weeklyCapacity = member.hoursPerDay * member.workingDays.length;
    const allocated = plan.allocations
      .filter((a) => a.memberId === member.id && a.weekStart === weekStart)
      .reduce((sum, a) => sum + a.allocatedHours, 0);
    memberCapacity.set(member.id, weeklyCapacity - allocated);
  }

  const suggestions: Array<
    {
      taskId: string;
      taskTitle: string;
      memberId: string;
      memberName: string;
      hours: number;
      weekStart: string;
    }
  > = [];

  for (const task of unassignedTasks) {
    const effort = task.config.effort || 8;

    let bestMember: { id: string; name: string } | null = null;
    let maxCapacity = 0;

    for (const member of plan.teamMembers) {
      const remaining = memberCapacity.get(member.id) || 0;
      if (remaining >= effort && remaining > maxCapacity) {
        maxCapacity = remaining;
        bestMember = { id: member.id, name: member.name };
      }
    }

    if (bestMember) {
      suggestions.push({
        taskId: task.id,
        taskTitle: task.title,
        memberId: bestMember.id,
        memberName: bestMember.name,
        hours: effort,
        weekStart,
      });
      memberCapacity.set(
        bestMember.id,
        (memberCapacity.get(bestMember.id) || 0) - effort,
      );
    }
  }

  return jsonResponse(suggestions);
});

// POST /capacity/:id/apply-assignments - apply auto-assign suggestions
capacityRouter.post("/:id/apply-assignments", async (c) => {
  const parser = getParser(c);
  const planId = c.req.param("id");
  const body = await c.req.json();
  const suggestions = body.suggestions || [];

  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return errorResponse("Plan not found", 404);

  for (const suggestion of suggestions) {
    plan.allocations.push({
      id: crypto.randomUUID().substring(0, 8),
      memberId: suggestion.memberId,
      weekStart: suggestion.weekStart,
      allocatedHours: suggestion.hours,
      targetType: "task",
      targetId: suggestion.taskId,
    });

    const member = plan.teamMembers.find((m) => m.id === suggestion.memberId);
    if (member) {
      await parser.updateTask(suggestion.taskId, {
        config: { assignee: member.name },
      });
    }
  }

  await parser.saveCapacityPlans(plans);
  return jsonResponse({ success: true, applied: suggestions.length });
});
