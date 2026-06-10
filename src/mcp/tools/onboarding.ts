// MCP tools for onboarding flow operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOnboardingService } from "../../singletons/services.ts";
import {
  CreateOnboardingSchema,
  ListOnboardingOptionsSchema,
  OnboardingSchema,
  UpdateOnboardingSchema,
} from "../../types/onboarding.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerOnboardingTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getOnboardingService(),
    notFoundLabel: "Onboarding",
    idParam: OnboardingSchema.shape.id.describe("Onboarding ID"),
    nameParam: OnboardingSchema.shape.employeeName.describe("Employee name"),
    listSchema: ListOnboardingOptionsSchema,
    createSchema: CreateOnboardingSchema,
    updateSchema: UpdateOnboardingSchema,
    mutationReturn: "id-success",
    slimFields: ["employeeName", "role", "startDate"],
    tools: {
      list: {
        name: "list_onboarding",
        description:
          "List all onboarding flows. Optionally filter by project or status. Pass slim: true to browse with a compact projection.",
      },
      get: {
        name: "get_onboarding",
        description: "Get a single onboarding flow by its ID.",
      },
      getByName: {
        name: "get_onboarding_by_name",
        description:
          "Get an onboarding flow by its title (case-insensitive). Prefer this over list_onboarding when the title is known.",
      },
      create: {
        name: "create_onboarding",
        description: "Create a new onboarding flow.",
      },
      update: {
        name: "update_onboarding",
        description: "Update an existing onboarding flow's fields.",
      },
      delete: {
        name: "delete_onboarding",
        description: "Delete an onboarding flow by its ID.",
      },
    },
  });
}
