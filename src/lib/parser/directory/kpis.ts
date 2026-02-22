/**
 * Directory-based parser for KPI Snapshots.
 * Each snapshot is stored as a separate markdown file in kpis/.
 * Pattern: DirectoryParser subclass
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { KPISnapshot } from "../../types.ts";

interface KPIFrontmatter {
  id: string;
  period: string;
  mrr: number;
  arr: number;
  churn_rate: number;
  ltv: number;
  cac: number;
  growth_rate: number;
  active_users: number;
  nrr: number;
  gross_margin: number;
  notes: string;
}

export class KpiDirectoryParser extends DirectoryParser<KPISnapshot> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "kpis" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): KPISnapshot | null {
    const { frontmatter } = parseFrontmatter<KPIFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    const mrr = Number(frontmatter.mrr) || 0;

    return {
      id: frontmatter.id,
      period: frontmatter.period || "",
      mrr,
      arr: Number(frontmatter.arr) || mrr * 12,
      churn_rate: Number(frontmatter.churn_rate) || 0,
      ltv: Number(frontmatter.ltv) || 0,
      cac: Number(frontmatter.cac) || 0,
      growth_rate: Number(frontmatter.growth_rate) || 0,
      active_users: Number(frontmatter.active_users) || 0,
      nrr: Number(frontmatter.nrr) || 0,
      gross_margin: Number(frontmatter.gross_margin) || 0,
      notes: frontmatter.notes || "",
    };
  }

  protected serializeItem(snapshot: KPISnapshot): string {
    const frontmatter: KPIFrontmatter = {
      id: snapshot.id,
      period: snapshot.period,
      mrr: snapshot.mrr,
      arr: snapshot.mrr * 12,
      churn_rate: snapshot.churn_rate,
      ltv: snapshot.ltv,
      cac: snapshot.cac,
      growth_rate: snapshot.growth_rate,
      active_users: snapshot.active_users,
      nrr: snapshot.nrr,
      gross_margin: snapshot.gross_margin,
      notes: snapshot.notes,
    };

    const body = `# KPI — ${snapshot.period}`;

    return buildFileContent(frontmatter, body);
  }

  async add(snapshot: Omit<KPISnapshot, "id">): Promise<KPISnapshot> {
    const newSnapshot: KPISnapshot = {
      ...snapshot,
      arr: snapshot.mrr * 12,
      id: this.generateId("kpi"),
    };
    await this.write(newSnapshot);
    return newSnapshot;
  }

  async update(
    id: string,
    updates: Partial<KPISnapshot>,
  ): Promise<KPISnapshot | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const mrr = updates.mrr ?? existing.mrr;

    const updated: KPISnapshot = {
      ...existing,
      ...updates,
      arr: mrr * 12,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }
}
