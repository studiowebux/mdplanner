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
import { RetrospectiveRepository } from "../repositories/retrospective.repository.ts";
import { RetrospectiveService } from "../services/retrospective.service.ts";
import { registerRetrospectiveEntity } from "../domains/retrospective/cache.ts";
import { LeanCanvasRepository } from "../repositories/lean-canvas.repository.ts";
import { LeanCanvasService } from "../services/lean-canvas.service.ts";
import { registerLeanCanvasEntity } from "../domains/lean-canvas/cache.ts";
import { StickyNoteRepository } from "../repositories/sticky-note.repository.ts";
import { StickyNoteService } from "../services/sticky-note.service.ts";
import { registerStickyNoteEntity } from "../domains/sticky-note/cache.ts";

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

let cacheDb: CacheDatabase | null = null;
let cacheSync: CacheSync | null = null;
let searchEngine: SearchEngine | null = null;
let cacheEnabled = false;

export function initServices(
  projectDir: string,
  options: InitOptions = {},
): void {
  const useCache = options.cache ?? true;

  const milestoneRepo = new MilestoneRepository(projectDir);
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
  const customerRepo = new CustomerRepository(projectDir);
  _set(_svc, "customer", new CustomerService(customerRepo));
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
  const retrospectiveRepo = new RetrospectiveRepository(projectDir);
  _set(_svc, "retrospective", new RetrospectiveService(retrospectiveRepo));
  const leanCanvasRepo = new LeanCanvasRepository(projectDir);
  _set(_svc, "leanCanvas", new LeanCanvasService(leanCanvasRepo));
  const stickyNoteRepo = new StickyNoteRepository(projectDir);
  _set(_svc, "stickyNote", new StickyNoteService(stickyNoteRepo));
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
    registerCustomerEntity(customerRepo);
    registerBillingRateEntity(billingRateRepo);
    registerQuoteEntity(quoteRepo);
    registerInvoiceEntity(invoiceRepo);
    registerPaymentEntity(paymentRepo);
    registerBrainstormEntity(brainstormRepo);
    registerBriefEntity(briefRepo);
    registerRetrospectiveEntity(retrospectiveRepo);
    registerLeanCanvasEntity(leanCanvasRepo);
    registerStickyNoteEntity(stickyNoteRepo);

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
    billingRateRepo.setCacheDb(cacheDb);
    quoteRepo.setCacheDb(cacheDb);
    invoiceRepo.setCacheDb(cacheDb);
    paymentRepo.setCacheDb(cacheDb);
    brainstormRepo.setCacheDb(cacheDb);
    briefRepo.setCacheDb(cacheDb);
    retrospectiveRepo.setCacheDb(cacheDb);
    leanCanvasRepo.setCacheDb(cacheDb);
    stickyNoteRepo.setCacheDb(cacheDb);

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

export function getCustomerService(): CustomerService {
  return _get<CustomerService>(_svc, "customer");
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

export function getRetrospectiveService(): RetrospectiveService {
  return _get<RetrospectiveService>(_svc, "retrospective");
}

export function getLeanCanvasService(): LeanCanvasService {
  return _get<LeanCanvasService>(_svc, "leanCanvas");
}

export function getStickyNoteService(): StickyNoteService {
  return _get<StickyNoteService>(_svc, "stickyNote");
}

export function getDnsService(): DnsService {
  return _get<DnsService>(_svc, "dns");
}

export function getGitHubService(): GitHubService {
  return _get<GitHubService>(_svc, "github");
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
