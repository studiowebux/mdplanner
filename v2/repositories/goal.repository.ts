// Goal repository — markdown file CRUD under goals/.

import type { CreateGoal, Goal, UpdateGoal } from "../types/goal.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { GOAL_TABLE, rowToGoal } from "../domains/goal/cache.ts";
import { GOAL_BODY_KEYS } from "../domains/goal/constants.ts";

export class GoalRepository extends CachedMarkdownRepository<
  Goal,
  CreateGoal,
  UpdateGoal
> {
  protected readonly tableName = GOAL_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "goals",
      idPrefix: "goal",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Goal {
    return rowToGoal(row);
  }

  protected fromCreateInput(data: CreateGoal, id: string, now: string): Goal {
    return {
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
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Goal | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1]
      : "";
    const description = headingMatch
      ? bodyText.replace(/^#\s+.+\n?/, "").trim()
      : bodyText;

    return {
      id,
      title,
      description,
      type: (fm.type as Goal["type"]) ?? "project",
      kpi: fm.kpi != null ? String(fm.kpi) : "",
      kpiMetric: fm.kpiMetric != null ? String(fm.kpiMetric) : undefined,
      kpiTarget: fm.kpiTarget != null ? Number(fm.kpiTarget) : undefined,
      kpiValue: fm.kpiValue != null ? Number(fm.kpiValue) : undefined,
      startDate: String(fm.start_date ?? ""),
      endDate: String(fm.end_date ?? ""),
      status: (fm.status as Goal["status"]) ?? "planning",
      githubRepo: fm.githubRepo != null ? String(fm.githubRepo) : undefined,
      githubMilestone: fm.githubMilestone != null
        ? Number(fm.githubMilestone)
        : undefined,
      linkedPortfolioItems: Array.isArray(fm.linkedPortfolioItems)
        ? (fm.linkedPortfolioItems as unknown[]).map(String)
        : undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      owner: fm.owner != null ? String(fm.owner) : undefined,
      contributors: Array.isArray(fm.contributors)
        ? (fm.contributors as unknown[]).map(String)
        : undefined,
      priority: fm.priority != null ? Number(fm.priority) : undefined,
      progress: fm.progress != null ? Number(fm.progress) : undefined,
      parentGoal: fm.parentGoal != null ? String(fm.parentGoal) : undefined,
      linkedMilestones: Array.isArray(fm.linkedMilestones)
        ? (fm.linkedMilestones as unknown[]).map(String)
        : undefined,
      tags: Array.isArray(fm.tags)
        ? (fm.tags as unknown[]).map(String)
        : undefined,
      notes: fm.notes != null ? String(fm.notes) : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: Goal): string {
    return this.serializeStandard(item, GOAL_BODY_KEYS, item.description ?? "");
  }
}
