/**
 * MCP tools for project configuration.
 * Tools: get_project_config
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProjectManager } from "../../lib/project-manager.ts";
import { VERSION } from "../../lib/version.ts";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerProjectTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "get_project_config",
    {
      description:
        "Get project metadata: name, description, status, features, and configuration.",
      inputSchema: {},
    },
    async () => {
      const [info, config] = await Promise.all([
        parser.readProjectInfo(),
        parser.readProjectConfig(),
      ]);
      return ok({
        name: info.name,
        description: info.description,
        serverVersion: VERSION,
        projectPath: pm.getActiveProjectDir(),
        cacheEnabled: pm.isCacheEnabled(),
        ...config,
      });
    },
  );
}
