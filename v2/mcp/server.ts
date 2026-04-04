// MCP server factory — creates a transport-agnostic McpServer instance.
// Registers tool modules. Each module is a thin wrapper over v2 services.
// Pattern: Factory Method

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { APP_VERSION } from "../constants/mod.ts";
import { registerBrainstormTools } from "./tools/brainstorms.ts";
import { registerBriefTools } from "./tools/briefs.ts";
import { registerRetrospectiveTools } from "./tools/retrospectives.ts";
import { registerBillingRateTools } from "./tools/billing-rates.ts";
import { registerCustomerTools } from "./tools/customers.ts";
import { registerInvoiceTools } from "./tools/invoices.ts";
import { registerPaymentTools } from "./tools/payments.ts";
import { registerQuoteTools } from "./tools/quotes.ts";
import { registerDnsTools } from "./tools/dns.ts";
import { registerGitHubTools } from "./tools/github.ts";
import { registerGoalTools } from "./tools/goals.ts";
import { registerIdeaTools } from "./tools/ideas.ts";
import { registerMarketingPlanTools } from "./tools/marketing-plans.ts";
import { registerSwotTools } from "./tools/swot.ts";
import { registerLeanCanvasTools } from "./tools/lean-canvases.ts";
import { registerMilestoneTools } from "./tools/milestones.ts";
import { registerNoteTools } from "./tools/notes.ts";
import { registerPeopleTools } from "./tools/people.ts";
import { registerPortfolioTools } from "./tools/portfolio.ts";
import { registerTaskTools } from "./tools/tasks.ts";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mdplanner",
    version: APP_VERSION,
  });

  registerBrainstormTools(server);
  registerBriefTools(server);
  registerRetrospectiveTools(server);
  registerBillingRateTools(server);
  registerCustomerTools(server);
  registerInvoiceTools(server);
  registerPaymentTools(server);
  registerQuoteTools(server);
  registerDnsTools(server);
  registerGitHubTools(server);
  registerGoalTools(server);
  registerIdeaTools(server);
  registerMarketingPlanTools(server);
  registerSwotTools(server);
  registerLeanCanvasTools(server);
  registerMilestoneTools(server);
  registerNoteTools(server);
  registerPeopleTools(server);
  registerPortfolioTools(server);
  registerTaskTools(server);

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
