// MCP server factory — creates a transport-agnostic McpServer instance.
// Registers tool modules. Each module is a thin wrapper over v2 services.
// Pattern: Factory Method

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { APP_VERSION } from "../constants/mod.ts";
import { getProjectService } from "../singletons/services.ts";
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
import { registerWoodpeckerTools } from "./tools/woodpecker.ts";
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
import { registerContextPackTools } from "./tools/context-pack.ts";
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

/**
 * One MCP tool module = a domain's register*Tools fn gated by its feature key
 * (ENTITY_TYPE_LABELS key from constants/mod.ts). `feature: null` = always-on
 * infrastructure (context pack, preferences) that must load regardless of the
 * enabled-features config so an agent can still boot on a minimal setup.
 */
type ToolModule = {
  feature: string | null;
  register: (server: McpServer) => void;
};

const TOOL_MODULES: ToolModule[] = [
  { feature: "brainstorm", register: registerBrainstormTools },
  { feature: "brief", register: registerBriefTools },
  { feature: "reflection", register: registerReflectionTools },
  { feature: "reflection_template", register: registerReflectionTemplateTools },
  { feature: "onboarding_template", register: registerOnboardingTemplateTools },
  { feature: "retrospective", register: registerRetrospectiveTools },
  { feature: "meeting", register: registerMeetingTools },
  { feature: "rate", register: registerBillingRateTools },
  { feature: "contact", register: registerContactTools },
  { feature: "company", register: registerCompanyTools },
  { feature: "customer", register: registerCustomerTools },
  { feature: "invoice", register: registerInvoiceTools },
  { feature: "payment", register: registerPaymentTools },
  { feature: "quote", register: registerQuoteTools },
  { feature: "dns_domain", register: registerDnsTools },
  { feature: "github", register: registerGitHubTools },
  // Woodpecker (CI) has no own feature key — gated under the VCS/CI feature.
  { feature: "github", register: registerWoodpeckerTools },
  { feature: "goal", register: registerGoalTools },
  { feature: "idea", register: registerIdeaTools },
  { feature: "marketing_plan", register: registerMarketingPlanTools },
  { feature: "swot", register: registerSwotTools },
  { feature: "eisenhower", register: registerEisenhowerTools },
  { feature: "mindmap", register: registerMindmapTools },
  { feature: "lean_canvas", register: registerLeanCanvasTools },
  { feature: "milestone", register: registerMilestoneTools },
  { feature: "note", register: registerNoteTools },
  { feature: "person", register: registerPeopleTools },
  { feature: "portfolio", register: registerPortfolioTools },
  { feature: "task", register: registerTaskTools },
  { feature: null, register: registerContextPackTools },
  { feature: "sticky_note", register: registerStickyNoteTools },
  { feature: "c4_component", register: registerC4Tools },
  { feature: "capacity_plan", register: registerCapacityPlanTools },
  { feature: "strategic_builder", register: registerStrategicLevelsTools },
  { feature: "safe", register: registerSafeTools },
  { feature: "project_value", register: registerProjectValueBoardTools },
  { feature: "brainstorm_template", register: registerBrainstormTemplateTools },
  { feature: "business_model", register: registerBusinessModelTools },
  { feature: "deal", register: registerDealTools },
  { feature: "finance", register: registerFinanceTools },
  { feature: "fishbone", register: registerFishboneTools },
  { feature: "habit", register: registerHabitTools },
  { feature: "investor", register: registerInvestorTools },
  { feature: "journal", register: registerJournalTools },
  { feature: "moscow", register: registerMoscowTools },
  { feature: "onboarding", register: registerOnboardingTools },
  { feature: "risk", register: registerRiskTools },
  { feature: "vacation", register: registerVacationTools },
  { feature: null, register: registerPreferenceTools },
];

/**
 * Select which tool modules to register. `enabledFeatures` undefined → all
 * modules (back-compat: tests + callers with no config). When provided, only
 * always-on modules and those whose feature is enabled are returned — disabled
 * modules MUST NOT load their MCP tools (mirrors the sidebar nav gating).
 */
export function enabledToolModules(enabledFeatures?: string[]): ToolModule[] {
  if (!enabledFeatures) return TOOL_MODULES;
  const enabled = new Set(enabledFeatures);
  return TOOL_MODULES.filter(
    (m) => m.feature === null || enabled.has(m.feature),
  );
}

export function createMcpServer(enabledFeatures?: string[]): McpServer {
  const server = new McpServer({
    name: "mdplanner",
    version: APP_VERSION,
  });

  for (const { register } of enabledToolModules(enabledFeatures)) {
    register(server);
  }

  return server;
}

export async function startMcpServer(): Promise<void> {
  const features = await getProjectService().getEnabledFeatures();
  const server = createMcpServer(features);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
