// Service singletons — instantiated once at startup with the project path.

import { MilestoneRepository } from "../repositories/milestone.repository.ts";
import { TaskRepository } from "../repositories/task.repository.ts";
import { MilestoneService } from "../services/milestone.service.ts";

let milestoneService: MilestoneService | null = null;

export function initServices(projectDir: string): void {
  const milestoneRepo = new MilestoneRepository(projectDir);
  const taskRepo = new TaskRepository(projectDir);
  milestoneService = new MilestoneService(milestoneRepo, taskRepo);
}

export function getMilestoneService(): MilestoneService {
  if (!milestoneService) {
    throw new Error("Services not initialized — call initServices() first");
  }
  return milestoneService;
}
