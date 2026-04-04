// Project repository — reads and writes project.md frontmatter from disk.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { atomicWrite } from "../utils/safe-io.ts";
import type { ProjectConfig } from "../types/project.types.ts";
import { FrontmatterProjectSchema } from "../types/project.types.ts";
import { encryptSecret } from "../utils/secrets.ts";

export class ProjectRepository {
  private filePath: string;

  constructor(projectDir: string) {
    this.filePath = join(projectDir, "project.md");
  }

  async read(): Promise<ProjectConfig> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      return this.parse(content);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return { name: "New Project" };
      }
      throw err;
    }
  }

  async write(config: ProjectConfig): Promise<void> {
    const fm: Record<string, unknown> = {};
    if (config.startDate) fm.start_date = config.startDate;
    if (config.workingDaysPerWeek !== undefined) {
      fm.working_days_per_week = config.workingDaysPerWeek;
    }
    if (config.workingDays) fm.working_days = config.workingDays;
    if (config.tags) fm.tags = config.tags;
    if (config.links) fm.links = config.links;
    if (config.features && config.features.length > 0) {
      fm.features = config.features;
    }
    if (config.navCategories) fm.nav_categories = config.navCategories;
    if (config.port !== undefined) fm.port = config.port;
    if (config.locale) fm.locale = config.locale;
    if (config.currency) fm.currency = config.currency;
    if (config.sectionOrder && config.sectionOrder.length > 0) {
      fm.section_order = config.sectionOrder;
    }
    if (config.pipelinesPerPage !== undefined) {
      fm.pipelines_per_page = config.pipelinesPerPage;
    }
    if (config.staleDays !== undefined) {
      fm.stale_days = config.staleDays;
    }
    if (config.stableVersion !== undefined) {
      fm.stable_version = config.stableVersion;
    }
    if (config.kpiMetrics && config.kpiMetrics.length > 0) {
      fm.kpi_metrics = config.kpiMetrics;
    }
    if (config.githubToken) {
      fm.github_token = await encryptSecret(config.githubToken);
    }
    if (config.cloudflareToken) {
      fm.cloudflare_token = await encryptSecret(config.cloudflareToken);
    }
    fm.last_updated = new Date().toISOString();

    let body = `# ${config.name}`;
    if (config.description) {
      body += `\n\n${config.description}`;
    }

    await atomicWrite(this.filePath, serializeFrontmatter(fm, body.trimEnd()));
  }

  private async parse(content: string): Promise<ProjectConfig> {
    const { frontmatter: fm, body } = parseFrontmatter(content);

    const titleMatch = body.match(/^#\s+(.+)/m);
    const name = titleMatch?.[1]?.trim() ?? "Untitled Project";

    const lines = body.split("\n");
    const titleIdx = lines.findIndex((l) => /^#\s+/.test(l));
    const desc = titleIdx >= 0
      ? lines.slice(titleIdx + 1).join("\n").trim()
      : undefined;

    const fmConfig = await FrontmatterProjectSchema.parseAsync(fm);

    return { name, description: desc || undefined, ...fmConfig };
  }
}
