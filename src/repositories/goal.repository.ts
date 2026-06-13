// Goal repository — markdown file CRUD under goals/.

import type { CreateGoal, Goal, UpdateGoal } from "../types/goal.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { GOAL_TABLE, rowToGoal } from "../domains/goal/cache.ts";
import { GOAL_BODY_KEYS } from "../domains/goal/constants.ts";

import {
  fmNum,
  fmStr,
  fmStrArr,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Goal entities as markdown with a SQLite cache mirror. */
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
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Goal | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

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
      kpi: fmStr(fm, "kpi") ?? "",
      kpiMetric: fmStr(fm, "kpiMetric"),
      kpiTarget: fmNum(fm, "kpiTarget"),
      kpiValue: fmNum(fm, "kpiValue"),
      startDate: fmStr(fm, "startDate") ?? "",
      endDate: fmStr(fm, "endDate") ?? "",
      status: (fm.status as Goal["status"]) ?? "planning",
      githubRepo: fmStr(fm, "githubRepo"),
      githubMilestone: fmNum(fm, "githubMilestone"),
      linkedPortfolioItems: fmStrArr(fm, "linkedPortfolioItems"),
      project: fmStr(fm, "project"),
      owner: fmStr(fm, "owner"),
      contributors: fmStrArr(fm, "contributors"),
      priority: fmNum(fm, "priority"),
      progress: fmNum(fm, "progress"),
      parentGoal: fmStr(fm, "parentGoal"),
      linkedMilestones: fmStrArr(fm, "linkedMilestones"),
      tags: fmStrArr(fm, "tags"),
      notes: fmStr(fm, "notes"),
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
    };
  }

  protected serialize(item: Goal): string {
    return this.serializeStandard(item, GOAL_BODY_KEYS, item.description ?? "");
  }
}
