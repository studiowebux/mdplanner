/**
 * MCP tools for onboarding record and template operations.
 * Tools: list_onboarding, get_onboarding, create_onboarding, update_onboarding, delete_onboarding,
 *        list_onboarding_templates, get_onboarding_template, create_onboarding_template, delete_onboarding_template
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const STEP_CATEGORY = [
  "equipment",
  "accounts",
  "docs",
  "training",
  "intro",
  "other",
] as const;

export function registerOnboardingTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  // --- Onboarding Records ---

  server.registerTool(
    "list_onboarding",
    { description: "List all onboarding records.", inputSchema: {} },
    async () => ok(await parser.readOnboardingRecords()),
  );

  server.registerTool(
    "get_onboarding",
    {
      description: "Get a single onboarding record by its ID.",
      inputSchema: { id: z.string().describe("Onboarding record ID") },
    },
    async ({ id }) => {
      const items = await parser.readOnboardingRecords();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Onboarding record '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_onboarding",
    {
      description: "Create a new onboarding record for a team member.",
      inputSchema: {
        employeeName: z.string().describe("Employee full name"),
        role: z.string().describe("Employee role or job title"),
        startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        personId: z.string().optional().describe(
          "Person ID from people registry",
        ),
        notes: z.string().optional(),
      },
    },
    async ({ employeeName, role, startDate, personId, notes }) => {
      const item = await parser.addOnboardingRecord({
        employeeName,
        role,
        startDate: startDate ?? new Date().toISOString().slice(0, 10),
        ...(personId && { personId }),
        steps: [],
        ...(notes && { notes }),
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_onboarding",
    {
      description: "Update an onboarding record.",
      inputSchema: {
        id: z.string().describe("Onboarding record ID"),
        employeeName: z.string().optional(),
        role: z.string().optional(),
        startDate: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, employeeName, role, startDate, notes }) => {
      const success = await parser.updateOnboardingRecord(id, {
        ...(employeeName !== undefined && { employeeName }),
        ...(role !== undefined && { role }),
        ...(startDate !== undefined && { startDate }),
        ...(notes !== undefined && { notes }),
      });
      if (!success) return err(`Onboarding record '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_onboarding",
    {
      description: "Delete an onboarding record by its ID.",
      inputSchema: { id: z.string().describe("Onboarding record ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteOnboardingRecord(id);
      if (!success) return err(`Onboarding record '${id}' not found`);
      return ok({ success: true });
    },
  );

  // --- Onboarding Templates ---

  server.registerTool(
    "list_onboarding_templates",
    { description: "List all onboarding templates.", inputSchema: {} },
    async () => ok(await parser.readOnboardingTemplates()),
  );

  server.registerTool(
    "get_onboarding_template",
    {
      description: "Get a single onboarding template by its ID.",
      inputSchema: { id: z.string().describe("Template ID") },
    },
    async ({ id }) => {
      const items = await parser.readOnboardingTemplates();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Onboarding template '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_onboarding_template",
    {
      description: "Create a new onboarding template with step definitions.",
      inputSchema: {
        name: z.string().describe("Template name"),
        description: z.string().optional(),
        steps: z.array(z.object({
          title: z.string().describe("Step title"),
          category: z.enum(STEP_CATEGORY).describe("Step category"),
        })).optional().describe("Onboarding step definitions"),
      },
    },
    async ({ name, description, steps }) => {
      const item = await parser.addOnboardingTemplate({
        name,
        ...(description && { description }),
        steps: steps ?? [],
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "delete_onboarding_template",
    {
      description: "Delete an onboarding template by its ID.",
      inputSchema: { id: z.string().describe("Template ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteOnboardingTemplate(id);
      if (!success) return err(`Onboarding template '${id}' not found`);
      return ok({ success: true });
    },
  );
}
