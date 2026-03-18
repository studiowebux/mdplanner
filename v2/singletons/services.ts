// Service singletons — instantiated once at startup with the project path.

import { log } from "./logger.ts";
import { MilestoneRepository } from "../repositories/milestone.repository.ts";
import { TaskRepository } from "../repositories/task.repository.ts";
import { PortfolioRepository } from "../repositories/portfolio.repository.ts";
import { ProjectRepository } from "../repositories/project.repository.ts";
import { MilestoneService } from "../services/milestone.service.ts";
import { PortfolioService } from "../services/portfolio.service.ts";
import { ProjectService } from "../services/project.service.ts";
import {
  CacheDatabase,
  CacheSync,
  SearchEngine,
} from "../database/sqlite/mod.ts";

// Entity registrations — import for side-effect (pushes into ENTITIES array)
import "../domains/milestone/cache.ts";

export interface InitOptions {
  cache?: boolean;
}

let milestoneService: MilestoneService | null = null;
let portfolioService: PortfolioService | null = null;
let projectService: ProjectService | null = null;
let cacheSync: CacheSync | null = null;
let searchEngine: SearchEngine | null = null;
let cacheEnabled = false;

export function initServices(
  projectDir: string,
  options: InitOptions = {},
): void {
  const useCache = options.cache ?? true;

  const milestoneRepo = new MilestoneRepository(projectDir);
  const taskRepo = new TaskRepository(projectDir);
  const portfolioRepo = new PortfolioRepository(projectDir);
  const projectRepo = new ProjectRepository(projectDir);
  milestoneService = new MilestoneService(milestoneRepo, taskRepo);
  portfolioService = new PortfolioService(portfolioRepo);
  projectService = new ProjectService(projectRepo);

  if (useCache) {
    const cacheDb = new CacheDatabase(`${projectDir}/.mdplanner-cache.db`);
    cacheSync = new CacheSync(cacheDb);
    cacheSync.init();
    searchEngine = new SearchEngine(cacheDb);
    milestoneService.setCache(cacheSync);
    cacheEnabled = true;
  }
}

export function isCacheEnabled(): boolean {
  return cacheEnabled;
}

export function getMilestoneService(): MilestoneService {
  if (!milestoneService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return milestoneService;
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
