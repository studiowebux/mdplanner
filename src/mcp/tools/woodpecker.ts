// MCP tools for Woodpecker CI — thin wrappers over WoodpeckerService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getWoodpeckerService } from "../../singletons/services.ts";
import {
  WoodpeckerLimitInput,
  WoodpeckerNumberInput,
  WoodpeckerRepoInput,
} from "../../types/woodpecker.types.ts";
import { z } from "@hono/zod-openapi";
import { err, ok } from "../utils.ts";

export function registerWoodpeckerTools(server: McpServer): void {
  const service = getWoodpeckerService();

  server.registerTool(
    "woodpecker_list_repos",
    {
      description:
        "List Woodpecker CI repositories accessible to the configured token, optionally filtered by name.",
      inputSchema: {
        query: z.string().optional().describe(
          "Filter repos by name substring",
        ),
      },
    },
    async ({ query }) => {
      try {
        return ok(await service.listRepos(query));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "woodpecker_list_pipelines",
    {
      description:
        "List recent Woodpecker pipelines (builds) for a repo, newest first. Use to read the latest CI status.",
      inputSchema: {
        githubRepo: WoodpeckerRepoInput,
        limit: WoodpeckerLimitInput,
      },
    },
    async ({ githubRepo, limit }) => {
      try {
        return ok(await service.listPipelines(githubRepo, limit));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "woodpecker_get_pipeline",
    {
      description:
        "Fetch a single Woodpecker pipeline by number, or 'latest' for the most recent.",
      inputSchema: {
        githubRepo: WoodpeckerRepoInput,
        number: WoodpeckerNumberInput,
      },
    },
    async ({ githubRepo, number }) => {
      try {
        return ok(await service.getPipeline(githubRepo, number));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );
}

export const woodpeckerModule = defineMcpModule({
  feature: "ci",
  register: registerWoodpeckerTools,
});
