// MCP tools for capacity plan operations — thin wrappers over CapacityPlanService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCapacityPlanService } from "../../singletons/services.ts";
import {
  CapacityPlanSchema,
  CreateCapacityPlanSchema,
  ProjectAllocationSchema,
  TeamMemberRefSchema,
  UpdateCapacityPlanSchema,
} from "../../types/capacity-plan.types.ts";
import { err, ok, projectSlim, slimParam } from "../utils.ts";

export function registerCapacityPlanTools(server: McpServer): void {
  const service = getCapacityPlanService();

  server.registerTool(
    "list_capacity_plans",
    {
      description: "List all capacity plans.",
      inputSchema: { slim: slimParam },
    },
    async ({ slim }) => {
      const items = await service.list();
      return slim
        ? ok(
          projectSlim(items, ["title", "startDate", "endDate", "budgetHours"]),
        )
        : ok(items);
    },
  );

  server.registerTool(
    "get_capacity_plan",
    {
      description: "Get a capacity plan by ID.",
      inputSchema: { id: CapacityPlanSchema.shape.id.describe("Plan ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Capacity plan '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_capacity_plan_by_name",
    {
      description: "Get a capacity plan by title (case-insensitive).",
      inputSchema: {
        name: CapacityPlanSchema.shape.title.describe("Plan title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Capacity plan '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_capacity_plan",
    {
      description: "Create a new capacity plan.",
      inputSchema: CreateCapacityPlanSchema.shape,
    },
    async (input) => {
      const item = await service.create(input);
      return ok(item);
    },
  );

  server.registerTool(
    "update_capacity_plan",
    {
      description: "Update an existing capacity plan.",
      inputSchema: {
        id: CapacityPlanSchema.shape.id.describe("Plan ID"),
        ...UpdateCapacityPlanSchema.shape,
      },
    },
    async ({ id, ...data }) => {
      const item = await service.update(id, data);
      if (!item) return err(`Capacity plan '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "delete_capacity_plan",
    {
      description: "Delete a capacity plan by ID.",
      inputSchema: { id: CapacityPlanSchema.shape.id.describe("Plan ID") },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`Capacity plan '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ---------------------------------------------------------------------------
  // Member helpers
  // ---------------------------------------------------------------------------

  const AddMemberSchema = TeamMemberRefSchema.omit({ id: true });

  server.registerTool(
    "add_capacity_member",
    {
      description: "Add a team member to a capacity plan.",
      inputSchema: {
        planId: CapacityPlanSchema.shape.id.describe("Plan ID"),
        ...AddMemberSchema.shape,
      },
    },
    async ({ planId, ...member }) => {
      const item = await service.addMember(planId, member);
      if (!item) return err(`Capacity plan '${planId}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "remove_capacity_member",
    {
      description:
        "Remove a team member from a capacity plan. Also removes their allocations.",
      inputSchema: {
        planId: CapacityPlanSchema.shape.id.describe("Plan ID"),
        memberId: TeamMemberRefSchema.shape.id.describe("Member ref ID"),
      },
    },
    async ({ planId, memberId }) => {
      const item = await service.removeMember(planId, memberId);
      if (!item) return err(`Capacity plan '${planId}' not found`);
      return ok(item);
    },
  );

  // ---------------------------------------------------------------------------
  // Allocation helpers
  // ---------------------------------------------------------------------------

  const AddAllocationSchema = ProjectAllocationSchema.omit({ id: true });

  server.registerTool(
    "add_capacity_allocation",
    {
      description:
        "Add a per-person-per-project allocation to a capacity plan. " +
        "Specify either percentage (0–100) or hoursPerWeek — not both.",
      inputSchema: {
        planId: CapacityPlanSchema.shape.id.describe("Plan ID"),
        ...AddAllocationSchema.shape,
      },
    },
    async ({ planId, ...allocation }) => {
      const item = await service.addAllocation(planId, allocation);
      if (!item) return err(`Capacity plan '${planId}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "remove_capacity_allocation",
    {
      description: "Remove an allocation from a capacity plan.",
      inputSchema: {
        planId: CapacityPlanSchema.shape.id.describe("Plan ID"),
        allocId: ProjectAllocationSchema.shape.id.describe("Allocation ID"),
      },
    },
    async ({ planId, allocId }) => {
      const item = await service.removeAllocation(planId, allocId);
      if (!item) return err(`Capacity plan '${planId}' not found`);
      return ok(item);
    },
  );
}
