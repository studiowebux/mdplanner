// MCP server factory — creates a transport-agnostic McpServer instance.
// Registers tool modules. Each module is a thin wrapper over v2 services.
// Pattern: Factory Method

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { APP_VERSION } from "../constants/mod.ts";
import { registerBrainstormTools } from "./tools/brainstorms.ts";
import { registerBriefTools } from "./tools/briefs.ts";
import { registerReflectionTools } from "./tools/reflections.ts";
import { registerReflectionTemplateTools } from "./tools/reflection-templates.ts";
import { registerOnboardingTemplateTools } from "./tools/onboarding-templates.ts";
import { registerRetrospectiveTools } from "./tools/retrospectives.ts";
import { registerMeetingTools } from "./tools/meetings.ts";
import { registerBillingRateTools } from "./tools/billing-rates.ts";
import { registerContactTools } from "./tools/contacts.ts";
import { registerCompanyTools } from "./tools/companies.ts";
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
import { registerEisenhowerTools } from "./tools/eisenhower.ts";
import { registerMindmapTools } from "./tools/mindmaps.ts";
import { registerLeanCanvasTools } from "./tools/lean-canvases.ts";
import { registerMilestoneTools } from "./tools/milestones.ts";
import { registerNoteTools } from "./tools/notes.ts";
import { registerPeopleTools } from "./tools/people.ts";
import { registerPortfolioTools } from "./tools/portfolio.ts";
import { registerTaskTools } from "./tools/tasks.ts";
import { registerStickyNoteTools } from "./tools/sticky-notes.ts";
import { registerC4Tools } from "./tools/c4.ts";
import { registerCapacityPlanTools } from "./tools/capacity-plans.ts";
import { registerStrategicLevelsTools } from "./tools/strategic-levels.ts";
import { registerSafeTools } from "./tools/safe.ts";
import { registerBrainstormTemplateTools } from "./tools/brainstorm-templates.ts";
import { registerBusinessModelTools } from "./tools/business-models.ts";
import { registerDealTools } from "./tools/deals.ts";
import { registerFinanceTools } from "./tools/finances.ts";
import { registerFishboneTools } from "./tools/fishbone.ts";
import { registerHabitTools } from "./tools/habits.ts";
import { registerInvestorTools } from "./tools/investors.ts";
import { registerJournalTools } from "./tools/journal.ts";
import { registerMoscowTools } from "./tools/moscow.ts";
import { registerOnboardingTools } from "./tools/onboarding.ts";
import { registerRiskTools } from "./tools/risks.ts";
import { registerVacationTools } from "./tools/vacation.ts";
import { registerProjectValueBoardTools } from "./tools/project-value-boards.ts";
import { registerPreferenceTools } from "./tools/preferences.ts";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mdplanner",
    version: APP_VERSION,
  });

  registerBrainstormTools(server);
  registerBriefTools(server);
  registerReflectionTools(server);
  registerReflectionTemplateTools(server);
  registerOnboardingTemplateTools(server);
  registerRetrospectiveTools(server);
  registerMeetingTools(server);
  registerBillingRateTools(server);
  registerContactTools(server);
  registerCompanyTools(server);
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
  registerEisenhowerTools(server);
  registerMindmapTools(server);
  registerLeanCanvasTools(server);
  registerMilestoneTools(server);
  registerNoteTools(server);
  registerPeopleTools(server);
  registerPortfolioTools(server);
  registerTaskTools(server);
  registerStickyNoteTools(server);
  registerC4Tools(server);
  registerCapacityPlanTools(server);
  registerStrategicLevelsTools(server);
  registerSafeTools(server);
  registerProjectValueBoardTools(server);
  registerBrainstormTemplateTools(server);
  registerBusinessModelTools(server);
  registerDealTools(server);
  registerFinanceTools(server);
  registerFishboneTools(server);
  registerHabitTools(server);
  registerInvestorTools(server);
  registerJournalTools(server);
  registerMoscowTools(server);
  registerOnboardingTools(server);
  registerRiskTools(server);
  registerVacationTools(server);
  registerPreferenceTools(server);

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
