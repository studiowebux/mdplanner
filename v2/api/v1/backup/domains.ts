// Backup domain registrations — one registerDomain() call per CRUD domain.
// Excluded: project (infrastructure config), github (external API),
//           dns (Cloudflare sync side-effects), cache/search (infrastructure),
//           sticky-notes (board-scoped, multi-repo — boards are included).

import type { MilestoneBase } from "../../../types/milestone.types.ts";
import type { Task } from "../../../types/task.types.ts";
import {
  getBillingRateService,
  getBrainstormService,
  getBriefService,
  getBusinessModelService,
  getC4Service,
  getCapacityPlanService,
  getCompanyService,
  getContactService,
  getCustomerService,
  getDealService,
  getEisenhowerService,
  getFinanceService,
  getFishboneService,
  getGoalService,
  getHabitService,
  getIdeaService,
  getInvestorService,
  getInvoiceService,
  getJournalService,
  getLeanCanvasService,
  getMarketingPlanService,
  getMeetingService,
  getMilestoneRepository,
  getMilestoneService,
  getMindmapService,
  getMoscowService,
  getNoteService,
  getPaymentService,
  getPeopleService,
  getPortfolioService,
  getProjectValueBoardService,
  getQuoteService,
  getReflectionService,
  getRetrospectiveService,
  getRiskService,
  getSafeService,
  getStickyBoardService,
  getStrategicLevelsService,
  getSwotService,
  getTaskRepository,
  getTaskService,
} from "../../../singletons/services.ts";
import { registerDomain } from "./registry.ts";

// deno-lint-ignore no-explicit-any
type BackupService = {
  list(): Promise<any[]>;
  upsertMany(items: any[]): Promise<{ count: number; errors: string[] }>;
};

function domain(key: string, label: string, get: () => BackupService) {
  registerDomain({
    key,
    label,
    export: () => get().list(),
    import: (items) => get().upsertMany(items),
  });
}

async function upsertViaRepo<T extends { id: string }>(
  // deno-lint-ignore no-explicit-any
  repo: { upsertEntity(item: T): Promise<T> },
  items: unknown[],
): Promise<{ count: number; errors: string[] }> {
  let count = 0;
  const errors: string[] = [];
  for (const item of items as T[]) {
    const id = (item as Record<string, unknown>).id as string ?? "?";
    try {
      await repo.upsertEntity(item);
      count++;
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { count, errors };
}

export function registerBackupDomains(): void {
  // Tasks — custom service; use repo directly for upsert
  registerDomain({
    key: "tasks",
    label: "Tasks",
    export: () => getTaskService().list(),
    import: (items) => upsertViaRepo<Task>(getTaskRepository(), items),
  });

  domain("people", "People", getPeopleService);

  // Milestones — custom service; use repo directly for upsert
  registerDomain({
    key: "milestones",
    label: "Milestones",
    export: () => getMilestoneService().list(),
    import: (items) =>
      upsertViaRepo<MilestoneBase>(getMilestoneRepository(), items),
  });

  domain("notes", "Notes", getNoteService);
  domain("portfolio", "Portfolio", getPortfolioService);
  domain("goals", "Goals", getGoalService);
  domain("ideas", "Ideas", getIdeaService);
  domain("marketing-plans", "Marketing Plans", getMarketingPlanService);
  domain("swot", "SWOT", getSwotService);
  domain("moscow", "MoSCoW", getMoscowService);
  domain("c4", "C4 Diagrams", getC4Service);
  domain("eisenhower", "Eisenhower", getEisenhowerService);
  domain("mindmaps", "Mind Maps", getMindmapService);
  domain("fishbone", "Fishbone", getFishboneService);
  domain("business-models", "Business Models", getBusinessModelService);
  domain("risks", "Risks", getRiskService);
  domain("strategic-levels", "Strategic Levels", getStrategicLevelsService);
  domain("safe", "SAFe", getSafeService);
  domain(
    "project-value-boards",
    "Project Value Boards",
    getProjectValueBoardService,
  );
  domain("customers", "Customers", getCustomerService);
  domain("contacts", "Contacts", getContactService);
  domain("companies", "Companies", getCompanyService);
  domain("deals", "Deals", getDealService);
  domain("finances", "Finances", getFinanceService);
  domain("habits", "Habits", getHabitService);
  domain("journal", "Journal", getJournalService);
  domain("reflections", "Reflections", getReflectionService);
  domain("investors", "Investors", getInvestorService);
  domain("invoices", "Invoices", getInvoiceService);
  domain("payments", "Payments", getPaymentService);
  domain("quotes", "Quotes", getQuoteService);
  domain("billing-rates", "Billing Rates", getBillingRateService);
  domain("brainstorms", "Brainstorms", getBrainstormService);
  domain("briefs", "Briefs", getBriefService);
  domain("capacity-plans", "Capacity Plans", getCapacityPlanService);
  domain("retrospectives", "Retrospectives", getRetrospectiveService);
  domain("meetings", "Meetings", getMeetingService);
  domain("lean-canvases", "Lean Canvases", getLeanCanvasService);
  domain("sticky-boards", "Sticky Boards", getStickyBoardService);
}
