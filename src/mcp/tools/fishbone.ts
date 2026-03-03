/**
 * MCP tools for Fishbone (Ishikawa) diagram operations.
 * Tools: list_fishbones, get_fishbone, create_fishbone, update_fishbone, delete_fishbone
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const FishboneCauseSchema = z.object({
  category: z.string().describe(
    "Cause category (e.g. 'People', 'Process', 'Method')",
  ),
  subcauses: z.array(z.string()).describe(
    "Contributing factors in this category",
  ),
});

export function registerFishboneTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_fishbones",
    {
      description: "List all Fishbone (Ishikawa) diagrams.",
      inputSchema: {},
    },
    async () => ok(await parser.readFishbones()),
  );

  server.registerTool(
    "get_fishbone",
    {
      description: "Get a single Fishbone diagram by its ID.",
      inputSchema: { id: z.string().describe("Fishbone diagram ID") },
    },
    async ({ id }) => {
      const diagrams = await parser.readFishbones();
      const diagram = diagrams.find((d) => d.id === id);
      if (!diagram) return err(`Fishbone diagram '${id}' not found`);
      return ok(diagram);
    },
  );

  server.registerTool(
    "create_fishbone",
    {
      description:
        "Create a new Fishbone diagram for cause-and-effect analysis.",
      inputSchema: {
        title: z.string().describe(
          "Problem or effect statement (placed at the right end of the spine)",
        ),
        description: z.string().optional(),
        causes: z.array(FishboneCauseSchema).optional().describe(
          "Cause categories with their contributing factors",
        ),
      },
    },
    async ({ title, description, causes }) => {
      const diagram = await parser.addFishbone({
        title,
        ...(description && { description }),
        causes: causes ?? [],
      });
      return ok({ id: diagram.id });
    },
  );

  server.registerTool(
    "update_fishbone",
    {
      description: "Update an existing Fishbone diagram.",
      inputSchema: {
        id: z.string().describe("Fishbone diagram ID"),
        title: z.string().optional(),
        description: z.string().optional(),
        causes: z.array(FishboneCauseSchema).optional().describe(
          "Full replacement cause list",
        ),
      },
    },
    async ({ id, title, description, causes }) => {
      const updated = await parser.updateFishbone(id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(causes !== undefined && { causes }),
      });
      if (!updated) return err(`Fishbone diagram '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_fishbone",
    {
      description: "Delete a Fishbone diagram by its ID.",
      inputSchema: { id: z.string().describe("Fishbone diagram ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteFishbone(id);
      if (!success) return err(`Fishbone diagram '${id}' not found`);
      return ok({ success: true });
    },
  );
}
