// MCP tools for onboarding operations — thin wrappers over OnboardingService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOnboardingService } from "../../singletons/services.ts";
import {
  CreateOnboardingSchema,
  ListOnboardingOptionsSchema,
  OnboardingSchema,
  UpdateOnboardingSchema,
} from "../../types/onboarding.types.ts";
import { err, ok } from "../utils.ts";

export function registerOnboardingTools(server: McpServer): void {
  const service = getOnboardingService();

  server.registerTool(
    "list_onboarding",
    {
      description:
        "List all onboarding flows. Optionally filter by project or status.",
      inputSchema: ListOnboardingOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_onboarding",
    {
      description: "Get a single onboarding flow by its ID.",
      inputSchema: {
        id: OnboardingSchema.shape.id.describe("Onboarding ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Onboarding '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_onboarding_by_name",
    {
      description:
        "Get an onboarding flow by its title (case-insensitive). Prefer this over list_onboarding when the title is known.",
      inputSchema: {
        name: OnboardingSchema.shape.employeeName.describe("Employee name"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Onboarding '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_onboarding",
    {
      description: "Create a new onboarding flow.",
      inputSchema: CreateOnboardingSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_onboarding",
    {
      description: "Update an existing onboarding flow's fields.",
      inputSchema: {
        id: OnboardingSchema.shape.id.describe("Onboarding ID"),
        ...UpdateOnboardingSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Onboarding '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_onboarding",
    {
      description: "Delete an onboarding flow by its ID.",
      inputSchema: {
        id: OnboardingSchema.shape.id.describe("Onboarding ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Onboarding '${id}' not found`);
      return ok({ success: true });
    },
  );
}
