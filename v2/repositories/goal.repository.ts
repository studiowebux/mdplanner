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
      title: data.title,
      description: data.description ?? "",
      type: data.type ?? "project",
      kpi: data.kpi ?? "",
      startDate: data.startDate ?? "",
      endDate: data.endDate ?? "",
      status: data.status ?? "planning",
      id,
      created: now,
      updated: now,
      ...(data.kpiMetric && { kpiMetric: data.kpiMetric }),
      ...(data.kpiTarget !== undefined && { kpiTarget: data.kpiTarget }),
      ...(data.kpiValue !== undefined && { kpiValue: data.kpiValue }),
      ...(data.githubRepo && { githubRepo: data.githubRepo }),
      ...(data.githubMilestone !== undefined && {
        githubMilestone: data.githubMilestone,
      }),
      ...(data.linkedPortfolioItems?.length && {
        linkedPortfolioItems: data.linkedPortfolioItems,
      }),
      ...(data.project && { project: data.project }),
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
    updated.updated = new Date().toISOString();

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
      kpiMetric: fm.kpi_metric != null || fm.kpiMetric != null
        ? String(fm.kpi_metric ?? fm.kpiMetric)
        : undefined,
      kpiTarget: fm.kpi_target != null || fm.kpiTarget != null
        ? Number(fm.kpi_target ?? fm.kpiTarget)
        : undefined,
      kpiValue: fm.kpi_value != null || fm.kpiValue != null
        ? Number(fm.kpi_value ?? fm.kpiValue)
        : undefined,
      // v1 uses start/end, v2 uses startDate/endDate
      startDate: String(fm.startDate ?? fm.start ?? ""),
      endDate: String(fm.endDate ?? fm.end ?? ""),
      status: (fm.status as Goal["status"]) ?? "planning",
      githubRepo: fm.githubRepo != null || fm.github_repo != null
        ? String(fm.githubRepo ?? fm.github_repo)
        : undefined,
      githubMilestone: fm.githubMilestone != null ||
          fm.github_milestone != null
        ? Number(fm.githubMilestone ?? fm.github_milestone)
        : undefined,
      linkedPortfolioItems: Array.isArray(
          fm.linkedPortfolioItems ?? fm.linked_portfolio_items,
        )
        ? (
          (fm.linkedPortfolioItems ?? fm.linked_portfolio_items) as unknown[]
        ).map(String)
        : undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      created: fm.created ? String(fm.created) : new Date().toISOString(),
      updated: fm.updated ? String(fm.updated) : new Date().toISOString(),
    };
  }

  private serialize(item: Goal): string {
    const fm = buildFrontmatter(
      item as unknown as Record<string, unknown>,
      BODY_KEYS,
    );
    return serializeFrontmatter(fm, item.description ?? "");
  }
}
