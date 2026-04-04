// MCP tools for idea operations — thin wrappers over IdeaService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIdeaService } from "../../singletons/services.ts";
import {
  CreateIdeaSchema,
  IdeaSchema,
  ListIdeaOptionsSchema,
  UpdateIdeaSchema,
} from "../../types/idea.types.ts";
import { err, ok } from "../utils.ts";

export function registerIdeaTools(server: McpServer): void {
  const service = getIdeaService();

  server.registerTool(
    "list_ideas",
    {
      description:
        "List all ideas. Optionally filter by status, category, priority, or search query.",
      inputSchema: ListIdeaOptionsSchema.shape,
    },
    async ({ status, category, priority, q }) => {
      const ideas = await service.list({ status, category, priority, q });
      return ok(ideas);
    },
  );

  server.registerTool(
    "get_idea",
    {
      description: "Get a single idea by its ID.",
      inputSchema: { id: IdeaSchema.shape.id.describe("Idea ID") },
    },
    async ({ id }) => {
      const idea = await service.getById(id);
      if (!idea) return err(`Idea '${id}' not found`);
      return ok(idea);
    },
  );

  server.registerTool(
    "get_idea_by_name",
    {
      description:
        "Get an idea by its title (case-insensitive). Prefer this over list_ideas when the title is known.",
      inputSchema: {
        name: IdeaSchema.shape.title.describe("Idea title"),
      },
    },
    async ({ name }) => {
      const idea = await service.getByName(name);
      if (!idea) return err(`Idea '${name}' not found`);
      return ok(idea);
    },
  );

  server.registerTool(
    "create_idea",
    {
      description:
        "Create a new idea. Status defaults to 'new' if not specified.",
      inputSchema: CreateIdeaSchema.shape,
    },
    async (data) => {
      const idea = await service.create(data);
      return ok({ id: idea.id });
    },
  );

  server.registerTool(
    "update_idea",
    {
      description: "Update an existing idea's fields.",
      inputSchema: {
        id: IdeaSchema.shape.id.describe("Idea ID"),
        ...UpdateIdeaSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const idea = await service.update(id, fields);
      if (!idea) return err(`Idea '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_idea",
    {
      description: "Delete an idea by its ID.",
      inputSchema: { id: IdeaSchema.shape.id.describe("Idea ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Idea '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "link_ideas",
    {
      description:
        "Create a bidirectional link between two ideas (Zettelkasten-style).",
      inputSchema: {
        id1: IdeaSchema.shape.id.describe("First idea ID"),
        id2: IdeaSchema.shape.id.describe("Second idea ID"),
      },
    },
    async ({ id1, id2 }) => {
      const success = await service.linkIdeas(id1, id2);
      if (!success) return err("One or both ideas not found");
      return ok({ success: true });
    },
  );

  server.registerTool(
    "unlink_ideas",
    {
      description: "Remove the bidirectional link between two ideas.",
      inputSchema: {
        id1: IdeaSchema.shape.id.describe("First idea ID"),
        id2: IdeaSchema.shape.id.describe("Second idea ID"),
      },
    },
    async ({ id1, id2 }) => {
      const success = await service.unlinkIdeas(id1, id2);
      if (!success) return err("One or both ideas not found");
      return ok({ success: true });
    },
  );
}
