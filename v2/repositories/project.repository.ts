// Project repository — reads and writes project.md frontmatter from disk.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { atomicWrite } from "../utils/safe-io.ts";
import type { ProjectConfig, ProjectLink } from "../domains/project/types.ts";

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
    fm.last_updated = new Date().toISOString();

    let body = `# ${config.name}`;
    if (config.description) {
      body += `\n\n${config.description}`;
    }

    await atomicWrite(this.filePath, serializeFrontmatter(fm, body.trimEnd()));
  }

  private parse(content: string): ProjectConfig {
    const { frontmatter: fm, body } = parseFrontmatter(content);

    const titleMatch = body.match(/^#\s+(.+)/m);
    const name = titleMatch?.[1]?.trim() ?? "Untitled Project";

    const lines = body.split("\n");
    const titleIdx = lines.findIndex((l) => /^#\s+/.test(l));
    const desc = titleIdx >= 0
      ? lines.slice(titleIdx + 1).join("\n").trim()
      : undefined;

    const links = Array.isArray(fm.links)
      ? (fm.links as Record<string, unknown>[]).filter(
        (l) => typeof l.url === "string" && typeof l.title === "string",
      ) as ProjectLink[]
      : undefined;

    return {
      name,
      description: desc || undefined,
      startDate: fm.start_date != null ? String(fm.start_date) : undefined,
      workingDaysPerWeek: typeof fm.working_days_per_week === "number"
        ? fm.working_days_per_week
        : undefined,
      workingDays: Array.isArray(fm.working_days)
        ? (fm.working_days as unknown[]).map(String)
        : undefined,
      tags: Array.isArray(fm.tags)
        ? (fm.tags as unknown[]).map(String)
        : undefined,
      links,
      features: Array.isArray(fm.features)
        ? (fm.features as unknown[]).map(String)
        : undefined,
      lastUpdated: fm.last_updated != null
        ? String(fm.last_updated)
        : undefined,
    };
  }
}
