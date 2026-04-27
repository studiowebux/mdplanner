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

export class MarketingPlanRepository extends CachedMarkdownRepository<
  MarketingPlan,
  CreateMarketingPlan,
  UpdateMarketingPlan
> {
  protected readonly tableName = MARKETING_PLAN_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "marketing-plans",
      idPrefix: "mktplan",
      nameField: "name",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): MarketingPlan {
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
      createdAt: now,
      updatedAt: now,
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
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    return {
      id,
      name: fm.name ? String(fm.name) : "",
      description: fm.description != null ? String(fm.description) : undefined,
      status: (fm.status as MarketingPlan["status"]) ?? "draft",
      budgetTotal: fm.budgetTotal != null ? Number(fm.budgetTotal) : undefined,
      budgetCurrency: fm.budgetCurrency != null
        ? String(fm.budgetCurrency)
        : undefined,
      startDate: fm.start_date != null ? String(fm.start_date) : undefined,
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
    fm.name = item.name;
    if (item.description) fm.description = item.description;
    fm.status = item.status;
    if (item.budgetTotal != null) fm.budget_total = item.budgetTotal;
    if (item.budgetCurrency) fm.budget_currency = item.budgetCurrency;
    if (item.startDate) fm.start_date = item.startDate;
    if (item.endDate) fm.end_date = item.endDate;
    if (item.targetAudiences?.length) {
      fm.target_audiences = item.targetAudiences;
    }
    if (item.channels?.length) fm.channels = item.channels;
    if (item.campaigns?.length) {
      fm.campaigns = item.campaigns.map(serializeCampaign);
    }
    if (item.linkedGoals?.length) fm.linked_goals = item.linkedGoals;
    if (item.project) fm.project = item.project;
    if (item.responsible) fm.responsible = item.responsible;
    if (item.team?.length) fm.team = item.team;
    if (item.hypothesis?.length) fm.hypothesis = item.hypothesis;
    if (item.learnings?.length) fm.learnings = item.learnings;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;

    return serializeFrontmatter(fm, item.notes ?? "");
  }
}
