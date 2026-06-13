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

// How a config value maps onto frontmatter:
//  truthy        — set when truthy (strings/arrays that are absent when empty)
//  defined       — set when !== undefined (numerics/booleans that may be 0/false)
//  nonEmptyArray — set when a non-empty array
//  emptyToUndef  — set when !== undefined, coercing "" → undefined (drops the key)
type WriteMode = "truthy" | "defined" | "nonEmptyArray" | "emptyToUndef";
type WriteField = readonly [keyof ProjectConfig, string, WriteMode];

// Frontmatter fields written before the async secret block (preserves the
// historical key order — serializeFrontmatter emits in insertion order).
const PROJECT_FM_PRE: readonly WriteField[] = [
  ["startDate", "start_date", "truthy"],
  ["workingDaysPerWeek", "working_days_per_week", "defined"],
  ["workingDays", "working_days", "truthy"],
  ["tags", "tags", "truthy"],
  ["links", "links", "truthy"],
  ["features", "features", "nonEmptyArray"],
  ["navCategories", "nav_categories", "truthy"],
  ["port", "port", "defined"],
  ["locale", "locale", "truthy"],
  ["currency", "currency", "truthy"],
  ["sectionOrder", "section_order", "nonEmptyArray"],
  ["pipelinesPerPage", "pipelines_per_page", "defined"],
  ["tasksPerSection", "tasks_per_section", "defined"],
  ["staleDays", "stale_days", "defined"],
  ["hideCompletedAfterDays", "hide_completed_after_days", "defined"],
  ["stableVersion", "stable_version", "defined"],
  ["kpiMetrics", "kpi_metrics", "nonEmptyArray"],
  ["milestoneStatuses", "milestone_statuses", "nonEmptyArray"],
];

// Frontmatter fields written after the async secret block.
const PROJECT_FM_POST: readonly WriteField[] = [
  ["billingCompany", "billing_company", "emptyToUndef"],
  ["billingAddress", "billing_address", "emptyToUndef"],
  ["billingLogoUrl", "billing_logo_url", "emptyToUndef"],
  ["billingDefaultFooter", "billing_default_footer", "emptyToUndef"],
  ["defaultUserId", "default_user_id", "emptyToUndef"],
  ["cerveauDir", "cerveau_dir", "emptyToUndef"],
];

/** Apply a declarative field table onto the frontmatter record. */
function applyProjectFields(
  fm: Record<string, unknown>,
  config: ProjectConfig,
  fields: readonly WriteField[],
): void {
  for (const [key, fmKey, mode] of fields) {
    const v = config[key];
    switch (mode) {
      case "truthy":
        if (v) fm[fmKey] = v;
        break;
      case "defined":
        if (v !== undefined) fm[fmKey] = v;
        break;
      case "nonEmptyArray":
        if (Array.isArray(v) && v.length > 0) fm[fmKey] = v;
        break;
      case "emptyToUndef":
        if (v !== undefined) fm[fmKey] = v || undefined;
        break;
    }
  }
}

/** Reads/writes the single project configuration document (read/write); no entity collection. */
export class ProjectRepository {
  private filePath: string;
  private configCache: ProjectConfig | null = null;

  constructor(projectDir: string) {
    this.filePath = join(projectDir, "project.md");
  }

  async read(): Promise<ProjectConfig> {
    if (this.configCache) return this.configCache;
    try {
      const content = await Deno.readTextFile(this.filePath);
      this.configCache = await this.parse(content);
      return this.configCache;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return { name: "New Project" };
      }
      throw err;
    }
  }

  async write(config: ProjectConfig): Promise<void> {
    this.configCache = null;
    const fm: Record<string, unknown> = {};
    applyProjectFields(fm, config, PROJECT_FM_PRE);
    if (config.githubToken) {
      fm.github_token = await encryptSecret(config.githubToken);
    }
    if (config.cloudflareToken) {
      fm.cloudflare_token = await encryptSecret(config.cloudflareToken);
    }
    if (config.apiKeys && config.apiKeys.length > 0) {
      fm.api_keys = await Promise.all(
        config.apiKeys.map(async (k) => ({
          name: k.name,
          key: await encryptSecret(k.key),
        })),
      );
    }
    applyProjectFields(fm, config, PROJECT_FM_POST);
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
