/**
 * MCP tools for full-text search.
 * Tools: search
 *
 * Requires the --cache flag to be active. Returns an informative error
 * when the cache is not enabled rather than failing silently.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { SearchResultType } from "../../lib/cache/search.ts";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

export function registerSearchTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  server.registerTool(
    "search",
    {
      description:
        "Full-text search across all entity types (tasks, notes, goals, meetings, people, etc.). " +
        "Requires the server to be started with the --cache flag.",
      inputSchema: {
        query: z.string().min(1).describe("Search query string"),
        types: z.array(z.string()).optional().describe(
          "Optional list of entity types to restrict the search " +
            "(e.g. ['task', 'note', 'goal', 'meeting', 'person'])",
        ),
        limit: z.number().int().min(1).max(100).optional().describe(
          "Maximum number of results (default: 20)",
        ),
      },
    },
    ({ query, types, limit }) => {
      const cache = pm.getCache();
      if (!cache) {
        return err(
          "Search requires the SQLite cache. Start the MCP server with the --cache flag.",
        );
      }
      const results = cache.search.search(query, {
        limit: limit ?? 20,
        ...(types?.length && { types: types as SearchResultType[] }),
      });
      return ok(results);
    },
  );
}
