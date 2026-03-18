// Project repository — reads and writes project.md frontmatter from disk.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { atomicWrite } from "../utils/safe-io.ts";
import type { ProjectConfig, ProjectLink } from "../domains/project/types.ts";
import { WEEKDAYS } from "../constants/mod.ts";

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
    fm.last_updated = new Date().toISOString();

    let body = `# ${config.name}`;
    if (config.description) {
      body += `\n\n${config.description}`;
    }

    await atomicWrite(this.filePath, serializeFrontmatter(fm, body.trimEnd()));
  }

  private parseNavCategories(
    raw: unknown,
  ): Record<string, string[]> | undefined {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const result: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        result[key] = val.map(String);
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
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
        ? (fm.working_days as unknown[]).map(String).filter(
          (d): d is typeof WEEKDAYS[number] =>
            (WEEKDAYS as readonly string[]).includes(d),
        )
        : undefined,
      tags: Array.isArray(fm.tags)
        ? (fm.tags as unknown[]).map(String)
        : undefined,
      links,
      features: Array.isArray(fm.features)
        ? (fm.features as unknown[]).map(String)
        : undefined,
      navCategories: this.parseNavCategories(fm.nav_categories),
      lastUpdated: fm.last_updated != null
        ? String(fm.last_updated)
        : undefined,
    };
  }
}
