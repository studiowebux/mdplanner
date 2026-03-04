/**
 * MCP tools for capacity planning operations.
 * Tools: list_capacity_plans, get_capacity_plan, create_capacity_plan,
 *        update_capacity_plan, delete_capacity_plan,
 *        add_capacity_member, remove_capacity_member,
 *        add_capacity_allocation, remove_capacity_allocation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerCapacityTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_capacity_plans",
    { description: "List all capacity plans.", inputSchema: {} },
    async () => ok(await parser.readCapacityPlans()),
  );

  server.registerTool(
    "get_capacity_plan",
    {
      description: "Get a single capacity plan by its ID.",
      inputSchema: { id: z.string().describe("Capacity plan ID") },
    },
    async ({ id }) => {
      const items = await parser.readCapacityPlans();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Capacity plan '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_capacity_plan",
    {
      description: "Create a new capacity plan.",
      inputSchema: {
        title: z.string().describe("Plan title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        budgetHours: z.number().optional().describe("Total budget hours"),
      },
    },
    async ({ title, date, budgetHours }) => {
      const item = await parser.addCapacityPlan({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        ...(budgetHours !== undefined && { budgetHours }),
        teamMembers: [],
        allocations: [],
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_capacity_plan",
    {
      description: "Update a capacity plan's title, date, or budget hours.",
      inputSchema: {
        id: z.string().describe("Capacity plan ID"),
        title: z.string().optional(),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        budgetHours: z.number().optional(),
      },
    },
    async ({ id, title, date, budgetHours }) => {
      const plans = await parser.readCapacityPlans();
      const index = plans.findIndex((p) => p.id === id);
      if (index === -1) return err(`Capacity plan '${id}' not found`);
      plans[index] = {
        ...plans[index],
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date }),
        ...(budgetHours !== undefined && { budgetHours }),
      };
      await parser.saveCapacityPlans(plans);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "add_capacity_member",
    {
      description: "Add a team member to a capacity plan.",
      inputSchema: {
        plan_id: z.string().describe("Capacity plan ID"),
        person_id: z.string().describe(
          "Person ID from the people registry",
        ),
        hours_per_day: z.number().optional().describe(
          "Override person's default hours per day for this plan",
        ),
        working_days: z.array(z.string()).optional().describe(
          "Override working days for this plan (e.g. ['Mon','Tue','Wed','Thu','Fri'])",
        ),
      },
    },
    async ({ plan_id, person_id, hours_per_day, working_days }) => {
      const plans = await parser.readCapacityPlans();
      const plan = plans.find((p) => p.id === plan_id);
      if (!plan) return err(`Capacity plan '${plan_id}' not found`);
      const memberId = crypto.randomUUID().substring(0, 8);
      plan.teamMembers.push({
        id: memberId,
        personId: person_id,
        ...(hours_per_day !== undefined && { hoursPerDay: hours_per_day }),
        ...(working_days?.length && { workingDays: working_days }),
      });
      await parser.saveCapacityPlans(plans);
      return ok({ id: memberId });
    },
  );

  server.registerTool(
    "remove_capacity_member",
    {
      description:
        "Remove a team member from a capacity plan and delete their allocations.",
      inputSchema: {
        plan_id: z.string().describe("Capacity plan ID"),
        member_id: z.string().describe("Member ID within the plan"),
      },
    },
    async ({ plan_id, member_id }) => {
      const plans = await parser.readCapacityPlans();
      const plan = plans.find((p) => p.id === plan_id);
      if (!plan) return err(`Capacity plan '${plan_id}' not found`);
      const before = plan.teamMembers.length;
      plan.teamMembers = plan.teamMembers.filter((m) => m.id !== member_id);
      if (plan.teamMembers.length === before) {
        return err(`Member '${member_id}' not found in plan '${plan_id}'`);
      }
      plan.allocations = plan.allocations.filter((a) =>
        a.memberId !== member_id
      );
      await parser.saveCapacityPlans(plans);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "add_capacity_allocation",
    {
      description: "Add a weekly allocation for a team member in a capacity plan.",
      inputSchema: {
        plan_id: z.string().describe("Capacity plan ID"),
        member_id: z.string().describe("Member ID within the plan"),
        week_start: z.string().describe(
          "Week start date (YYYY-MM-DD, should be a Monday)",
        ),
        allocated_hours: z.number().describe("Hours allocated this week"),
        target_type: z.enum(["project", "task"]).optional().describe(
          "What the allocation is for (default: project)",
        ),
        target_id: z.string().optional().describe(
          "ID of the project or task being allocated to",
        ),
        notes: z.string().optional(),
      },
    },
    async (
      {
        plan_id,
        member_id,
        week_start,
        allocated_hours,
        target_type,
        target_id,
        notes,
      },
    ) => {
      const plans = await parser.readCapacityPlans();
      const plan = plans.find((p) => p.id === plan_id);
      if (!plan) return err(`Capacity plan '${plan_id}' not found`);
      const allocationId = crypto.randomUUID().substring(0, 8);
      plan.allocations.push({
        id: allocationId,
        memberId: member_id,
        weekStart: week_start,
        allocatedHours: allocated_hours,
        targetType: target_type ?? "project",
        ...(target_id && { targetId: target_id }),
        ...(notes && { notes }),
      });
      await parser.saveCapacityPlans(plans);
      return ok({ id: allocationId });
    },
  );

  server.registerTool(
    "remove_capacity_allocation",
    {
      description: "Remove an allocation from a capacity plan.",
      inputSchema: {
        plan_id: z.string().describe("Capacity plan ID"),
        allocation_id: z.string().describe("Allocation ID to remove"),
      },
    },
    async ({ plan_id, allocation_id }) => {
      const plans = await parser.readCapacityPlans();
      const plan = plans.find((p) => p.id === plan_id);
      if (!plan) return err(`Capacity plan '${plan_id}' not found`);
      const before = plan.allocations.length;
      plan.allocations = plan.allocations.filter((a) =>
        a.id !== allocation_id
      );
      if (plan.allocations.length === before) {
        return err(
          `Allocation '${allocation_id}' not found in plan '${plan_id}'`,
        );
      }
      await parser.saveCapacityPlans(plans);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_capacity_plan",
    {
      description: "Delete a capacity plan by its ID.",
      inputSchema: { id: z.string().describe("Capacity plan ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteCapacityPlan(id);
      if (!success) return err(`Capacity plan '${id}' not found`);
      return ok({ success: true });
    },
  );
}
