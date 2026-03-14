/**
 * MCP tools for reflection operations.
 * Tools: list_reflection_templates, get_reflection_template,
 *        get_reflection_template_by_name, create_reflection_template,
 *        update_reflection_template, delete_reflection_template,
 *        list_reflections, get_reflection, get_reflection_by_name,
 *        create_reflection, update_reflection, delete_reflection
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerReflectionTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  // ============================================================
  // Reflection Templates
  // ============================================================

  server.registerTool(
    "list_reflection_templates",
    {
      description: "List all reflection templates in the project.",
      inputSchema: {
        tag: z.string().optional().describe("Filter by tag"),
      },
    },
    async ({ tag }) => {
      const templates = await parser.readReflectionTemplates();
      return ok(
        tag ? templates.filter((t) => t.tags?.includes(tag)) : templates,
      );
    },
  );

  server.registerTool(
    "get_reflection_template",
    {
      description: "Get a single reflection template by its ID.",
      inputSchema: { id: z.string().describe("Template ID") },
    },
    async ({ id }) => {
      const template = await parser.readReflectionTemplate(id);
      if (!template) return err(`Reflection template '${id}' not found`);
      return ok(template);
    },
  );

  server.registerTool(
    "get_reflection_template_by_name",
    {
      description:
        "Get a reflection template by its title (case-insensitive). Prefer this over list_reflection_templates when the title is known.",
      inputSchema: { name: z.string().describe("Template title") },
    },
    async ({ name }) => {
      const template = await parser.readReflectionTemplateByName(name);
      if (!template) return err(`Reflection template '${name}' not found`);
      return ok(template);
    },
  );

  server.registerTool(
    "create_reflection_template",
    {
      description:
        "Create a new reflection template — a reusable set of questions for recurring self-inquiry sessions.",
      inputSchema: {
        title: z.string().describe("Template title"),
        description: z.string().optional().describe(
          "What this template is for",
        ),
        tags: z.array(z.string()).optional(),
        questions: z
          .array(z.string())
          .optional()
          .describe("Question prompts (H2-level headers in the template file)"),
      },
    },
    async ({ title, description, tags, questions }) => {
      const template = await parser.addReflectionTemplate({
        title,
        ...(description && { description }),
        ...(tags && { tags }),
        questions: questions || [],
      });
      return ok({ id: template.id });
    },
  );

  server.registerTool(
    "update_reflection_template",
    {
      description: "Update an existing reflection template.",
      inputSchema: {
        id: z.string().describe("Template ID"),
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        questions: z.array(z.string()).optional(),
      },
    },
    async ({ id, title, description, tags, questions }) => {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (tags !== undefined) updates.tags = tags;
      if (questions !== undefined) updates.questions = questions;
      const result = await parser.updateReflectionTemplate(id, updates);
      if (!result) return err(`Reflection template '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_reflection_template",
    {
      description: "Delete a reflection template by its ID.",
      inputSchema: { id: z.string().describe("Template ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteReflectionTemplate(id);
      if (!success) return err(`Reflection template '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ============================================================
  // Reflections
  // ============================================================

  server.registerTool(
    "list_reflections",
    {
      description: "List all reflections in the project.",
      inputSchema: {
        tag: z.string().optional().describe("Filter by tag"),
        template_id: z.string().optional().describe(
          "Filter by template ID",
        ),
      },
    },
    async ({ tag, template_id }) => {
      let reflections = await parser.readReflections();
      if (tag) reflections = reflections.filter((r) => r.tags?.includes(tag));
      if (template_id) {
        reflections = reflections.filter((r) => r.templateId === template_id);
      }
      return ok(reflections);
    },
  );

  server.registerTool(
    "get_reflection",
    {
      description: "Get a single reflection by its ID.",
      inputSchema: { id: z.string().describe("Reflection ID") },
    },
    async ({ id }) => {
      const reflection = await parser.readReflection(id);
      if (!reflection) return err(`Reflection '${id}' not found`);
      return ok(reflection);
    },
  );

  server.registerTool(
    "get_reflection_by_name",
    {
      description:
        "Get a reflection by its title (case-insensitive). Prefer this over list_reflections when the title is known.",
      inputSchema: { name: z.string().describe("Reflection title") },
    },
    async ({ name }) => {
      const reflection = await parser.readReflectionByName(name);
      if (!reflection) return err(`Reflection '${name}' not found`);
      return ok(reflection);
    },
  );

  server.registerTool(
    "create_reflection",
    {
      description:
        "Create a new reflection session. Optionally load questions from a template. Questions are H2-level prompts with optional answers.",
      inputSchema: {
        title: z.string().describe("Reflection title"),
        tags: z.array(z.string()).optional(),
        template_id: z.string().optional().describe(
          "Template ID to pre-populate questions from",
        ),
        linked_projects: z.array(z.string()).optional().describe(
          "Project IDs to link",
        ),
        linked_tasks: z.array(z.string()).optional().describe(
          "Task IDs to link",
        ),
        linked_goals: z.array(z.string()).optional().describe(
          "Goal IDs to link",
        ),
        questions: z
          .array(
            z.object({
              question: z.string(),
              answer: z.string().optional(),
            }),
          )
          .optional()
          .describe("Questions with optional answers"),
      },
    },
    async (
      {
        title,
        tags,
        template_id,
        linked_projects,
        linked_tasks,
        linked_goals,
        questions,
      },
    ) => {
      // If template_id provided and no questions given, load from template
      let resolvedQuestions = questions || [];
      if (template_id && resolvedQuestions.length === 0) {
        const template = await parser.readReflectionTemplate(template_id);
        if (template) {
          resolvedQuestions = template.questions.map((q) => ({
            question: q,
            answer: undefined,
          }));
        }
      }
      const reflection = await parser.addReflection({
        title,
        ...(tags && { tags }),
        ...(template_id && { templateId: template_id }),
        ...(linked_projects && { linkedProjects: linked_projects }),
        ...(linked_tasks && { linkedTasks: linked_tasks }),
        ...(linked_goals && { linkedGoals: linked_goals }),
        questions: resolvedQuestions,
      });
      return ok({ id: reflection.id });
    },
  );

  server.registerTool(
    "update_reflection",
    {
      description:
        "Update an existing reflection's fields or answers. Reflections are immutable snapshots — changing the template does not alter existing reflections.",
      inputSchema: {
        id: z.string().describe("Reflection ID"),
        title: z.string().optional(),
        tags: z.array(z.string()).optional(),
        template_id: z.string().optional(),
        linked_projects: z.array(z.string()).optional(),
        linked_tasks: z.array(z.string()).optional(),
        linked_goals: z.array(z.string()).optional(),
        questions: z
          .array(
            z.object({
              question: z.string(),
              answer: z.string().optional(),
            }),
          )
          .optional(),
      },
    },
    async ({
      id,
      title,
      tags,
      template_id,
      linked_projects,
      linked_tasks,
      linked_goals,
      questions,
    }) => {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (tags !== undefined) updates.tags = tags;
      if (template_id !== undefined) updates.templateId = template_id;
      if (linked_projects !== undefined) {
        updates.linkedProjects = linked_projects;
      }
      if (linked_tasks !== undefined) updates.linkedTasks = linked_tasks;
      if (linked_goals !== undefined) updates.linkedGoals = linked_goals;
      if (questions !== undefined) updates.questions = questions;
      const result = await parser.updateReflection(id, updates);
      if (!result) return err(`Reflection '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_reflection",
    {
      description: "Delete a reflection by its ID.",
      inputSchema: { id: z.string().describe("Reflection ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteReflection(id);
      if (!success) return err(`Reflection '${id}' not found`);
      return ok({ success: true });
    },
  );
}
