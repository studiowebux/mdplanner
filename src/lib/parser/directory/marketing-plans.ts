/**
 * Directory-based parser for Marketing Plans.
 * Each plan is stored as a separate markdown file under marketing-plans/.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type {
  MarketingCampaign,
  MarketingChannel,
  MarketingKPITarget,
  MarketingPlan,
  MarketingTargetAudience,
} from "../../types.ts";

interface MarketingPlanFrontmatter {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "completed" | "archived";
  budget_total?: number;
  budget_currency?: string;
  start_date?: string;
  end_date?: string;
  target_audiences?: MarketingTargetAudience[];
  channels?: MarketingChannel[];
  campaigns?: MarketingCampaign[];
  kpi_targets?: MarketingKPITarget[];
  created: string;
  updated: string;
}

export class MarketingPlansDirectoryParser
  extends DirectoryParser<MarketingPlan> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "marketing-plans" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): MarketingPlan | null {
    const { frontmatter, content: body } = parseFrontmatter<
      MarketingPlanFrontmatter
    >(content);

    if (!frontmatter.id) return null;

    return {
      id: frontmatter.id,
      name: frontmatter.name || "",
      description: frontmatter.description,
      status: frontmatter.status ?? "draft",
      budgetTotal: frontmatter.budget_total,
      budgetCurrency: frontmatter.budget_currency,
      startDate: frontmatter.start_date,
      endDate: frontmatter.end_date,
      targetAudiences: frontmatter.target_audiences?.length
        ? frontmatter.target_audiences
        : undefined,
      channels: frontmatter.channels?.length ? frontmatter.channels : undefined,
      campaigns: frontmatter.campaigns?.length
        ? frontmatter.campaigns
        : undefined,
      kpiTargets: frontmatter.kpi_targets?.length
        ? frontmatter.kpi_targets
        : undefined,
      notes: body.trim() || undefined,
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated || new Date().toISOString(),
    };
  }

  protected serializeItem(plan: MarketingPlan): string {
    const frontmatter: MarketingPlanFrontmatter = {
      id: plan.id,
      name: plan.name,
      status: plan.status,
      created: plan.created,
      updated: plan.updated,
    };

    if (plan.description) frontmatter.description = plan.description;
    if (plan.budgetTotal !== undefined) {
      frontmatter.budget_total = plan.budgetTotal;
    }
    if (plan.budgetCurrency) {
      frontmatter.budget_currency = plan.budgetCurrency;
    }
    if (plan.startDate) frontmatter.start_date = plan.startDate;
    if (plan.endDate) frontmatter.end_date = plan.endDate;
    if (plan.targetAudiences?.length) {
      frontmatter.target_audiences = plan.targetAudiences;
    }
    if (plan.channels?.length) frontmatter.channels = plan.channels;
    if (plan.campaigns?.length) frontmatter.campaigns = plan.campaigns;
    if (plan.kpiTargets?.length) frontmatter.kpi_targets = plan.kpiTargets;

    return buildFileContent(frontmatter, plan.notes ?? "");
  }

  async add(
    plan: Omit<MarketingPlan, "id" | "created" | "updated">,
  ): Promise<MarketingPlan> {
    const now = new Date().toISOString();
    const newPlan: MarketingPlan = {
      ...plan,
      id: this.generateId("mktplan"),
      created: now,
      updated: now,
    };
    await this.write(newPlan);
    return newPlan;
  }

  async update(
    id: string,
    updates: Partial<MarketingPlan>,
  ): Promise<MarketingPlan | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: MarketingPlan = {
      ...existing,
      ...updates,
      id: existing.id,
      created: existing.created,
      updated: new Date().toISOString(),
    };
    await this.write(updated);
    return updated;
  }
}
