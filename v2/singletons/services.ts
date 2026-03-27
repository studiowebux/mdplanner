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
import { DnsRepository } from "../repositories/dns.repository.ts";
import { GoalRepository } from "../repositories/goal.repository.ts";
import { IdeaRepository } from "../repositories/idea.repository.ts";
import { NoteRepository } from "../repositories/note.repository.ts";
import { PeopleRepository } from "../repositories/people.repository.ts";

export interface InitOptions {
  cache?: boolean;
}

let taskRepo: TaskRepository | null = null;
let peopleRepo: PeopleRepository | null = null;
let milestoneService: MilestoneService | null = null;
let taskService: TaskService | null = null;
let peopleService: PeopleService | null = null;
let noteService: NoteService | null = null;
let portfolioService: PortfolioService | null = null;
let projectService: ProjectService | null = null;
let goalService: GoalService | null = null;
let ideaService: IdeaService | null = null;
let dnsService: DnsService | null = null;
let githubService: GitHubService | null = null;
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
  taskRepo = new TaskRepository(projectDir);
  const noteRepo = new NoteRepository(projectDir);
  const portfolioRepo = new PortfolioRepository(projectDir);
  const projectRepo = new ProjectRepository(projectDir);
  peopleRepo = new PeopleRepository(projectDir);
  milestoneService = new MilestoneService(milestoneRepo, taskRepo);
  taskService = new TaskService(taskRepo, peopleRepo);
  peopleService = new PeopleService(peopleRepo);
  noteService = new NoteService(noteRepo);
  portfolioService = new PortfolioService(portfolioRepo);
  projectService = new ProjectService(projectRepo);
  const goalRepo = new GoalRepository(projectDir);
  goalService = new GoalService(goalRepo);
  const ideaRepo = new IdeaRepository(projectDir);
  ideaService = new IdeaService(ideaRepo);
  const dnsRepo = new DnsRepository(projectDir);
  dnsService = new DnsService(dnsRepo, projectService);
  githubService = new GitHubService(projectService);

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

    // Pass cacheDb to repos for read-path caching
    milestoneRepo.setCacheDb(cacheDb);
    taskRepo.setCacheDb(cacheDb);
    portfolioRepo.setCacheDb(cacheDb);
    peopleRepo.setCacheDb(cacheDb);

    cacheSync = new CacheSync(cacheDb);
    cacheSync.init();
    searchEngine = new SearchEngine(cacheDb);
    milestoneService.setCache(cacheSync);
    taskService.setCache(cacheSync);
    peopleService.setCache(cacheSync);
    portfolioService.setCache(cacheSync);
    cacheEnabled = true;
  }
}

export function isCacheEnabled(): boolean {
  return cacheEnabled;
}

export function getTaskRepository(): TaskRepository {
  if (!taskRepo) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return taskRepo;
}

export function getTaskService(): TaskService {
  if (!taskService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return taskService;
}

export function getPeopleRepository(): PeopleRepository {
  if (!peopleRepo) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return peopleRepo;
}

export function getPeopleService(): PeopleService {
  if (!peopleService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return peopleService;
}

export function getMilestoneService(): MilestoneService {
  if (!milestoneService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return milestoneService;
}

export function getNoteService(): NoteService {
  if (!noteService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return noteService;
}

export function getPortfolioService(): PortfolioService {
  if (!portfolioService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return portfolioService;
}

export function getProjectService(): ProjectService {
  if (!projectService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return projectService;
}

export function getGoalService(): GoalService {
  if (!goalService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return goalService;
}

export function getIdeaService(): IdeaService {
  if (!ideaService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return ideaService;
}

export function getDnsService(): DnsService {
  if (!dnsService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return dnsService;
}

export function getGitHubService(): GitHubService {
  if (!githubService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return githubService;
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
