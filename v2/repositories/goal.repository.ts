// Goal repository — markdown file CRUD under goals/.

import type { CreateGoal, Goal, UpdateGoal } from "../types/goal.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { GOAL_TABLE, rowToGoal } from "../domains/goal/cache.ts";

const BODY_KEYS = ["id", "description"] as const;

export class GoalRepository extends CachedMarkdownRepository<
  Goal,
  CreateGoal,
  UpdateGoal
> {
  protected readonly tableName = GOAL_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "goals",
      idPrefix: "goal",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Goal {
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

  protected serialize(item: Goal): string {
    return this.serializeStandard(item, BODY_KEYS, item.description ?? "");
  }
}
