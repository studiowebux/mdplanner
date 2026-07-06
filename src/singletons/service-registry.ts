// Service registry — shared singleton maps, typed get/set, mutable init state,
// and the get<Domain>Service()/get<Domain>Repository() accessors. initServices()
// (services.ts) populates the maps and registryState; every consumer reads
// through these accessors (re-exported from services.ts, the public entry).

import type { CacheSync, SearchEngine } from "../database/sqlite/mod.ts";
import type { MilestoneRepository } from "../repositories/milestone.repository.ts";
import type { TaskRepository } from "../repositories/task.repository.ts";
import type { PeopleRepository } from "../repositories/people.repository.ts";
import type { MindmapRepository } from "../repositories/mindmap.repository.ts";
import { StickyNoteRepository } from "../repositories/sticky-note.repository.ts";
import type { MilestoneService } from "../services/milestone.service.ts";
import type { NoteService } from "../services/note.service.ts";
import type { PeopleService } from "../services/people.service.ts";
import type { PortfolioService } from "../services/portfolio.service.ts";
import type { DnsService } from "../services/dns.service.ts";
import type { GoalService } from "../services/goal.service.ts";
import type { IdeaService } from "../services/idea.service.ts";
import type { MarketingPlanService } from "../services/marketing-plan.service.ts";
import type { SwotService } from "../services/swot.service.ts";
import type { GitHubService } from "../services/github.service.ts";
import type { WoodpeckerService } from "../services/woodpecker.service.ts";
import type { CerveauService } from "../services/cerveau.service.ts";
import type { ProjectService } from "../services/project.service.ts";
import type { TaskService } from "../services/task.service.ts";
import type { CustomerService } from "../services/customer.service.ts";
import type { ContactService } from "../services/contact.service.ts";
import type { BillingRateService } from "../services/billing-rate.service.ts";
import type { QuoteService } from "../services/quote.service.ts";
import type { InvoiceService } from "../services/invoice.service.ts";
import type { PaymentService } from "../services/payment.service.ts";
import type { BrainstormService } from "../services/brainstorm.service.ts";
import type { BrainstormTemplateService } from "../services/brainstorm-template.service.ts";
import type { BriefService } from "../services/brief.service.ts";
import type { CapacityPlanService } from "../services/capacity-plan.service.ts";
import type { RetrospectiveService } from "../services/retrospective.service.ts";
import type { MeetingService } from "../services/meeting.service.ts";
import type { LeanCanvasService } from "../services/lean-canvas.service.ts";
import { StickyNoteService } from "../services/sticky-note.service.ts";
import type { StickyBoardService } from "../services/sticky-board.service.ts";
import type { MoscowService } from "../services/moscow.service.ts";
import type { C4Service } from "../services/c4.service.ts";
import type { EisenhowerService } from "../services/eisenhower.service.ts";
import type { DealService } from "../services/deal.service.ts";
import type { FinanceService } from "../services/finance.service.ts";
import type { HabitService } from "../services/habit.service.ts";
import type { JournalService } from "../services/journal.service.ts";
import type { ReflectionService } from "../services/reflection.service.ts";
import type { ReflectionTemplateService } from "../services/reflection-template.service.ts";
import type { OnboardingService } from "../services/onboarding.service.ts";
import type { OnboardingTemplateService } from "../services/onboarding-template.service.ts";
import type { MindmapService } from "../services/mindmap.service.ts";
import type { FishboneService } from "../services/fishbone.service.ts";
import type { BusinessModelService } from "../services/business-model.service.ts";
import type { RiskService } from "../services/risk.service.ts";
import type { VacationService } from "../services/vacation.service.ts";
import type { StrategicLevelsService } from "../services/strategic-levels.service.ts";
import type { SafeService } from "../services/safe.service.ts";
import type { ProjectValueBoardService } from "../services/project-value-board.service.ts";
import type { CompanyService } from "../services/company.service.ts";
import type { InvestorService } from "../services/investor.service.ts";

export const _svc = new Map<string, unknown>();
export const _repo = new Map<string, unknown>();

export function _set<T>(map: Map<string, unknown>, key: string, value: T): T {
  map.set(key, value);
  return value;
}

export function _get<T>(map: Map<string, unknown>, key: string): T {
  const v = map.get(key);
  if (v === undefined) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return v as T;
}

/** Mutable init-time state, set by initServices() and read by the accessors. */
export const registryState: {
  projectDir: string;
  cacheSync: CacheSync | null;
  searchEngine: SearchEngine | null;
} = {
  projectDir: "",
  cacheSync: null,
  searchEngine: null,
};

export function getProjectDir(): string {
  return registryState.projectDir;
}

export function getTaskRepository(): TaskRepository {
  return _get<TaskRepository>(_repo, "task");
}

export function getTaskService(): TaskService {
  return _get<TaskService>(_svc, "task");
}

export function getPeopleRepository(): PeopleRepository {
  return _get<PeopleRepository>(_repo, "people");
}

export function getPeopleService(): PeopleService {
  return _get<PeopleService>(_svc, "people");
}

export function getMilestoneService(): MilestoneService {
  return _get<MilestoneService>(_svc, "milestone");
}

export function getMilestoneRepository(): MilestoneRepository {
  return _get<MilestoneRepository>(_repo, "milestone");
}

export function getNoteService(): NoteService {
  return _get<NoteService>(_svc, "note");
}

export function getPortfolioService(): PortfolioService {
  return _get<PortfolioService>(_svc, "portfolio");
}

export function getProjectService(): ProjectService {
  return _get<ProjectService>(_svc, "project");
}

export function getGoalService(): GoalService {
  return _get<GoalService>(_svc, "goal");
}

export function getIdeaService(): IdeaService {
  return _get<IdeaService>(_svc, "idea");
}

export function getMarketingPlanService(): MarketingPlanService {
  return _get<MarketingPlanService>(_svc, "marketingPlan");
}

export function getSwotService(): SwotService {
  return _get<SwotService>(_svc, "swot");
}

export function getMoscowService(): MoscowService {
  return _get<MoscowService>(_svc, "moscow");
}

export function getC4Service(): C4Service {
  return _get<C4Service>(_svc, "c4");
}

export function getEisenhowerService(): EisenhowerService {
  return _get<EisenhowerService>(_svc, "eisenhower");
}

export function getMindmapService(): MindmapService {
  return _get<MindmapService>(_svc, "mindmap");
}

export function getFishboneService(): FishboneService {
  return _get<FishboneService>(_svc, "fishbone");
}

export function getBusinessModelService(): BusinessModelService {
  return _get<BusinessModelService>(_svc, "businessModel");
}

export function getRiskService(): RiskService {
  return _get<RiskService>(_svc, "risk");
}

export function getVacationService(): VacationService {
  return _get<VacationService>(_svc, "vacation");
}

export function getStrategicLevelsService(): StrategicLevelsService {
  return _get<StrategicLevelsService>(_svc, "strategicLevels");
}

export function getSafeService(): SafeService {
  return _get<SafeService>(_svc, "safe");
}

export function getProjectValueBoardService(): ProjectValueBoardService {
  return _get<ProjectValueBoardService>(_svc, "projectValueBoard");
}

export function getCustomerService(): CustomerService {
  return _get<CustomerService>(_svc, "customer");
}

export function getContactService(): ContactService {
  return _get<ContactService>(_svc, "contact");
}

export function getDealService(): DealService {
  return _get<DealService>(_svc, "deal");
}

export function getHabitService(): HabitService {
  return _get<HabitService>(_svc, "habit");
}

export function getJournalService(): JournalService {
  return _get<JournalService>(_svc, "journal");
}

export function getReflectionService(): ReflectionService {
  return _get<ReflectionService>(_svc, "reflection");
}

export function getReflectionTemplateService(): ReflectionTemplateService {
  return _get<ReflectionTemplateService>(_svc, "reflectionTemplate");
}

export function getOnboardingService(): OnboardingService {
  return _get<OnboardingService>(_svc, "onboarding");
}

export function getOnboardingTemplateService(): OnboardingTemplateService {
  return _get<OnboardingTemplateService>(_svc, "onboardingTemplate");
}

export function getFinanceService(): FinanceService {
  return _get<FinanceService>(_svc, "finance");
}

export function getCompanyService(): CompanyService {
  return _get<CompanyService>(_svc, "company");
}

export function getBillingRateService(): BillingRateService {
  return _get<BillingRateService>(_svc, "billingRate");
}

export function getQuoteService(): QuoteService {
  return _get<QuoteService>(_svc, "quote");
}

export function getInvoiceService(): InvoiceService {
  return _get<InvoiceService>(_svc, "invoice");
}

export function getPaymentService(): PaymentService {
  return _get<PaymentService>(_svc, "payment");
}

export function getBrainstormService(): BrainstormService {
  return _get<BrainstormService>(_svc, "brainstorm");
}

export function getBrainstormTemplateService(): BrainstormTemplateService {
  return _get<BrainstormTemplateService>(_svc, "brainstormTemplate");
}

export function getBriefService(): BriefService {
  return _get<BriefService>(_svc, "brief");
}

export function getCapacityPlanService(): CapacityPlanService {
  return _get<CapacityPlanService>(_svc, "capacityPlan");
}

export function getRetrospectiveService(): RetrospectiveService {
  return _get<RetrospectiveService>(_svc, "retrospective");
}

export function getMeetingService(): MeetingService {
  return _get<MeetingService>(_svc, "meeting");
}

export function getLeanCanvasService(): LeanCanvasService {
  return _get<LeanCanvasService>(_svc, "leanCanvas");
}

export function getStickyNoteService(): StickyNoteService {
  return _get<StickyNoteService>(_svc, "stickyNote");
}

export function getStickyNoteServiceForBoard(
  boardId: string,
): StickyNoteService {
  return new StickyNoteService(
    new StickyNoteRepository(registryState.projectDir, boardId),
  );
}

export function getStickyBoardService(): StickyBoardService {
  return _get<StickyBoardService>(_svc, "stickyBoard");
}

export function getDnsService(): DnsService {
  return _get<DnsService>(_svc, "dns");
}

export function getGitHubService(): GitHubService {
  return _get<GitHubService>(_svc, "github");
}

export function getWoodpeckerService(): WoodpeckerService {
  return _get<WoodpeckerService>(_svc, "woodpecker");
}

export function getCerveauService(): CerveauService {
  return _get<CerveauService>(_svc, "cerveau");
}

export function getInvestorService(): InvestorService {
  return _get<InvestorService>(_svc, "investor");
}

export function getCacheSync(): CacheSync | null {
  return registryState.cacheSync;
}

export function getSearchEngine(): SearchEngine | null {
  return registryState.searchEngine;
}
