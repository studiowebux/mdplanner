// MCP tools for onboarding template operations — thin wrappers over OnboardingTemplateService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOnboardingTemplateService } from "../../singletons/services.ts";
import {
  CreateOnboardingTemplateSchema,
  ListOnboardingTemplateOptionsSchema,
  OnboardingTemplateSchema,
  UpdateOnboardingTemplateSchema,
} from "../../types/onboarding-template.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerOnboardingTemplateTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getOnboardingTemplateService(),
    notFoundLabel: "Onboarding template",
    idParam: OnboardingTemplateSchema.shape.id.describe(
      "Onboarding template ID",
    ),
    nameParam: OnboardingTemplateSchema.shape.name.describe(
      "Onboarding template name",
    ),
    listSchema: ListOnboardingTemplateOptionsSchema,
    createSchema: CreateOnboardingTemplateSchema,
    updateSchema: UpdateOnboardingTemplateSchema,
    mutationReturn: "entity",
    slimFields: ["name", "role"],
    tools: {
      list: {
        name: "list_onboarding_templates",
        description:
          "List all onboarding templates. Optionally filter by role, tag, or search query.",
      },
      get: {
        name: "get_onboarding_template",
        description: "Get a single onboarding template by its ID.",
      },
      getByName: {
        name: "get_onboarding_template_by_name",
        description:
          "Get an onboarding template by its name (case-insensitive). Prefer this over list_onboarding_templates when the name is known.",
      },
      create: {
        name: "create_onboarding_template",
        description: "Create a new onboarding template.",
      },
      update: {
        name: "update_onboarding_template",
        description: "Update an existing onboarding template.",
      },
      delete: {
        name: "delete_onboarding_template",
        description: "Delete an onboarding template by ID.",
      },
    },
  });
}
