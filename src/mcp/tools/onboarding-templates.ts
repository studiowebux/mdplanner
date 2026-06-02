// MCP tools for onboarding template operations — thin wrappers over OnboardingTemplateService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOnboardingTemplateService } from "../../singletons/services.ts";
import {
  CreateOnboardingTemplateSchema,
  ListOnboardingTemplateOptionsSchema,
  OnboardingTemplateSchema,
  UpdateOnboardingTemplateSchema,
} from "../../types/onboarding-template.types.ts";
import { err, ok } from "../utils.ts";

export function registerOnboardingTemplateTools(server: McpServer): void {
  const service = getOnboardingTemplateService();

  server.registerTool(
    "list_onboarding_templates",
    {
      description:
        "List all onboarding templates. Optionally filter by role, tag, or search query.",
      inputSchema: ListOnboardingTemplateOptionsSchema.shape,
    },
    async ({ role, tag, q }) => {
      const items = await service.list({ role, tag, q });
      return ok(items);
    },
  );

  server.registerTool(
    "get_onboarding_template",
    {
      description: "Get a single onboarding template by its ID.",
      inputSchema: {
        id: OnboardingTemplateSchema.shape.id.describe(
          "Onboarding template ID",
        ),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Onboarding template '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_onboarding_template_by_name",
    {
      description:
        "Get an onboarding template by its name (case-insensitive). Prefer this over list_onboarding_templates when the name is known.",
      inputSchema: {
        name: OnboardingTemplateSchema.shape.name.describe(
          "Onboarding template name",
        ),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Onboarding template '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_onboarding_template",
    {
      description: "Create a new onboarding template.",
      inputSchema: CreateOnboardingTemplateSchema.shape,
    },
    async (input) => {
      const item = await service.create(input);
      return ok(item);
    },
  );

  server.registerTool(
    "update_onboarding_template",
    {
      description: "Update an existing onboarding template.",
      inputSchema: {
        id: OnboardingTemplateSchema.shape.id.describe(
          "Onboarding template ID",
        ),
        ...UpdateOnboardingTemplateSchema.shape,
      },
    },
    async ({ id, ...data }) => {
      const item = await service.update(id, data);
      if (!item) return err(`Onboarding template '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "delete_onboarding_template",
    {
      description: "Delete an onboarding template by ID.",
      inputSchema: {
        id: OnboardingTemplateSchema.shape.id.describe(
          "Onboarding template ID",
        ),
      },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`Onboarding template '${id}' not found`);
      return ok({ success: true });
    },
  );
}
