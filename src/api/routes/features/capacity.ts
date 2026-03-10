/**
 * Capacity Planning routes.
 * Team members reference people/ by personId.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";
import { Person, Task } from "../../../lib/types.ts";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

export const capacityRouter = new OpenAPIHono<{ Variables: AppVariables }>();

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

// Helper: build a lookup map of personId -> Person
async function getPeopleMap(
  parser: ReturnType<typeof getParser>,
): Promise<Map<string, Person>> {
  const people = await parser.readPeople();
  const map = new Map<string, Person>();
  for (const person of people) {
    map.set(person.id, person);
  }
  return map;
}

// --- Route definitions ---

const listPlansRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Capacity"],
  summary: "List all capacity plans",
  operationId: "listCapacityPlans",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of capacity plans",
    },
  },
});

const createPlanRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Capacity"],
  summary: "Create a capacity plan",
  operationId: "createCapacityPlan",
  request: {
    body: {
      content: { "application/json": { schema: z.any() } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Created capacity plan",
    },
  },
});

const getPlanRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Capacity"],
  summary: "Get a single capacity plan",
  operationId: "getCapacityPlan",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Capacity plan",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const updatePlanRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Capacity"],
  summary: "Update a capacity plan",
  operationId: "updateCapacityPlan",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: z.any() } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated capacity plan",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deletePlanRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Capacity"],
  summary: "Delete a capacity plan",
  operationId: "deleteCapacityPlan",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Deletion successful",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const addMemberRoute = createRoute({
  method: "post",
  path: "/{id}/members",
  tags: ["Capacity"],
  summary: "Add a team member to a capacity plan",
  operationId: "addCapacityMember",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: z.any() } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Created team member",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Plan not found",
    },
  },
});

const memberParams = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  mid: z.string().openapi({ param: { name: "mid", in: "path" } }),
});

const updateMemberRoute = createRoute({
  method: "put",
  path: "/{id}/members/{mid}",
  tags: ["Capacity"],
  summary: "Update a team member in a capacity plan",
  operationId: "updateCapacityMember",
  request: {
    params: memberParams,
    body: {
      content: { "application/json": { schema: z.any() } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated team member",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteMemberRoute = createRoute({
  method: "delete",
  path: "/{id}/members/{mid}",
  tags: ["Capacity"],
  summary: "Remove a team member from a capacity plan",
  operationId: "removeCapacityMember",
  request: { params: memberParams },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Member removed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const addAllocationRoute = createRoute({
  method: "post",
  path: "/{id}/allocations",
  tags: ["Capacity"],
  summary: "Add an allocation to a capacity plan",
  operationId: "addCapacityAllocation",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: z.any() } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Created allocation",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Plan not found",
    },
  },
});

const allocationParams = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  aid: z.string().openapi({ param: { name: "aid", in: "path" } }),
});

const updateAllocationRoute = createRoute({
  method: "put",
  path: "/{id}/allocations/{aid}",
  tags: ["Capacity"],
  summary: "Update an allocation in a capacity plan",
  operationId: "updateCapacityAllocation",
  request: {
    params: allocationParams,
    body: {
      content: { "application/json": { schema: z.any() } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated allocation",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteAllocationRoute = createRoute({
  method: "delete",
  path: "/{id}/allocations/{aid}",
  tags: ["Capacity"],
  summary: "Delete an allocation from a capacity plan",
  operationId: "removeCapacityAllocation",
  request: { params: allocationParams },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Allocation removed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const utilizationRoute = createRoute({
  method: "get",
  path: "/{id}/utilization",
  tags: ["Capacity"],
  summary: "Get utilization report for a capacity plan",
  operationId: "getCapacityUtilization",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "Utilization report",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Plan not found",
    },
  },
});

const suggestAssignmentsRoute = createRoute({
  method: "get",
  path: "/{id}/suggest-assignments",
  tags: ["Capacity"],
  summary: "Get auto-assign suggestions for a capacity plan",
  operationId: "suggestCapacityAssignments",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "Assignment suggestions",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Plan not found",
    },
  },
});

const applyAssignmentsRoute = createRoute({
  method: "post",
  path: "/{id}/apply-assignments",
  tags: ["Capacity"],
  summary: "Apply auto-assign suggestions to a capacity plan",
  operationId: "applyCapacityAssignments",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: z.any() } },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), applied: z.number() }),
        },
      },
      description: "Assignments applied",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Plan not found",
    },
  },
});

// --- Handlers ---

// GET /capacity - list all capacity plans
capacityRouter.openapi(listPlansRoute, async (c) => {
  const parser = getParser(c);
  const plans = await parser.readCapacityPlans();
  return c.json(plans, 200);
});

// POST /capacity - create capacity plan
capacityRouter.openapi(createPlanRoute, async (c) => {
  const parser = getParser(c);
  const body = await c.req.valid("json");
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
  await cacheWriteThrough(c, "capacity_plans");
  return c.json(newPlan, 201);
});

// GET /capacity/:id - get single capacity plan
capacityRouter.openapi(getPlanRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === id);
  if (!plan) return c.json({ error: "Not found" }, 404);
  return c.json(plan, 200);
});

// PUT /capacity/:id - update capacity plan
capacityRouter.openapi(updatePlanRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = await c.req.valid("json");
  const plans = await parser.readCapacityPlans();
  const index = plans.findIndex((p) => p.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  plans[index] = { ...plans[index], ...body };
  await parser.saveCapacityPlans(plans);
  await cacheWriteThrough(c, "capacity_plans");
  return c.json(plans[index], 200);
});

// DELETE /capacity/:id - delete capacity plan
capacityRouter.openapi(deletePlanRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const plans = await parser.readCapacityPlans();
  const filtered = plans.filter((p) => p.id !== id);
  if (filtered.length === plans.length) return c.json({ error: "Not found" }, 404);
  await parser.saveCapacityPlans(filtered);
  cachePurge(c, "capacity_plans", id);
  return c.json({ success: true }, 200);
});

// POST /capacity/:id/members - add team member ref
capacityRouter.openapi(addMemberRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId } = c.req.valid("param");
  const body = await c.req.valid("json");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

  const newMember = {
    id: crypto.randomUUID().substring(0, 8),
    personId: body.personId,
    hoursPerDay: body.hoursPerDay,
    workingDays: body.workingDays,
  };
  plan.teamMembers.push(newMember);
  await parser.saveCapacityPlans(plans);
  await cacheWriteThrough(c, "capacity_plans");
  return c.json(newMember, 201);
});

// PUT /capacity/:id/members/:mid - update team member ref
capacityRouter.openapi(updateMemberRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId, mid: memberId } = c.req.valid("param");
  const body = await c.req.valid("json");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

  const memberIndex = plan.teamMembers.findIndex((m) => m.id === memberId);
  if (memberIndex === -1) return c.json({ error: "Member not found" }, 404);

  plan.teamMembers[memberIndex] = { ...plan.teamMembers[memberIndex], ...body };
  await parser.saveCapacityPlans(plans);
  await cacheWriteThrough(c, "capacity_plans");
  return c.json(plan.teamMembers[memberIndex], 200);
});

// DELETE /capacity/:id/members/:mid - delete team member ref
capacityRouter.openapi(deleteMemberRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId, mid: memberId } = c.req.valid("param");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

  const filtered = plan.teamMembers.filter((m) => m.id !== memberId);
  if (filtered.length === plan.teamMembers.length) {
    return c.json({ error: "Member not found" }, 404);
  }

  plan.teamMembers = filtered;
  plan.allocations = plan.allocations.filter((a) => a.memberId !== memberId);
  await parser.saveCapacityPlans(plans);
  await cacheWriteThrough(c, "capacity_plans");
  return c.json({ success: true }, 200);
});

// POST /capacity/:id/allocations - add allocation
capacityRouter.openapi(addAllocationRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId } = c.req.valid("param");
  const body = await c.req.valid("json");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

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
  await cacheWriteThrough(c, "capacity_plans");
  return c.json(newAllocation, 201);
});

// PUT /capacity/:id/allocations/:aid - update allocation
capacityRouter.openapi(updateAllocationRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId, aid: allocId } = c.req.valid("param");
  const body = await c.req.valid("json");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

  const allocIndex = plan.allocations.findIndex((a) => a.id === allocId);
  if (allocIndex === -1) return c.json({ error: "Allocation not found" }, 404);

  plan.allocations[allocIndex] = { ...plan.allocations[allocIndex], ...body };
  await parser.saveCapacityPlans(plans);
  await cacheWriteThrough(c, "capacity_plans");
  return c.json(plan.allocations[allocIndex], 200);
});

// DELETE /capacity/:id/allocations/:aid - delete allocation
capacityRouter.openapi(deleteAllocationRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId, aid: allocId } = c.req.valid("param");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

  const filtered = plan.allocations.filter((a) => a.id !== allocId);
  if (filtered.length === plan.allocations.length) {
    return c.json({ error: "Allocation not found" }, 404);
  }

  plan.allocations = filtered;
  await parser.saveCapacityPlans(plans);
  await cacheWriteThrough(c, "capacity_plans");
  return c.json({ success: true }, 200);
});

// GET /capacity/:id/utilization - get utilization report
// Resolves person names from people/ registry
capacityRouter.openapi(utilizationRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId } = c.req.valid("param");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

  const peopleMap = await getPeopleMap(parser);
  const timeEntries = await parser.readTimeEntries();

  const utilization = plan.teamMembers.map((member) => {
    const person = peopleMap.get(member.personId);
    const hoursPerDay = member.hoursPerDay ?? person?.hoursPerDay ?? 8;
    const workingDays = member.workingDays ?? person?.workingDays ??
      ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const weeklyCapacity = hoursPerDay * workingDays.length;
    const allocatedByWeek = new Map<string, number>();

    for (
      const alloc of plan.allocations.filter((a) => a.memberId === member.id)
    ) {
      const current = allocatedByWeek.get(alloc.weekStart) || 0;
      allocatedByWeek.set(alloc.weekStart, current + alloc.allocatedHours);
    }

    // Match time entries by personId
    let actualHours = 0;
    for (const [, entries] of timeEntries) {
      for (const entry of entries) {
        if (entry.person === member.personId) {
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
      personId: member.personId,
      memberName: person?.name || member.personId,
      weeklyCapacity,
      allocatedByWeek: Object.fromEntries(allocatedByWeek),
      totalAllocated,
      actualHours,
      utilizationPercent: weeklyCapacity > 0
        ? Math.round((totalAllocated / weeklyCapacity) * 100)
        : 0,
    };
  });

  return c.json(utilization, 200);
});

// GET /capacity/:id/suggest-assignments - auto-assign suggestions
capacityRouter.openapi(suggestAssignmentsRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId } = c.req.valid("param");
  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

  const peopleMap = await getPeopleMap(parser);
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
    const person = peopleMap.get(member.personId);
    const hoursPerDay = member.hoursPerDay ?? person?.hoursPerDay ?? 8;
    const workingDays = member.workingDays ?? person?.workingDays ??
      ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const weeklyCapacity = hoursPerDay * workingDays.length;
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
      personId: string;
      memberName: string;
      hours: number;
      weekStart: string;
    }
  > = [];

  for (const task of unassignedTasks) {
    const effort = task.config.effort || 8;

    let bestMember: { id: string; personId: string; name: string } | null =
      null;
    let maxCapacity = 0;

    for (const member of plan.teamMembers) {
      const remaining = memberCapacity.get(member.id) || 0;
      if (remaining >= effort && remaining > maxCapacity) {
        maxCapacity = remaining;
        const person = peopleMap.get(member.personId);
        bestMember = {
          id: member.id,
          personId: member.personId,
          name: person?.name || member.personId,
        };
      }
    }

    if (bestMember) {
      suggestions.push({
        taskId: task.id,
        taskTitle: task.title,
        memberId: bestMember.id,
        personId: bestMember.personId,
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

  return c.json(suggestions, 200);
});

// POST /capacity/:id/apply-assignments - apply auto-assign suggestions
capacityRouter.openapi(applyAssignmentsRoute, async (c) => {
  const parser = getParser(c);
  const { id: planId } = c.req.valid("param");
  const body = await c.req.valid("json");
  const suggestions = body.suggestions || [];

  const plans = await parser.readCapacityPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);

  const peopleMap = await getPeopleMap(parser);

  for (const suggestion of suggestions) {
    plan.allocations.push({
      id: crypto.randomUUID().substring(0, 8),
      memberId: suggestion.memberId,
      weekStart: suggestion.weekStart,
      allocatedHours: suggestion.hours,
      targetType: "task",
      targetId: suggestion.taskId,
    });

    // Assign task to the person's ID
    const personId = suggestion.personId;
    if (personId) {
      await parser.updateTask(suggestion.taskId, {
        config: { assignee: personId },
      });
    }
  }

  await parser.saveCapacityPlans(plans);
  await cacheWriteThrough(c, "capacity_plans");
  return c.json({ success: true, applied: suggestions.length }, 200);
});
