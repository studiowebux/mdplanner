/**
 * MCP CRUD contract snapshot — locks the public tool contract for the domains
 * that registerCrudTools (src/mcp/crud-tools.ts) drives. MCP is a public API:
 * tool name, description, inputSchema key set, and not-found error text must NOT
 * drift when a hand-written register*Tools cluster is migrated onto the factory.
 *
 * Each domain is registered on a fake server that records, per tool:
 *   { name, description, inputKeys (sorted), notFound (err text for get/
 *     get_by_name/update/delete invoked with a missing id) }.
 * The captured shape is asserted against the golden below. Generated from the
 * hand-written originals, then held constant across the factory migration.
 */

import { assertEquals } from "@std/assert";
import { initServices } from "../../src/singletons/services.ts";
import { registerBriefTools } from "../../src/mcp/tools/briefs.ts";
import { registerBusinessModelTools } from "../../src/mcp/tools/business-models.ts";
import { registerCompanyTools } from "../../src/mcp/tools/companies.ts";
import { registerContactTools } from "../../src/mcp/tools/contacts.ts";
import { registerDealTools } from "../../src/mcp/tools/deals.ts";
import { registerFishboneTools } from "../../src/mcp/tools/fishbone.ts";
import { registerGoalTools } from "../../src/mcp/tools/goals.ts";
import { registerInvestorTools } from "../../src/mcp/tools/investors.ts";
import { registerJournalTools } from "../../src/mcp/tools/journal.ts";
import { registerLeanCanvasTools } from "../../src/mcp/tools/lean-canvases.ts";
import { registerMoscowTools } from "../../src/mcp/tools/moscow.ts";
import { registerOnboardingTools } from "../../src/mcp/tools/onboarding.ts";
import { registerPaymentTools } from "../../src/mcp/tools/payments.ts";
import { registerReflectionTools } from "../../src/mcp/tools/reflections.ts";
import { registerRiskTools } from "../../src/mcp/tools/risks.ts";
import { registerBrainstormTemplateTools } from "../../src/mcp/tools/brainstorm-templates.ts";

interface CapturedTool {
  name: string;
  description: string;
  inputKeys: string[];
  notFound: string | null;
}

// deno-lint-ignore no-explicit-any
type RegisterFn = (server: any) => void;

async function capture(register: RegisterFn): Promise<CapturedTool[]> {
  const tools: CapturedTool[] = [];
  // deno-lint-ignore no-explicit-any
  const handlers = new Map<string, (args: any) => Promise<any>>();
  const server = {
    // deno-lint-ignore no-explicit-any
    registerTool(name: string, def: any, handler: (args: any) => Promise<any>) {
      tools.push({
        name,
        description: def.description,
        inputKeys: Object.keys(def.inputSchema ?? {}).sort(),
        notFound: null,
      });
      handlers.set(name, handler);
    },
  };
  register(server);

  // Capture not-found error text for the id/name lookups + mutations.
  for (const tool of tools) {
    const isLookup = /^get_/.test(tool.name);
    const isMutate = /^(update|delete)_/.test(tool.name);
    if (!isLookup && !isMutate) continue;
    const args = /_by_name$/.test(tool.name)
      ? { name: "__missing__" }
      : { id: "__missing__" };
    const res = await handlers.get(tool.name)!(args);
    tool.notFound = res?.content?.[0]?.text ?? null;
  }
  return tools;
}

const GOLDEN: Record<string, CapturedTool[]> = {
  "briefs": [
    {
      "name": "list_briefs",
      "description":
        "List all briefs. Optionally filter by search query. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "q",
        "slim",
      ],
      "notFound": null,
    },
    {
      "name": "get_brief",
      "description": "Get a single brief by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Brief '__missing__' not found",
    },
    {
      "name": "get_brief_by_name",
      "description":
        "Get a brief by its title (case-insensitive). Prefer this over list_briefs when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Brief '__missing__' not found",
    },
    {
      "name": "create_brief",
      "description": "Create a new brief.",
      "inputKeys": [
        "accountable",
        "changeCapacity",
        "consulted",
        "culture",
        "date",
        "guidingPrinciples",
        "highLevelBudget",
        "highLevelTimeline",
        "informed",
        "mission",
        "responsible",
        "summary",
        "title",
      ],
      "notFound": null,
    },
    {
      "name": "update_brief",
      "description": "Update an existing brief.",
      "inputKeys": [
        "accountable",
        "changeCapacity",
        "consulted",
        "culture",
        "date",
        "guidingPrinciples",
        "highLevelBudget",
        "highLevelTimeline",
        "id",
        "informed",
        "mission",
        "responsible",
        "summary",
        "title",
      ],
      "notFound": "Error: Brief '__missing__' not found",
    },
    {
      "name": "delete_brief",
      "description": "Delete a brief by ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Brief '__missing__' not found",
    },
  ],
  "business-models": [
    {
      "name": "list_business_models",
      "description":
        "List all business models. Optionally filter by project. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "project",
        "q",
        "slim",
      ],
      "notFound": null,
    },
    {
      "name": "get_business_model",
      "description": "Get a single business model by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Business model '__missing__' not found",
    },
    {
      "name": "get_business_model_by_name",
      "description":
        "Get a business model by its title (case-insensitive). Prefer this over list_business_models when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Business model '__missing__' not found",
    },
    {
      "name": "create_business_model",
      "description": "Create a new business model canvas.",
      "inputKeys": [
        "channels",
        "costStructure",
        "customerRelationships",
        "customerSegments",
        "date",
        "keyActivities",
        "keyPartners",
        "keyResources",
        "notes",
        "project",
        "revenueStreams",
        "title",
        "valueProposition",
      ],
      "notFound": null,
    },
    {
      "name": "update_business_model",
      "description": "Update an existing business model's fields.",
      "inputKeys": [
        "channels",
        "costStructure",
        "customerRelationships",
        "customerSegments",
        "date",
        "id",
        "keyActivities",
        "keyPartners",
        "keyResources",
        "notes",
        "project",
        "revenueStreams",
        "title",
        "valueProposition",
      ],
      "notFound": "Error: Business model '__missing__' not found",
    },
    {
      "name": "delete_business_model",
      "description": "Delete a business model by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Business model '__missing__' not found",
    },
  ],
  "companies": [
    {
      "name": "list_companies",
      "description":
        "List companies. Optionally filter by q (matches name/industry/website/address/notes), type (prospect/customer/partner/vendor/other), or industry. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "industry",
        "q",
        "slim",
        "type",
      ],
      "notFound": null,
    },
    {
      "name": "get_company",
      "description": "Get a single company by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Company '__missing__' not found",
    },
    {
      "name": "get_company_by_name",
      "description":
        "Find a company by its name (case-insensitive substring match). Returns the first match.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Company '__missing__' not found",
    },
    {
      "name": "create_company",
      "description":
        "Create a new CRM company. Provide name (required), and optionally website, industry, size, type, phone, email, address, notes, tags.",
      "inputKeys": [
        "address",
        "email",
        "industry",
        "name",
        "notes",
        "phone",
        "size",
        "tags",
        "type",
        "website",
      ],
      "notFound": null,
    },
    {
      "name": "update_company",
      "description": "Update an existing company's fields.",
      "inputKeys": [
        "address",
        "email",
        "id",
        "industry",
        "name",
        "notes",
        "phone",
        "size",
        "tags",
        "type",
        "website",
      ],
      "notFound": "Error: Company '__missing__' not found",
    },
    {
      "name": "delete_company",
      "description": "Delete a company by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Company '__missing__' not found",
    },
  ],
  "contacts": [
    {
      "name": "list_contacts",
      "description":
        "List contacts. Optionally filter by q (matches name/email/role/company/notes), type (lead/customer/partner/vendor/other), or company.",
      "inputKeys": [
        "company",
        "q",
        "type",
      ],
      "notFound": null,
    },
    {
      "name": "get_contact",
      "description": "Get a single contact by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Contact '__missing__' not found",
    },
    {
      "name": "get_contact_by_name",
      "description":
        "Find a contact by its name (case-insensitive). Returns the first match.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Contact '__missing__' not found",
    },
    {
      "name": "create_contact",
      "description":
        "Create a new CRM contact. Provide name (required), and optionally email, phone, role, company, type, notes, tags.",
      "inputKeys": [
        "company",
        "email",
        "name",
        "notes",
        "phone",
        "role",
        "tags",
        "type",
      ],
      "notFound": null,
    },
    {
      "name": "update_contact",
      "description": "Update an existing contact's fields.",
      "inputKeys": [
        "company",
        "email",
        "id",
        "name",
        "notes",
        "phone",
        "positionHistory",
        "role",
        "tags",
        "type",
      ],
      "notFound": "Error: Contact '__missing__' not found",
    },
    {
      "name": "delete_contact",
      "description": "Delete a contact by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Contact '__missing__' not found",
    },
  ],
  "deals": [
    {
      "name": "list_deals",
      "description":
        "List all deals. Optionally filter by stage, company, or project. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "assignee",
        "company",
        "q",
        "slim",
        "stage",
      ],
      "notFound": null,
    },
    {
      "name": "get_deal",
      "description": "Get a single deal by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Deal '__missing__' not found",
    },
    {
      "name": "get_deal_by_name",
      "description":
        "Get a deal by its title (case-insensitive). Prefer this over list_deals when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Deal '__missing__' not found",
    },
    {
      "name": "create_deal",
      "description": "Create a new deal.",
      "inputKeys": [
        "assignee",
        "closedAt",
        "company",
        "contact",
        "currency",
        "description",
        "stage",
        "tags",
        "title",
        "value",
      ],
      "notFound": null,
    },
    {
      "name": "update_deal",
      "description": "Update an existing deal's fields.",
      "inputKeys": [
        "assignee",
        "closedAt",
        "company",
        "contact",
        "currency",
        "description",
        "id",
        "stage",
        "tags",
        "title",
        "value",
      ],
      "notFound": "Error: Deal '__missing__' not found",
    },
    {
      "name": "delete_deal",
      "description": "Delete a deal by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Deal '__missing__' not found",
    },
  ],
  "fishbone": [
    {
      "name": "list_fishbones",
      "description":
        "List all fishbone diagrams. Optionally filter by project. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "project",
        "q",
        "slim",
      ],
      "notFound": null,
    },
    {
      "name": "get_fishbone",
      "description": "Get a single fishbone diagram by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Fishbone '__missing__' not found",
    },
    {
      "name": "get_fishbone_by_name",
      "description":
        "Get a fishbone diagram by its title (case-insensitive). Prefer this over list_fishbones when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Fishbone '__missing__' not found",
    },
    {
      "name": "create_fishbone",
      "description": "Create a new fishbone (Ishikawa) diagram.",
      "inputKeys": [
        "causes",
        "description",
        "project",
        "title",
      ],
      "notFound": null,
    },
    {
      "name": "update_fishbone",
      "description": "Update an existing fishbone diagram's fields.",
      "inputKeys": [
        "causes",
        "description",
        "id",
        "project",
        "title",
      ],
      "notFound": "Error: Fishbone '__missing__' not found",
    },
    {
      "name": "delete_fishbone",
      "description": "Delete a fishbone diagram by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Fishbone '__missing__' not found",
    },
  ],
  "goals": [
    {
      "name": "list_goals",
      "description":
        "List all goals in the project. Optionally filter by status, type, or project. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "project",
        "slim",
        "status",
        "type",
      ],
      "notFound": null,
    },
    {
      "name": "get_goal",
      "description": "Get a single goal by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Goal '__missing__' not found",
    },
    {
      "name": "get_goal_by_name",
      "description":
        "Get a goal by its title (case-insensitive). Prefer this over list_goals when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Goal '__missing__' not found",
    },
    {
      "name": "create_goal",
      "description": "Create a new goal in the project.",
      "inputKeys": [
        "contributors",
        "description",
        "endDate",
        "githubMilestone",
        "githubRepo",
        "kpi",
        "kpiMetric",
        "kpiTarget",
        "kpiValue",
        "linkedMilestones",
        "linkedPortfolioItems",
        "notes",
        "owner",
        "parentGoal",
        "priority",
        "progress",
        "project",
        "startDate",
        "status",
        "tags",
        "title",
        "type",
      ],
      "notFound": null,
    },
    {
      "name": "update_goal",
      "description": "Update an existing goal's fields.",
      "inputKeys": [
        "contributors",
        "description",
        "endDate",
        "githubMilestone",
        "githubRepo",
        "id",
        "kpi",
        "kpiMetric",
        "kpiTarget",
        "kpiValue",
        "linkedMilestones",
        "linkedPortfolioItems",
        "notes",
        "owner",
        "parentGoal",
        "priority",
        "progress",
        "project",
        "startDate",
        "status",
        "tags",
        "title",
        "type",
      ],
      "notFound": "Error: Goal '__missing__' not found",
    },
    {
      "name": "delete_goal",
      "description": "Delete a goal by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Goal '__missing__' not found",
    },
  ],
  "investors": [
    {
      "name": "list_investors",
      "description":
        "List all investors. Optionally filter by type, stage, or status. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "q",
        "slim",
        "stage",
        "status",
        "tag",
        "type",
      ],
      "notFound": null,
    },
    {
      "name": "get_investor",
      "description": "Get a single investor by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Investor '__missing__' not found",
    },
    {
      "name": "get_investor_by_name",
      "description":
        "Get an investor by name (case-insensitive). Prefer this over list_investors when the name is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Investor '__missing__' not found",
    },
    {
      "name": "create_investor",
      "description": "Create a new investor record.",
      "inputKeys": [
        "amountTarget",
        "contact",
        "introDate",
        "lastContact",
        "name",
        "notes",
        "stage",
        "status",
        "tags",
        "type",
      ],
      "notFound": null,
    },
    {
      "name": "update_investor",
      "description": "Update an existing investor's fields.",
      "inputKeys": [
        "amountTarget",
        "contact",
        "id",
        "introDate",
        "lastContact",
        "name",
        "notes",
        "stage",
        "status",
        "tags",
        "type",
      ],
      "notFound": "Error: Investor '__missing__' not found",
    },
    {
      "name": "delete_investor",
      "description": "Delete an investor by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Investor '__missing__' not found",
    },
  ],
  "journal": [
    {
      "name": "list_journal_entries",
      "description":
        "List all journal entries. Optionally filter by project, mood, or date range. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "from",
        "mood",
        "q",
        "slim",
        "tag",
        "to",
      ],
      "notFound": null,
    },
    {
      "name": "get_journal_entry",
      "description": "Get a single journal entry by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Journal entry '__missing__' not found",
    },
    {
      "name": "get_journal_entry_by_name",
      "description":
        "Get a journal entry by its title (case-insensitive). Prefer this over list_journal_entries when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Journal entry '__missing__' not found",
    },
    {
      "name": "create_journal_entry",
      "description": "Create a new journal entry.",
      "inputKeys": [
        "content",
        "date",
        "mood",
        "tags",
        "title",
      ],
      "notFound": null,
    },
    {
      "name": "update_journal_entry",
      "description": "Update an existing journal entry's fields.",
      "inputKeys": [
        "content",
        "date",
        "id",
        "mood",
        "tags",
        "title",
      ],
      "notFound": "Error: Journal entry '__missing__' not found",
    },
    {
      "name": "delete_journal_entry",
      "description": "Delete a journal entry by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Journal entry '__missing__' not found",
    },
  ],
  "lean-canvases": [
    {
      "name": "list_lean_canvases",
      "description":
        "List all Lean Canvases. Optionally filter by project or search query. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "project",
        "q",
        "slim",
      ],
      "notFound": null,
    },
    {
      "name": "get_lean_canvas",
      "description": "Get a single Lean Canvas by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Lean Canvas '__missing__' not found",
    },
    {
      "name": "get_lean_canvas_by_name",
      "description":
        "Get a Lean Canvas by its title (case-insensitive). Prefer this over list when the name is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Lean Canvas '__missing__' not found",
    },
    {
      "name": "create_lean_canvas",
      "description":
        "Create a new Lean Canvas. Provide title and optionally date, project, and the 12 section arrays.",
      "inputKeys": [
        "channels",
        "costStructure",
        "customerSegments",
        "date",
        "earlyAdopters",
        "existingAlternatives",
        "highLevelConcept",
        "keyMetrics",
        "problem",
        "project",
        "revenueStreams",
        "solution",
        "title",
        "unfairAdvantage",
        "uniqueValueProp",
      ],
      "notFound": null,
    },
    {
      "name": "update_lean_canvas",
      "description": "Update an existing Lean Canvas's fields.",
      "inputKeys": [
        "channels",
        "costStructure",
        "customerSegments",
        "date",
        "earlyAdopters",
        "existingAlternatives",
        "highLevelConcept",
        "id",
        "keyMetrics",
        "problem",
        "project",
        "revenueStreams",
        "solution",
        "title",
        "unfairAdvantage",
        "uniqueValueProp",
      ],
      "notFound": "Error: Lean Canvas '__missing__' not found",
    },
    {
      "name": "delete_lean_canvas",
      "description": "Delete a Lean Canvas by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Lean Canvas '__missing__' not found",
    },
  ],
  "moscow": [
    {
      "name": "list_moscow",
      "description":
        "List all MoSCoW prioritization boards. Optionally filter by project. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "project",
        "q",
        "slim",
      ],
      "notFound": null,
    },
    {
      "name": "get_moscow",
      "description": "Get a single MoSCoW board by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: MoSCoW board '__missing__' not found",
    },
    {
      "name": "get_moscow_by_name",
      "description":
        "Get a MoSCoW board by its title (case-insensitive). Prefer this over list_moscow when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: MoSCoW board '__missing__' not found",
    },
    {
      "name": "create_moscow",
      "description": "Create a new MoSCoW prioritization board.",
      "inputKeys": [
        "could",
        "date",
        "must",
        "notes",
        "project",
        "should",
        "title",
        "wont",
      ],
      "notFound": null,
    },
    {
      "name": "update_moscow",
      "description": "Update an existing MoSCoW board's fields.",
      "inputKeys": [
        "could",
        "date",
        "id",
        "must",
        "notes",
        "project",
        "should",
        "title",
        "wont",
      ],
      "notFound": "Error: MoSCoW board '__missing__' not found",
    },
    {
      "name": "delete_moscow",
      "description": "Delete a MoSCoW board by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: MoSCoW board '__missing__' not found",
    },
  ],
  "onboarding": [
    {
      "name": "list_onboarding",
      "description":
        "List all onboarding flows. Optionally filter by project or status. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "q",
        "role",
        "slim",
        "status",
      ],
      "notFound": null,
    },
    {
      "name": "get_onboarding",
      "description": "Get a single onboarding flow by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Onboarding '__missing__' not found",
    },
    {
      "name": "get_onboarding_by_name",
      "description":
        "Get an onboarding flow by its title (case-insensitive). Prefer this over list_onboarding when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Onboarding '__missing__' not found",
    },
    {
      "name": "create_onboarding",
      "description": "Create a new onboarding flow.",
      "inputKeys": [
        "employeeName",
        "notes",
        "personId",
        "role",
        "startDate",
        "steps",
      ],
      "notFound": null,
    },
    {
      "name": "update_onboarding",
      "description": "Update an existing onboarding flow's fields.",
      "inputKeys": [
        "employeeName",
        "id",
        "notes",
        "personId",
        "role",
        "startDate",
        "steps",
      ],
      "notFound": "Error: Onboarding '__missing__' not found",
    },
    {
      "name": "delete_onboarding",
      "description": "Delete an onboarding flow by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Onboarding '__missing__' not found",
    },
  ],
  "payments": [
    {
      "name": "list_payments",
      "description":
        "List all payments. Optionally filter by invoiceId, method, or search query.",
      "inputKeys": [
        "invoiceId",
        "method",
        "q",
      ],
      "notFound": null,
    },
    {
      "name": "get_payment",
      "description": "Get a single payment by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Payment '__missing__' not found",
    },
    {
      "name": "get_payment_by_name",
      "description":
        "Get a payment by its reference (case-insensitive). Prefer this over list_payments when the reference is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Payment '__missing__' not found",
    },
    {
      "name": "create_payment",
      "description":
        "Create a payment. Automatically updates the linked invoice's paidAmount and status.",
      "inputKeys": [
        "amount",
        "date",
        "invoiceId",
        "method",
        "notes",
        "reference",
      ],
      "notFound": null,
    },
    {
      "name": "update_payment",
      "description": "Update an existing payment's fields.",
      "inputKeys": [
        "amount",
        "date",
        "id",
        "invoiceId",
        "method",
        "notes",
        "reference",
      ],
      "notFound": "Error: Payment '__missing__' not found",
    },
    {
      "name": "delete_payment",
      "description":
        "Delete a payment. Automatically updates the linked invoice's paidAmount and status.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Payment '__missing__' not found",
    },
  ],
  "reflections": [
    {
      "name": "list_reflections",
      "description":
        "List all reflections. Optionally filter by period, tag, date range, or search query. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "from",
        "period",
        "q",
        "slim",
        "tag",
        "to",
      ],
      "notFound": null,
    },
    {
      "name": "get_reflection",
      "description": "Get a single reflection by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Reflection '__missing__' not found",
    },
    {
      "name": "get_reflection_by_name",
      "description":
        "Get a reflection by its title (case-insensitive). Prefer this over list_reflections when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Reflection '__missing__' not found",
    },
    {
      "name": "create_reflection",
      "description": "Create a new reflection entry.",
      "inputKeys": [
        "content",
        "date",
        "period",
        "tags",
        "templateId",
        "title",
      ],
      "notFound": null,
    },
    {
      "name": "update_reflection",
      "description": "Update an existing reflection.",
      "inputKeys": [
        "content",
        "date",
        "id",
        "period",
        "tags",
        "templateId",
        "title",
      ],
      "notFound": "Error: Reflection '__missing__' not found",
    },
    {
      "name": "delete_reflection",
      "description": "Delete a reflection by ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Reflection '__missing__' not found",
    },
  ],
  "risks": [
    {
      "name": "list_risks",
      "description":
        "List all risks. Optionally filter by category, status, or project. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "category",
        "project",
        "q",
        "slim",
        "status",
      ],
      "notFound": null,
    },
    {
      "name": "get_risk",
      "description": "Get a single risk by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Risk '__missing__' not found",
    },
    {
      "name": "get_risk_by_name",
      "description":
        "Get a risk by its title (case-insensitive). Prefer this over list_risks when the title is known.",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Risk '__missing__' not found",
    },
    {
      "name": "create_risk",
      "description": "Create a new risk entry.",
      "inputKeys": [
        "category",
        "description",
        "impact",
        "likelihood",
        "mitigation",
        "owner",
        "project",
        "status",
        "tags",
        "title",
      ],
      "notFound": null,
    },
    {
      "name": "update_risk",
      "description": "Update an existing risk's fields.",
      "inputKeys": [
        "category",
        "description",
        "id",
        "impact",
        "likelihood",
        "mitigation",
        "owner",
        "project",
        "status",
        "tags",
        "title",
      ],
      "notFound": "Error: Risk '__missing__' not found",
    },
    {
      "name": "delete_risk",
      "description": "Delete a risk by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Risk '__missing__' not found",
    },
  ],
  "brainstorm-templates": [
    {
      "name": "list_brainstorm_templates",
      "description":
        "List all brainstorm templates. Pass slim: true to browse with a compact projection.",
      "inputKeys": [
        "category",
        "q",
        "slim",
      ],
      "notFound": null,
    },
    {
      "name": "get_brainstorm_template",
      "description": "Get a single brainstorm template by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Brainstorm template '__missing__' not found",
    },
    {
      "name": "get_brainstorm_template_by_name",
      "description":
        "Get a brainstorm template by its title (case-insensitive).",
      "inputKeys": [
        "name",
      ],
      "notFound": "Error: Brainstorm template '__missing__' not found",
    },
    {
      "name": "create_brainstorm_template",
      "description": "Create a new brainstorm template.",
      "inputKeys": [
        "categories",
        "description",
        "name",
        "questions",
      ],
      "notFound": null,
    },
    {
      "name": "update_brainstorm_template",
      "description": "Update an existing brainstorm template's fields.",
      "inputKeys": [
        "categories",
        "description",
        "id",
        "name",
        "questions",
      ],
      "notFound": "Error: Brainstorm template '__missing__' not found",
    },
    {
      "name": "delete_brainstorm_template",
      "description": "Delete a brainstorm template by its ID.",
      "inputKeys": [
        "id",
      ],
      "notFound": "Error: Brainstorm template '__missing__' not found",
    },
  ],
};

Deno.test("MCP CRUD contract — factory-driven domains stay byte-identical", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-mcp-crud-" });
  initServices(dir, { cache: false });

  try {
    const domains: Array<[string, RegisterFn]> = [
      ["briefs", registerBriefTools],
      ["business-models", registerBusinessModelTools],
      ["companies", registerCompanyTools],
      ["contacts", registerContactTools],
      ["deals", registerDealTools],
      ["fishbone", registerFishboneTools],
      ["goals", registerGoalTools],
      ["investors", registerInvestorTools],
      ["journal", registerJournalTools],
      ["lean-canvases", registerLeanCanvasTools],
      ["moscow", registerMoscowTools],
      ["onboarding", registerOnboardingTools],
      ["payments", registerPaymentTools],
      ["reflections", registerReflectionTools],
      ["risks", registerRiskTools],
      ["brainstorm-templates", registerBrainstormTemplateTools],
    ];

    const snapshot: Record<string, CapturedTool[]> = {};
    for (const [name, fn] of domains) snapshot[name] = await capture(fn);

    assertEquals(snapshot, GOLDEN);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
