// Service singletons — instantiated once at startup with the project path.

import { log } from "./logger.ts";
import { MilestoneRepository } from "../repositories/milestone.repository.ts";
import { TaskRepository } from "../repositories/task.repository.ts";
import { PortfolioRepository } from "../repositories/portfolio.repository.ts";
import { ProjectRepository } from "../repositories/project.repository.ts";
import { MilestoneService } from "../services/milestone.service.ts";
import { NoteService } from "../services/note.service.ts";
import { PeopleService } from "../services/people.service.ts";
import { PortfolioService } from "../services/portfolio.service.ts";
import { DnsService } from "../services/dns.service.ts";
import { GoalService } from "../services/goal.service.ts";
import { IdeaService } from "../services/idea.service.ts";
import { MarketingPlanService } from "../services/marketing-plan.service.ts";
import { SwotService } from "../services/swot.service.ts";
import { GitHubService } from "../services/github.service.ts";
import { ProjectService } from "../services/project.service.ts";
import { TaskService } from "../services/task.service.ts";
import {
  CacheDatabase,
  CacheSync,
  SearchEngine,
} from "../database/sqlite/mod.ts";
import { registerMilestoneEntity } from "../domains/milestone/cache.ts";
import { registerTaskEntity } from "../domains/task/cache.ts";
import { registerPortfolioEntity } from "../domains/portfolio/cache.ts";
import { registerPeopleEntity } from "../domains/people/cache.ts";
import { registerDnsEntity } from "../domains/dns/cache.ts";
import { registerNoteEntity } from "../domains/note/cache.ts";
import { registerGoalEntity } from "../domains/goal/cache.ts";
import { registerIdeaEntity } from "../domains/idea/cache.ts";
import { registerMarketingPlanEntity } from "../domains/marketing-plan/cache.ts";
import { registerSwotEntity } from "../domains/swot/cache.ts";
import { DnsRepository } from "../repositories/dns.repository.ts";
import { GoalRepository } from "../repositories/goal.repository.ts";
import { IdeaRepository } from "../repositories/idea.repository.ts";
import { MarketingPlanRepository } from "../repositories/marketing-plan.repository.ts";
import { SwotRepository } from "../repositories/swot.repository.ts";
import { NoteRepository } from "../repositories/note.repository.ts";
import { PeopleRepository } from "../repositories/people.repository.ts";
import { CustomerRepository } from "../repositories/customer.repository.ts";
import { CustomerService } from "../services/customer.service.ts";
import { registerCustomerEntity } from "../domains/customer/cache.ts";
import { ContactRepository } from "../repositories/contact.repository.ts";
import { ContactService } from "../services/contact.service.ts";
import { registerContactEntity } from "../domains/contact/cache.ts";
import { BillingRateRepository } from "../repositories/billing-rate.repository.ts";
import { BillingRateService } from "../services/billing-rate.service.ts";
import { registerBillingRateEntity } from "../domains/billing-rate/cache.ts";
import { QuoteRepository } from "../repositories/quote.repository.ts";
import { QuoteService } from "../services/quote.service.ts";
import { registerQuoteEntity } from "../domains/quote/cache.ts";
import { InvoiceRepository } from "../repositories/invoice.repository.ts";
import { InvoiceService } from "../services/invoice.service.ts";
import { registerInvoiceEntity } from "../domains/invoice/cache.ts";
import { PaymentRepository } from "../repositories/payment.repository.ts";
import { PaymentService } from "../services/payment.service.ts";
import { registerPaymentEntity } from "../domains/payment/cache.ts";
import { BrainstormRepository } from "../repositories/brainstorm.repository.ts";
import { BrainstormService } from "../services/brainstorm.service.ts";
import { registerBrainstormEntity } from "../domains/brainstorm/cache.ts";
import { BriefRepository } from "../repositories/brief.repository.ts";
import { BriefService } from "../services/brief.service.ts";
import { registerBriefEntity } from "../domains/brief/cache.ts";
import { CapacityPlanRepository } from "../repositories/capacity-plan.repository.ts";
import { CapacityPlanService } from "../services/capacity-plan.service.ts";
import { registerCapacityPlanEntity } from "../domains/capacity-plan/cache.ts";
import { RetrospectiveRepository } from "../repositories/retrospective.repository.ts";
import { RetrospectiveService } from "../services/retrospective.service.ts";
import { registerRetrospectiveEntity } from "../domains/retrospective/cache.ts";
import { MeetingRepository } from "../repositories/meeting.repository.ts";
import { MeetingService } from "../services/meeting.service.ts";
import { registerMeetingEntity } from "../domains/meeting/cache.ts";
import { LeanCanvasRepository } from "../repositories/lean-canvas.repository.ts";
import { LeanCanvasService } from "../services/lean-canvas.service.ts";
import { registerLeanCanvasEntity } from "../domains/lean-canvas/cache.ts";
import { StickyNoteRepository } from "../repositories/sticky-note.repository.ts";
import { StickyNoteService } from "../services/sticky-note.service.ts";
import { StickyBoardRepository } from "../repositories/sticky-board.repository.ts";
import { StickyBoardService } from "../services/sticky-board.service.ts";
import {
  registerStickyBoardEntity,
  registerStickyNoteEntity,
} from "../domains/sticky-note/cache.ts";
import { MoscowRepository } from "../repositories/moscow.repository.ts";
import { MoscowService } from "../services/moscow.service.ts";
import { registerMoscowEntity } from "../domains/moscow/cache.ts";
import { C4Repository } from "../repositories/c4.repository.ts";
import { C4Service } from "../services/c4.service.ts";
import { registerC4Entity } from "../domains/c4/cache.ts";
import { EisenhowerRepository } from "../repositories/eisenhower.repository.ts";
import { EisenhowerService } from "../services/eisenhower.service.ts";
import { registerEisenhowerEntity } from "../domains/eisenhower/cache.ts";
import { DealRepository } from "../repositories/deal.repository.ts";
import { DealService } from "../services/deal.service.ts";
import { registerDealEntity } from "../domains/deal/cache.ts";
import { FinanceRepository } from "../repositories/finance.repository.ts";
import { FinanceService } from "../services/finance.service.ts";
import { registerFinanceEntity } from "../domains/finance/cache.ts";
import { HabitRepository } from "../repositories/habit.repository.ts";
import { HabitService } from "../services/habit.service.ts";
import { registerHabitEntity } from "../domains/habit/cache.ts";
import { JournalRepository } from "../repositories/journal.repository.ts";
import { JournalService } from "../services/journal.service.ts";
import { registerJournalEntity } from "../domains/journal/cache.ts";
import { ReflectionRepository } from "../repositories/reflection.repository.ts";
import { ReflectionService } from "../services/reflection.service.ts";
import { registerReflectionEntity } from "../domains/reflection/cache.ts";
import { MindmapRepository } from "../repositories/mindmap.repository.ts";
import { MindmapService } from "../services/mindmap.service.ts";
import { registerMindmapEntity } from "../domains/mindmap/cache.ts";
import { FishboneRepository } from "../repositories/fishbone.repository.ts";
import { FishboneService } from "../services/fishbone.service.ts";
import { registerFishboneEntity } from "../domains/fishbone/cache.ts";
import { BusinessModelRepository } from "../repositories/business-model.repository.ts";
import { BusinessModelService } from "../services/business-model.service.ts";
import { registerBusinessModelEntity } from "../domains/business-model/cache.ts";
import { RiskRepository } from "../repositories/risk.repository.ts";
import { RiskService } from "../services/risk.service.ts";
import { registerRiskEntity } from "../domains/risk/cache.ts";
import { VacationRepository } from "../repositories/vacation.repository.ts";
import { VacationService } from "../services/vacation.service.ts";
import { registerVacationEntity } from "../domains/vacation/cache.ts";
import { StrategicLevelsRepository } from "../repositories/strategic-levels.repository.ts";
import { StrategicLevelsService } from "../services/strategic-levels.service.ts";
import { registerStrategicLevelsEntity } from "../domains/strategic-levels/cache.ts";
import { SafeRepository } from "../repositories/safe.repository.ts";
import { SafeService } from "../services/safe.service.ts";
import { registerSafeEntity } from "../domains/safe/cache.ts";
import { ProjectValueBoardRepository } from "../repositories/project-value-board.repository.ts";
import { ProjectValueBoardService } from "../services/project-value-board.service.ts";
import { registerProjectValueBoardEntity } from "../domains/project-value-board/cache.ts";
import { CompanyRepository } from "../repositories/company.repository.ts";
import { CompanyService } from "../services/company.service.ts";
import { registerCompanyEntity } from "../domains/company/cache.ts";
import { InvestorRepository } from "../repositories/investor.repository.ts";
import { InvestorService } from "../services/investor.service.ts";
import { registerInvestorEntity } from "../domains/investor/cache.ts";

export interface InitOptions {
  cache?: boolean;
}

// deno-lint-ignore no-explicit-any
const _svc = new Map<string, any>();
// deno-lint-ignore no-explicit-any
const _repo = new Map<string, any>();

function _set<T>(map: Map<string, unknown>, key: string, value: T): T {
  map.set(key, value);
  return value;
}

function _get<T>(map: Map<string, unknown>, key: string): T {
  const v = map.get(key);
  if (v === undefined) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return v as T;
}

let _projectDir = "";
let cacheDb: CacheDatabase | null = null;
let cacheSync: CacheSync | null = null;
let searchEngine: SearchEngine | null = null;
let cacheEnabled = false;

export function initServices(
  projectDir: string,
  options: InitOptions = {},
): void {
  _projectDir = projectDir;
  const useCache = options.cache ?? true;

  const milestoneRepo = _set(
    _repo,
    "milestone",
    new MilestoneRepository(projectDir),
  );
  const taskRepo = _set(_repo, "task", new TaskRepository(projectDir));
  const noteRepo = new NoteRepository(projectDir);
  const portfolioRepo = new PortfolioRepository(projectDir);
  const projectRepo = new ProjectRepository(projectDir);
  const peopleRepo = _set(_repo, "people", new PeopleRepository(projectDir));

  const milestoneService = _set(
    _svc,
    "milestone",
    new MilestoneService(milestoneRepo, taskRepo),
  );
  const taskService = _set(_svc, "task", new TaskService(taskRepo, peopleRepo));
  const peopleService = _set(_svc, "people", new PeopleService(peopleRepo));
  _set(_svc, "note", new NoteService(noteRepo));
  _set(_svc, "portfolio", new PortfolioService(portfolioRepo));
  const projectService = _set(_svc, "project", new ProjectService(projectRepo));

  const goalRepo = new GoalRepository(projectDir);
  _set(_svc, "goal", new GoalService(goalRepo));
  const ideaRepo = new IdeaRepository(projectDir);
  _set(_svc, "idea", new IdeaService(ideaRepo));
  const marketingPlanRepo = new MarketingPlanRepository(projectDir);
  _set(_svc, "marketingPlan", new MarketingPlanService(marketingPlanRepo));
  const swotRepo = new SwotRepository(projectDir);
  _set(_svc, "swot", new SwotService(swotRepo));
  const fishboneRepo = new FishboneRepository(projectDir);
  _set(_svc, "fishbone", new FishboneService(fishboneRepo));
  const businessModelRepo = new BusinessModelRepository(projectDir);
  _set(_svc, "businessModel", new BusinessModelService(businessModelRepo));
  const riskRepo = new RiskRepository(projectDir);
  _set(_svc, "risk", new RiskService(riskRepo));
  const vacationRepo = new VacationRepository(projectDir);
  _set(_svc, "vacation", new VacationService(vacationRepo));
  const strategicLevelsRepo = new StrategicLevelsRepository(projectDir);
  _set(
    _svc,
    "strategicLevels",
    new StrategicLevelsService(strategicLevelsRepo),
  );
  const safeRepo = new SafeRepository(projectDir);
  _set(_svc, "safe", new SafeService(safeRepo));
  const projectValueBoardRepo = new ProjectValueBoardRepository(projectDir);
  _set(
    _svc,
    "projectValueBoard",
    new ProjectValueBoardService(projectValueBoardRepo),
  );
  const companyRepo = new CompanyRepository(projectDir);
  _set(_svc, "company", new CompanyService(companyRepo));
  const investorRepo = new InvestorRepository(projectDir);
  _set(_svc, "investor", new InvestorService(investorRepo));
  const customerRepo = new CustomerRepository(projectDir);
  _set(_svc, "customer", new CustomerService(customerRepo));
  const contactRepo = new ContactRepository(projectDir);
  _set(_svc, "contact", new ContactService(contactRepo));
  const dealRepo = new DealRepository(projectDir);
  _set(_svc, "deal", new DealService(dealRepo));
  const habitRepo = new HabitRepository(projectDir);
  _set(_svc, "habit", new HabitService(habitRepo));
  const journalRepo = new JournalRepository(projectDir);
  _set(_svc, "journal", new JournalService(journalRepo));
  const reflectionRepo = new ReflectionRepository(projectDir);
  _set(_svc, "reflection", new ReflectionService(reflectionRepo));
  const financeRepo = new FinanceRepository(projectDir);
  _set(_svc, "finance", new FinanceService(financeRepo));
  const billingRateRepo = new BillingRateRepository(projectDir);
  _set(_svc, "billingRate", new BillingRateService(billingRateRepo));
  const quoteRepo = new QuoteRepository(projectDir);
  _set(_svc, "quote", new QuoteService(quoteRepo));
  const invoiceRepo = new InvoiceRepository(projectDir);
  _set(_svc, "invoice", new InvoiceService(invoiceRepo));
  const paymentRepo = new PaymentRepository(projectDir);
  _set(_svc, "payment", new PaymentService(paymentRepo));
  const brainstormRepo = new BrainstormRepository(projectDir);
  _set(_svc, "brainstorm", new BrainstormService(brainstormRepo));
  const briefRepo = new BriefRepository(projectDir);
  _set(_svc, "brief", new BriefService(briefRepo));
  const capacityPlanRepo = new CapacityPlanRepository(projectDir);
  _set(_svc, "capacityPlan", new CapacityPlanService(capacityPlanRepo));
  const retrospectiveRepo = new RetrospectiveRepository(projectDir);
  _set(_svc, "retrospective", new RetrospectiveService(retrospectiveRepo));
  const meetingRepo = new MeetingRepository(projectDir);
  _set(_svc, "meeting", new MeetingService(meetingRepo));
  const leanCanvasRepo = new LeanCanvasRepository(projectDir);
  _set(_svc, "leanCanvas", new LeanCanvasService(leanCanvasRepo));
  const stickyNoteRepo = new StickyNoteRepository(projectDir, "default");
  _set(_svc, "stickyNote", new StickyNoteService(stickyNoteRepo));
  const stickyBoardRepo = new StickyBoardRepository(projectDir);
  _set(_svc, "stickyBoard", new StickyBoardService(stickyBoardRepo));
  const moscowRepo = new MoscowRepository(projectDir);
  _set(_svc, "moscow", new MoscowService(moscowRepo));
  const c4Repo = new C4Repository(projectDir);
  _set(_svc, "c4", new C4Service(c4Repo));
  const eisenhowerRepo = new EisenhowerRepository(projectDir);
  _set(_svc, "eisenhower", new EisenhowerService(eisenhowerRepo));
  const mindmapRepo = _set(
    _repo,
    "mindmap",
    new MindmapRepository(projectDir),
  );
  _set(_svc, "mindmap", new MindmapService(mindmapRepo));
  const dnsRepo = new DnsRepository(projectDir);
  _set(_svc, "dns", new DnsService(dnsRepo, projectService));
  _set(_svc, "github", new GitHubService(projectService));

  if (useCache) {
    cacheDb = new CacheDatabase(`${projectDir}/.mdplanner-cache.db`);

    // Register cache entities with repo references for sync
    registerMilestoneEntity(milestoneRepo);
    registerTaskEntity(taskRepo);
    registerPortfolioEntity(portfolioRepo);
    registerPeopleEntity(peopleRepo);
    registerDnsEntity(dnsRepo);
    registerNoteEntity(noteRepo);
    registerGoalEntity(goalRepo);
    registerIdeaEntity(ideaRepo);
    registerMarketingPlanEntity(marketingPlanRepo);
    registerSwotEntity(swotRepo);
    registerFishboneEntity(fishboneRepo);
    registerBusinessModelEntity(businessModelRepo);
    registerRiskEntity(riskRepo);
    registerVacationEntity(vacationRepo);
    registerStrategicLevelsEntity(strategicLevelsRepo);
    registerSafeEntity(safeRepo);
    registerProjectValueBoardEntity(projectValueBoardRepo);
    registerCompanyEntity(companyRepo);
    registerCustomerEntity(customerRepo);
    registerContactEntity(contactRepo);
    registerBillingRateEntity(billingRateRepo);
    registerQuoteEntity(quoteRepo);
    registerInvoiceEntity(invoiceRepo);
    registerPaymentEntity(paymentRepo);
    registerBrainstormEntity(brainstormRepo);
    registerBriefEntity(briefRepo);
    registerCapacityPlanEntity(capacityPlanRepo);
    registerRetrospectiveEntity(retrospectiveRepo);
    registerMeetingEntity(meetingRepo);
    registerLeanCanvasEntity(leanCanvasRepo);
    registerStickyNoteEntity(stickyNoteRepo);
    registerStickyBoardEntity(() => stickyBoardRepo.findAllFromDisk());
    registerMoscowEntity(moscowRepo);
    registerC4Entity(c4Repo);
    registerEisenhowerEntity(eisenhowerRepo);
    registerMindmapEntity(mindmapRepo);
    registerDealEntity(dealRepo);
    registerHabitEntity(habitRepo);
    registerJournalEntity(journalRepo);
    registerReflectionEntity(reflectionRepo);
    registerFinanceEntity(financeRepo);
    registerInvestorEntity(investorRepo);

    // Pass cacheDb to repos for read-path caching
    milestoneRepo.setCacheDb(cacheDb);
    taskRepo.setCacheDb(cacheDb);
    portfolioRepo.setCacheDb(cacheDb);
    peopleRepo.setCacheDb(cacheDb);
    goalRepo.setCacheDb(cacheDb);
    ideaRepo.setCacheDb(cacheDb);
    dnsRepo.setCacheDb(cacheDb);
    swotRepo.setCacheDb(cacheDb);
    marketingPlanRepo.setCacheDb(cacheDb);
    customerRepo.setCacheDb(cacheDb);
    contactRepo.setCacheDb(cacheDb);
    billingRateRepo.setCacheDb(cacheDb);
    quoteRepo.setCacheDb(cacheDb);
    invoiceRepo.setCacheDb(cacheDb);
    paymentRepo.setCacheDb(cacheDb);
    brainstormRepo.setCacheDb(cacheDb);
    briefRepo.setCacheDb(cacheDb);
    capacityPlanRepo.setCacheDb(cacheDb);
    retrospectiveRepo.setCacheDb(cacheDb);
    meetingRepo.setCacheDb(cacheDb);
    leanCanvasRepo.setCacheDb(cacheDb);
    stickyNoteRepo.setCacheDb(cacheDb);
    stickyBoardRepo.setCacheDb(cacheDb);
    moscowRepo.setCacheDb(cacheDb);
    c4Repo.setCacheDb(cacheDb);
    eisenhowerRepo.setCacheDb(cacheDb);
    dealRepo.setCacheDb(cacheDb);
    habitRepo.setCacheDb(cacheDb);
    journalRepo.setCacheDb(cacheDb);
    reflectionRepo.setCacheDb(cacheDb);
    financeRepo.setCacheDb(cacheDb);
    mindmapRepo.setCacheDb(cacheDb);
    fishboneRepo.setCacheDb(cacheDb);
    businessModelRepo.setCacheDb(cacheDb);
    riskRepo.setCacheDb(cacheDb);
    vacationRepo.setCacheDb(cacheDb);
    strategicLevelsRepo.setCacheDb(cacheDb);
    safeRepo.setCacheDb(cacheDb);
    projectValueBoardRepo.setCacheDb(cacheDb);
    companyRepo.setCacheDb(cacheDb);
    investorRepo.setCacheDb(cacheDb);

    cacheSync = new CacheSync(cacheDb);
    cacheSync.init();
    searchEngine = new SearchEngine(cacheDb);
    milestoneService.setCache(cacheSync);
    taskService.setCache(cacheSync);
    peopleService.setCache(cacheSync);
    _get<PortfolioService>(_svc, "portfolio").setCache(cacheSync);
    cacheEnabled = true;
  }
}

export function isCacheEnabled(): boolean {
  return cacheEnabled;
}

export function getProjectDir(): string {
  return _projectDir;
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
  return new StickyNoteService(new StickyNoteRepository(_projectDir, boardId));
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

export function getInvestorService(): InvestorService {
  return _get<InvestorService>(_svc, "investor");
}

export function getCacheSync(): CacheSync | null {
  return cacheSync;
}

export function getSearchEngine(): SearchEngine | null {
  return searchEngine;
}

/**
 * Run full cache sync. Call after initServices().
 * No-op if cache is disabled.
 */
export async function bootCacheSync(): Promise<void> {
  if (!cacheSync) return;
  const result = await cacheSync.fullSync();
  if (result.errors.length > 0) {
    log.error("[cache] sync errors:", result.errors);
  } else {
    log.info(
      `[cache] synced ${result.items} items across ${result.tables} tables in ${result.duration}ms`,
    );
  }
}
