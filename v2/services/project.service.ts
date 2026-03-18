// Project service — reads and updates project.md configuration.
// Consumed by API routes, MCP tools, settings page, and sidebar.

import type { ProjectRepository } from "../repositories/project.repository.ts";
import type {
  ProjectConfig,
  ProjectLink,
  UpdateProjectConfig,
} from "../domains/project/types.ts";

export class ProjectService {
  constructor(private repo: ProjectRepository) {}

  async getConfig(): Promise<ProjectConfig> {
    return this.repo.read();
  }

  async updateConfig(data: UpdateProjectConfig): Promise<ProjectConfig> {
    const current = await this.repo.read();
    if (data.name !== undefined) current.name = data.name;
    if (data.description !== undefined) current.description = data.description;
    if (data.startDate !== undefined) current.startDate = data.startDate;
    if (data.workingDaysPerWeek !== undefined) current.workingDaysPerWeek = data.workingDaysPerWeek;
    if (data.workingDays !== undefined) current.workingDays = data.workingDays;
    if (data.tags !== undefined) current.tags = data.tags;
    if (data.links !== undefined) current.links = data.links;
    if (data.features !== undefined) current.features = data.features;
    await this.repo.write(current);
    return current;
  }

  async getEnabledFeatures(): Promise<string[]> {
    const config = await this.repo.read();
    return config.features ?? [];
  }

  async setFeatures(features: string[]): Promise<void> {
    const current = await this.repo.read();
    current.features = features;
    await this.repo.write(current);
  }

  async updateProject(data: { name: string; description?: string }): Promise<void> {
    const current = await this.repo.read();
    current.name = data.name;
    current.description = data.description;
    await this.repo.write(current);
  }

  async updateSchedule(data: {
    startDate?: string;
    workingDaysPerWeek?: number;
    workingDays?: string[];
  }): Promise<void> {
    const current = await this.repo.read();
    current.startDate = data.startDate || undefined;
    current.workingDaysPerWeek = data.workingDaysPerWeek;
    current.workingDays = data.workingDays;
    await this.repo.write(current);
  }

  async updateTags(tags: string[]): Promise<void> {
    const current = await this.repo.read();
    current.tags = tags;
    await this.repo.write(current);
  }

  async updateLinks(links: ProjectLink[]): Promise<void> {
    const current = await this.repo.read();
    current.links = links;
    await this.repo.write(current);
  }
}
