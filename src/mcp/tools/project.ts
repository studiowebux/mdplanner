/**
 * MCP tools for project configuration and analytics.
 * Tools: get_project_config, update_project_config, get_analytics
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { VERSION } from "../../lib/version.ts";
import { collectAnalytics } from "../../lib/analytics/index.ts";

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

  server.registerTool(
    "update_project_config",
    {
      description:
        "Update project name, description, and/or feature visibility configuration.",
      inputSchema: {
        name: z.string().optional().describe("Project name"),
        description: z.array(z.string()).optional().describe(
          "Project description lines (markdown)",
        ),
        features: z.array(z.string()).optional().describe(
          "Enabled feature keys (e.g. ['tasks','notes','goals']). Replaces the full features list.",
        ),
      },
    },
    async ({ name, description, features }) => {
      try {
        if (name?.trim()) {
          await parser.saveProjectName(name.trim());
        }
        if (description) {
          await parser.saveProjectDescription(description);
        }
        if (features !== undefined) {
          const current = await parser.readProjectConfig();
          await parser.saveProjectConfig({ ...current, features });
        }
        return ok({ success: true });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Failed to update project");
      }
    },
  );

  server.registerTool(
    "get_analytics",
    {
      description:
        "Get cross-entity project health analytics: task completion rates, goal progress, open action items, storage usage, people count, and more.",
      inputSchema: {},
    },
    async () => {
      try {
        const projectDir = pm.getActiveProjectDir();
        const payload = await collectAnalytics(parser, projectDir);
        return ok(payload);
      } catch (e) {
        return err(
          e instanceof Error ? e.message : "Failed to collect analytics",
        );
      }
    },
  );
}
