// Project service — reads and updates project.md configuration.
// Consumed by API routes, MCP tools, settings page, and sidebar.

import type { ProjectRepository } from "../repositories/project.repository.ts";
import type {
  ProjectConfig,
  ProjectLink,
  PublicProjectConfig,
  UpdateProjectConfig,
} from "../types/project.types.ts";
import { WEEKDAYS } from "../constants/mod.ts";

type Weekday = typeof WEEKDAYS[number];

// Fields updateConfig copies through from a partial update, in declaration
// order. Excludes sectionOrder/kpiMetrics/milestoneStatuses (own setters).
const UPDATE_CONFIG_KEYS = [
  "name",
  "description",
  "startDate",
  "workingDaysPerWeek",
  "workingDays",
  "tags",
  "links",
  "features",
  "navCategories",
  "locale",
  "currency",
  "port",
  "staleDays",
  "hideCompletedAfterDays",
  "githubToken",
  "cloudflareToken",
  "giteaToken",
  "giteaBaseUrl",
  "woodpeckerToken",
  "woodpeckerBaseUrl",
  "pipelinesPerPage",
  "tasksPerSection",
  "cerveauDir",
  "billingCompany",
  "billingAddress",
  "billingEmail",
  "billingPhone",
  "billingLogoUrl",
  "billingDefaultFooter",
  "billingTaxNumber",
  "billingBusinessNumber",
] as const satisfies readonly (keyof UpdateProjectConfig)[];

/** Project configuration service (no entity repository): reads/updates project config — features, schedule, tags, links, section order, nav categories, KPI metrics, milestone statuses. */
export class ProjectService {
  constructor(private repo: ProjectRepository) {}

  async getConfig(): Promise<ProjectConfig> {
    return this.repo.read();
  }

  /**
   * Redact secrets for the browser/API: tokens collapse to presence booleans
   * and API keys to {name, hasKey}. The raw values never leave the server.
   */
  static toPublicConfig(config: ProjectConfig): PublicProjectConfig {
    const {
      githubToken,
      cloudflareToken,
      giteaToken,
      woodpeckerToken,
      apiKeys,
      ...rest
    } = config;
    return {
      ...rest,
      hasGithubToken: Boolean(githubToken),
      hasCloudflareToken: Boolean(cloudflareToken),
      hasGiteaToken: Boolean(giteaToken),
      hasWoodpeckerToken: Boolean(woodpeckerToken),
      apiKeys: apiKeys?.map((k) => ({ name: k.name, hasKey: Boolean(k.key) })),
    };
  }

  /** Redacted config safe to send to the browser/API. */
  async getPublicConfig(): Promise<PublicProjectConfig> {
    return ProjectService.toPublicConfig(await this.repo.read());
  }

  async updateConfig(data: UpdateProjectConfig): Promise<ProjectConfig> {
    const current = await this.repo.read();
    // Whitelist: sectionOrder/kpiMetrics/milestoneStatuses are owned by their
    // own update* methods and intentionally excluded here.
    for (const k of UPDATE_CONFIG_KEYS) {
      if (data[k] !== undefined) Object.assign(current, { [k]: data[k] });
    }
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

  async updateProject(
    data: { name: string; description?: string },
  ): Promise<void> {
    const current = await this.repo.read();
    current.name = data.name;
    current.description = data.description;
    await this.repo.write(current);
  }

  async updateSchedule(data: {
    startDate?: string;
    workingDaysPerWeek?: number;
    workingDays?: Weekday[];
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

  async updateSectionOrder(sections: string[]): Promise<void> {
    const current = await this.repo.read();
    current.sectionOrder = sections;
    await this.repo.write(current);
  }

  async updateNavCategories(
    navCategories: Record<string, string[]>,
  ): Promise<void> {
    const current = await this.repo.read();
    current.navCategories = navCategories;
    await this.repo.write(current);
  }

  async updateKpiMetrics(metrics: string[]): Promise<void> {
    const current = await this.repo.read();
    current.kpiMetrics = metrics;
    await this.repo.write(current);
  }

  async updateMilestoneStatuses(statuses: string[]): Promise<void> {
    const current = await this.repo.read();
    current.milestoneStatuses = statuses;
    await this.repo.write(current);
  }
}
