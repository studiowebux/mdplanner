// Service singletons — instantiated once at startup with the project path.

import { MilestoneRepository } from "../repositories/milestone.repository.ts";
import { TaskRepository } from "../repositories/task.repository.ts";
import { PortfolioRepository } from "../repositories/portfolio.repository.ts";
import { MilestoneService } from "../services/milestone.service.ts";
import { PortfolioService } from "../services/portfolio.service.ts";

let milestoneService: MilestoneService | null = null;
let portfolioService: PortfolioService | null = null;

export function initServices(projectDir: string): void {
  const milestoneRepo = new MilestoneRepository(projectDir);
  const taskRepo = new TaskRepository(projectDir);
  const portfolioRepo = new PortfolioRepository(projectDir);
  milestoneService = new MilestoneService(milestoneRepo, taskRepo);
  portfolioService = new PortfolioService(portfolioRepo);
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
