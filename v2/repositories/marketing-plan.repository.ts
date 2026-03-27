// Marketing Plan repository — markdown file CRUD under marketing-plans/.

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
import type {
  CreateMarketingPlan,
  MarketingCampaign,
  MarketingChannel,
  MarketingKPITarget,
  MarketingPlan,
  MarketingTargetAudience,
  UpdateMarketingPlan,
} from "../types/marketing-plan.types.ts";

// "notes" stored in markdown body, "id" excluded from frontmatter.
const BODY_KEYS = ["id", "notes"] as const;

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

export class MarketingPlanRepository {
  private dir: string;
  private writer = new SafeWriter();

  constructor(projectDir: string) {
    this.dir = join(projectDir, "marketing-plans");
  }

  async findAll(): Promise<MarketingPlan[]> {
    const items = await readMarkdownDir(
      this.dir,
      (filename, fm, body) => this.parse(filename, fm, body),
    );
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: string): Promise<MarketingPlan | null> {
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      const { frontmatter, body } = parseFrontmatter(content);
      return this.parse(`${id}.md`, frontmatter, body);
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    // Fallback: v1 files may use different filename than id.
    const all = await this.findAll();
    return all.find((p) => p.id === id) ?? null;
  }

  async findByName(name: string): Promise<MarketingPlan | null> {
    const all = await this.findAll();
    const lower = name.toLowerCase();
    return all.find((p) => p.name.toLowerCase() === lower) ?? null;
  }

  async create(data: CreateMarketingPlan): Promise<MarketingPlan> {
    await Deno.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const id = generateId("mktplan");

    const item: MarketingPlan = {
      ...data,
      id,
      status: data.status ?? "draft",
      created: now,
      updated: now,
    };

    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  async update(
    id: string,
    data: UpdateMarketingPlan,
  ): Promise<MarketingPlan | null> {
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
  ): MarketingPlan | null {
    if (!fm.id && !fm.name) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    return {
      id,
      name: fm.name ? String(fm.name) : "",
      description: fm.description != null ? String(fm.description) : undefined,
      status: (fm.status as MarketingPlan["status"]) ?? "draft",
      budgetTotal: fm.budget_total != null || fm.budgetTotal != null
        ? Number(fm.budget_total ?? fm.budgetTotal)
        : undefined,
      budgetCurrency: fm.budget_currency != null || fm.budgetCurrency != null
        ? String(fm.budget_currency ?? fm.budgetCurrency)
        : undefined,
      startDate: fm.start_date != null || fm.startDate != null
        ? String(fm.start_date ?? fm.startDate)
        : undefined,
      endDate: fm.end_date != null || fm.endDate != null
        ? String(fm.end_date ?? fm.endDate)
        : undefined,
      targetAudiences: this.parseArray<MarketingTargetAudience>(
        fm.target_audiences ?? fm.targetAudiences,
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
      kpiTargets: this.parseArray<MarketingKPITarget>(
        fm.kpi_targets ?? fm.kpiTargets,
        (raw) => ({
          metric: String(raw.metric ?? ""),
          target: Number(raw.target ?? 0),
          current: raw.current != null ? Number(raw.current) : undefined,
        }),
      ),
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
      created: fm.created ? String(fm.created) : new Date().toISOString(),
      updated: fm.updated ? String(fm.updated) : new Date().toISOString(),
    };
  }

  private parseArray<T>(
    raw: unknown,
    transform: (item: Record<string, unknown>) => T,
  ): T[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) return undefined;
    return raw.map((item) => transform(item as Record<string, unknown>));
  }

  private serialize(item: MarketingPlan): string {
    // Build frontmatter with snake_case keys for v1 compatibility.
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
    if (item.kpiTargets?.length) fm.kpi_targets = item.kpiTargets;
    if (item.project) fm.project = item.project;
    if (item.responsible) fm.responsible = item.responsible;
    if (item.team?.length) fm.team = item.team;
    if (item.hypothesis?.length) fm.hypothesis = item.hypothesis;
    if (item.learnings?.length) fm.learnings = item.learnings;
    fm.created = item.created;
    fm.updated = item.updated;

    return serializeFrontmatter(fm, item.notes ?? "");
  }
}
