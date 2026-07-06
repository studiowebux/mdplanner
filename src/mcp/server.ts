// MCP server factory — transport-agnostic McpServer built from self-describing
// tool modules (see module.ts). Each tools/<domain>.ts exports one module that
// owns its feature key; this factory only aggregates them and lets the shared
// translator gate registration by the project's enabled features. No central
// feature mapping, no per-domain special cases.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { APP_VERSION } from "../constants/mod.ts";
import { getProjectService } from "../singletons/services.ts";
import { enabledModules, type McpModule } from "./module.ts";
import { brainstormModule } from "./tools/brainstorms.ts";
import { briefModule } from "./tools/briefs.ts";
import { reflectionModule } from "./tools/reflections.ts";
import { reflectionTemplateModule } from "./tools/reflection-templates.ts";
import { onboardingTemplateModule } from "./tools/onboarding-templates.ts";
import { retrospectiveModule } from "./tools/retrospectives.ts";
import { meetingModule } from "./tools/meetings.ts";
import { billingRateModule } from "./tools/billing-rates.ts";
import { contactModule } from "./tools/contacts.ts";
import { companyModule } from "./tools/companies.ts";
import { customerModule } from "./tools/customers.ts";
import { invoiceModule } from "./tools/invoices.ts";
import { paymentModule } from "./tools/payments.ts";
import { quoteModule } from "./tools/quotes.ts";
import { dnsModule } from "./tools/dns.ts";
import { gitHubModule } from "./tools/github.ts";
import { woodpeckerModule } from "./tools/woodpecker.ts";
import { goalModule } from "./tools/goals.ts";
import { ideaModule } from "./tools/ideas.ts";
import { marketingPlanModule } from "./tools/marketing-plans.ts";
import { swotModule } from "./tools/swot.ts";
import { eisenhowerModule } from "./tools/eisenhower.ts";
import { mindmapModule } from "./tools/mindmaps.ts";
import { leanCanvasModule } from "./tools/lean-canvases.ts";
import { milestoneModule } from "./tools/milestones.ts";
import { noteModule } from "./tools/notes.ts";
import { peopleModule } from "./tools/people.ts";
import { portfolioModule } from "./tools/portfolio.ts";
import { taskModule } from "./tools/tasks.ts";
import { contextPackModule } from "./tools/context-pack.ts";
import { stickyNoteModule } from "./tools/sticky-notes.ts";
import { c4Module } from "./tools/c4.ts";
import { capacityPlanModule } from "./tools/capacity-plans.ts";
import { strategicLevelsModule } from "./tools/strategic-levels.ts";
import { safeModule } from "./tools/safe.ts";
import { brainstormTemplateModule } from "./tools/brainstorm-templates.ts";
import { businessModelModule } from "./tools/business-models.ts";
import { dealModule } from "./tools/deals.ts";
import { financeModule } from "./tools/finances.ts";
import { fishboneModule } from "./tools/fishbone.ts";
import { habitModule } from "./tools/habits.ts";
import { investorModule } from "./tools/investors.ts";
import { journalModule } from "./tools/journal.ts";
import { moscowModule } from "./tools/moscow.ts";
import { onboardingModule } from "./tools/onboarding.ts";
import { riskModule } from "./tools/risks.ts";
import { vacationModule } from "./tools/vacation.ts";
import { projectValueBoardModule } from "./tools/project-value-boards.ts";
import { preferenceModule } from "./tools/preferences.ts";

/** Every MCP tool module, in registration order. Add a domain by dropping its
 * module descriptor here — the module owns its own feature gating. */
export const MCP_MODULES: McpModule[] = [
  brainstormModule,
  briefModule,
  reflectionModule,
  reflectionTemplateModule,
  onboardingTemplateModule,
  retrospectiveModule,
  meetingModule,
  billingRateModule,
  contactModule,
  companyModule,
  customerModule,
  invoiceModule,
  paymentModule,
  quoteModule,
  dnsModule,
  gitHubModule,
  woodpeckerModule,
  goalModule,
  ideaModule,
  marketingPlanModule,
  swotModule,
  eisenhowerModule,
  mindmapModule,
  leanCanvasModule,
  milestoneModule,
  noteModule,
  peopleModule,
  portfolioModule,
  taskModule,
  contextPackModule,
  stickyNoteModule,
  c4Module,
  capacityPlanModule,
  strategicLevelsModule,
  safeModule,
  brainstormTemplateModule,
  businessModelModule,
  dealModule,
  financeModule,
  fishboneModule,
  habitModule,
  investorModule,
  journalModule,
  moscowModule,
  onboardingModule,
  riskModule,
  vacationModule,
  projectValueBoardModule,
  preferenceModule,
];

export function createMcpServer(enabledFeatures?: string[]): McpServer {
  const server = new McpServer({
    name: "mdplanner",
    version: APP_VERSION,
  });

  for (const { register } of enabledModules(MCP_MODULES, enabledFeatures)) {
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
