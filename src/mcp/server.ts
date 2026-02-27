/**
 * MCP server setup and transport.
 * Wires all tool and resource modules into the McpServer instance.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ProjectManager } from "../lib/project-manager.ts";
import { VERSION } from "../lib/version.ts";
import { registerTaskTools } from "./tools/tasks.ts";
import { registerNoteTools } from "./tools/notes.ts";
import { registerGoalTools } from "./tools/goals.ts";
import { registerMeetingTools } from "./tools/meetings.ts";
import { registerJournalTools } from "./tools/journal.ts";
import { registerPeopleTools } from "./tools/people.ts";
import { registerProjectTools } from "./tools/project.ts";
import { registerSearchTools } from "./tools/search.ts";
import { registerMilestoneTools } from "./tools/milestones.ts";
import { registerIdeaTools } from "./tools/ideas.ts";
import { registerPortfolioTools } from "./tools/portfolio.ts";
import { registerMoscowTools } from "./tools/moscow.ts";
import { registerEisenhowerTools } from "./tools/eisenhower.ts";
import { registerRetrospectiveTools } from "./tools/retrospectives.ts";
import { registerSwotTools } from "./tools/swot.ts";
import { registerRiskTools } from "./tools/risk.ts";
import { registerBriefTools } from "./tools/brief.ts";
import { registerSafeTools } from "./tools/safe.ts";
import { registerFinanceTools } from "./tools/finances.ts";
import { registerOnboardingTools } from "./tools/onboarding.ts";
import { registerCrmTools } from "./tools/crm.ts";
import { registerBillingTools } from "./tools/billing.ts";
import { registerCanvasTools } from "./tools/canvas.ts";
import { registerCapacityTools } from "./tools/capacity.ts";
import { registerResources } from "./resources.ts";

/**
 * Factory: create and configure an McpServer instance (transport-agnostic).
 * Pattern: Factory Method
 */
export function createMcpServer(pm: ProjectManager): McpServer {
  const server = new McpServer({
    name: "mdplanner",
    version: VERSION,
  });

  registerTaskTools(server, pm);
  registerNoteTools(server, pm);
  registerGoalTools(server, pm);
  registerMeetingTools(server, pm);
  registerJournalTools(server, pm);
  registerPeopleTools(server, pm);
  registerProjectTools(server, pm);
  registerSearchTools(server, pm);
  registerMilestoneTools(server, pm);
  registerIdeaTools(server, pm);
  registerPortfolioTools(server, pm);
  registerMoscowTools(server, pm);
  registerEisenhowerTools(server, pm);
  registerRetrospectiveTools(server, pm);
  registerSwotTools(server, pm);
  registerRiskTools(server, pm);
  registerBriefTools(server, pm);
  registerSafeTools(server, pm);
  registerFinanceTools(server, pm);
  registerOnboardingTools(server, pm);
  registerCrmTools(server, pm);
  registerBillingTools(server, pm);
  registerCanvasTools(server, pm);
  registerCapacityTools(server, pm);
  registerResources(server, pm);

  return server;
}

/** Start MCP server over stdio (local use, Claude Desktop / mcp.ts binary). */
export async function startMcpServer(pm: ProjectManager): Promise<void> {
  const server = createMcpServer(pm);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
