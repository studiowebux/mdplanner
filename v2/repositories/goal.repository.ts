// Goal repository — markdown file CRUD under goals/.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import {
  buildFrontmatter,
  mergeFields,
  readMarkdownDir,
} from "../utils/repo-helpers.ts";
import { mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import type { CreateGoal, Goal, UpdateGoal } from "../types/goal.types.ts";

const BODY_KEYS = ["id", "description"] as const;

export class GoalRepository {
  private dir: string;
  private writer = new SafeWriter();

  constructor(projectDir: string) {
    this.dir = join(projectDir, "goals");
  }

  async findAll(): Promise<Goal[]> {
    const items = await readMarkdownDir(
      this.dir,
      (filename, fm, body) => this.parse(filename, fm, body),
    );
    return items.sort((a, b) => a.title.localeCompare(b.title));
  }

  async findById(id: string): Promise<Goal | null> {
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      const { frontmatter, body } = parseFrontmatter(content);
      return this.parse(`${id}.md`, frontmatter, body);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return null;
      throw err;
    }
  }

  async findByName(name: string): Promise<Goal | null> {
    const all = await this.findAll();
    const lower = name.toLowerCase();
    return all.find((g) => g.title.toLowerCase() === lower) ?? null;
  }

  async create(data: CreateGoal): Promise<Goal> {
    await Deno.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const id = generateId("goal");

    const item: Goal = {
      ...data,
      id,
      description: data.description ?? "",
      type: data.type ?? "project",
      kpi: data.kpi ?? "",
      startDate: data.startDate ?? "",
      endDate: data.endDate ?? "",
      status: data.status ?? "planning",
      createdAt: now,
      updatedAt: now,
    };

    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  async update(id: string, data: UpdateGoal): Promise<Goal | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = mergeFields(
      { ...existing },
      data as Record<string, unknown>,
    );
    updated.updatedAt = new Date().toISOString();

    await this.writer.write(
      id,
      () => atomicWrite(join(this.dir, `${id}.md`), this.serialize(updated)),
    );
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await Deno.remove(join(this.dir, `${id}.md`));
      return true;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return false;
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Parse / Serialize
  // -------------------------------------------------------------------------

  private parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Goal | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    // v1: title is the first # heading in the body, not in frontmatter
    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1]
      : "";
    // Description is body without the title heading line
    const description = headingMatch
      ? bodyText.replace(/^#\s+.+\n?/, "").trim()
      : bodyText;

    return {
      id,
      title,
      description,
      type: (fm.type as Goal["type"]) ?? "project",
      kpi: fm.kpi != null ? String(fm.kpi) : "",
      kpiMetric: fm.kpi_metric != null ? String(fm.kpi_metric) : undefined,
      kpiTarget: fm.kpi_target != null ? Number(fm.kpi_target) : undefined,
      kpiValue: fm.kpi_value != null ? Number(fm.kpi_value) : undefined,
      startDate: String(fm.start_date ?? ""),
      endDate: String(fm.end_date ?? ""),
      status: (fm.status as Goal["status"]) ?? "planning",
      githubRepo: fm.github_repo != null ? String(fm.github_repo) : undefined,
      githubMilestone: fm.github_milestone != null
        ? Number(fm.github_milestone)
        : undefined,
      linkedPortfolioItems: Array.isArray(fm.linked_portfolio_items)
        ? (fm.linked_portfolio_items as unknown[]).map(String)
        : undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      owner: fm.owner != null ? String(fm.owner) : undefined,
      contributors: Array.isArray(fm.contributors)
        ? (fm.contributors as unknown[]).map(String)
        : undefined,
      priority: fm.priority != null ? Number(fm.priority) : undefined,
      progress: fm.progress != null ? Number(fm.progress) : undefined,
      parentGoal: fm.parent_goal != null ? String(fm.parent_goal) : undefined,
      linkedMilestones: Array.isArray(fm.linked_milestones)
        ? (fm.linked_milestones as unknown[]).map(String)
        : undefined,
      tags: Array.isArray(fm.tags)
        ? (fm.tags as unknown[]).map(String)
        : undefined,
      notes: fm.notes != null ? String(fm.notes) : undefined,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      createdBy: fm.created_by ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by ? String(fm.updated_by) : undefined,
    };
  }

  private serialize(item: Goal): string {
    const fm = mapKeysToFm(
      buildFrontmatter(item as unknown as Record<string, unknown>, BODY_KEYS),
    );
    return serializeFrontmatter(fm, item.description ?? "");
  }
}
