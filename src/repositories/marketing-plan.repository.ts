// Marketing Plan repository — markdown file CRUD under marketing-plans/.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateMarketingPlan,
  MarketingCampaign,
  MarketingChannel,
  MarketingPlan,
  MarketingTargetAudience,
  UpdateMarketingPlan,
} from "../types/marketing-plan.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  MARKETING_PLAN_TABLE,
  rowToMarketingPlan,
} from "../domains/marketing-plan/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
// ---------------------------------------------------------------------------
// snake_case ↔ camelCase helpers for nested array fields in frontmatter
// ---------------------------------------------------------------------------

function parseCampaign(raw: Record<string, unknown>): MarketingCampaign {
  return {
    name: String(raw.name ?? ""),
    channel: raw.channel != null ? String(raw.channel) : undefined,
    budget: raw.budget != null ? Number(raw.budget) : undefined,
    startDate: raw.start_date != null || raw.startDate != null
      ? String(raw.start_date ?? raw.startDate)
      : undefined,
    endDate: raw.end_date != null || raw.endDate != null
      ? String(raw.end_date ?? raw.endDate)
      : undefined,
    status: raw.status != null
      ? String(raw.status) as MarketingCampaign["status"]
      : undefined,
    goals: raw.goals != null ? String(raw.goals) : undefined,
  };
}

function serializeCampaign(
  c: MarketingCampaign,
): Record<string, unknown> {
  const obj: Record<string, unknown> = { name: c.name };
  if (c.channel) obj.channel = c.channel;
  if (c.budget != null) obj.budget = c.budget;
  if (c.startDate) obj.start_date = c.startDate;
  if (c.endDate) obj.end_date = c.endDate;
  if (c.status) obj.status = c.status;
  if (c.goals) obj.goals = c.goals;
  return obj;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/** Persists MarketingPlan entities as markdown (sectioned body) with a SQLite cache mirror. */
export class MarketingPlanRepository extends CachedMarkdownRepository<
  MarketingPlan,
  CreateMarketingPlan,
  UpdateMarketingPlan
> {
  protected readonly tableName = MARKETING_PLAN_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "marketing-plans",
      idPrefix: "mktplan",
      nameField: "name",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): MarketingPlan {
    return rowToMarketingPlan(row);
  }

  protected fromCreateInput(
    data: CreateMarketingPlan,
    id: string,
    now: string,
  ): MarketingPlan {
    return {
      ...data,
      id,
      status: data.status ?? "draft",
      ...stampAuditFields(now),
    };
  }

  // ---------------------------------------------------------------------------
  // Parse
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): MarketingPlan | null {
    if (!fm.id && !fm.name) return null;
    const id = resolveEntityId(filename, fm);

    return {
      id,
      name: fm.name ? String(fm.name) : "",
      description: fm.description != null ? String(fm.description) : undefined,
      status: (fm.status as MarketingPlan["status"]) ?? "draft",
      budgetTotal: fm.budgetTotal != null ? Number(fm.budgetTotal) : undefined,
      budgetCurrency: fm.budgetCurrency != null
        ? String(fm.budgetCurrency)
        : undefined,
      startDate: fm.startDate != null ? String(fm.startDate) : undefined,
      endDate: fm.endDate != null ? String(fm.endDate) : undefined,
      targetAudiences: this.parseArray<MarketingTargetAudience>(
        fm.targetAudiences,
        (raw) => ({
          name: String(raw.name ?? ""),
          description: raw.description != null
            ? String(raw.description)
            : undefined,
          size: raw.size != null ? String(raw.size) : undefined,
        }),
      ),
      channels: this.parseArray<MarketingChannel>(
        fm.channels,
        (raw) => ({
          name: String(raw.name ?? ""),
          budget: raw.budget != null ? Number(raw.budget) : undefined,
          goals: raw.goals != null ? String(raw.goals) : undefined,
          status: raw.status != null
            ? String(raw.status) as MarketingChannel["status"]
            : undefined,
        }),
      ),
      campaigns: this.parseArray<MarketingCampaign>(
        fm.campaigns,
        parseCampaign,
      ),
      linkedGoals: Array.isArray(fm.linkedGoals)
        ? (fm.linkedGoals as unknown[]).map(String)
        : undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      responsible: fm.responsible != null ? String(fm.responsible) : undefined,
      team: Array.isArray(fm.team)
        ? (fm.team as unknown[]).map(String)
        : undefined,
      hypothesis: this.parseArray(
        fm.hypothesis,
        (raw) => ({
          text: String(raw.text ?? raw),
          verdict: raw.verdict != null ? String(raw.verdict) : undefined,
        }),
      ),
      learnings: this.parseArray(
        fm.learnings,
        (raw) => ({ text: String(raw.text ?? raw) }),
      ),
      notes: body.trim() || undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  private parseArray<T>(
    raw: unknown,
    transform: (item: Record<string, unknown>) => T,
  ): T[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) return undefined;
    return raw.map((item) => transform(item as Record<string, unknown>));
  }

  // ---------------------------------------------------------------------------
  // Serialize — custom frontmatter (snake_case nested arrays)
  // ---------------------------------------------------------------------------

  protected serialize(item: MarketingPlan): string {
    const fm: Record<string, unknown> = {};
    // truthy = emit when truthy; defined = emit when != null; array = non-empty.
    const set = (
      key: string,
      v: unknown,
      mode: "truthy" | "defined" | "array",
    ) => {
      if (mode === "truthy") {
        if (v) fm[key] = v;
      } else if (mode === "defined") {
        if (v != null) fm[key] = v;
      } else if (Array.isArray(v) && v.length) {
        fm[key] = v;
      }
    };

    fm.name = item.name;
    set("description", item.description, "truthy");
    fm.status = item.status;
    set("budget_total", item.budgetTotal, "defined");
    set("budget_currency", item.budgetCurrency, "truthy");
    set("start_date", item.startDate, "truthy");
    set("end_date", item.endDate, "truthy");
    set("target_audiences", item.targetAudiences, "array");
    set("channels", item.channels, "array");
    if (item.campaigns?.length) {
      fm.campaigns = item.campaigns.map(serializeCampaign);
    }
    set("linked_goals", item.linkedGoals, "array");
    set("project", item.project, "truthy");
    set("responsible", item.responsible, "truthy");
    set("team", item.team, "array");
    set("hypothesis", item.hypothesis, "array");
    set("learnings", item.learnings, "array");
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    set("created_by", item.createdBy, "truthy");
    set("updated_by", item.updatedBy, "truthy");
    // Preserve archive fields — custom serializers must round-trip these.
    set("archived", item.archived, "truthy");
    set("archived_at", item.archivedAt, "truthy");
    set("archived_by", item.archivedBy, "truthy");

    return serializeFrontmatter(fm, item.notes ?? "");
  }
}
