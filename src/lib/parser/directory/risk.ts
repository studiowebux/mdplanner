/**
 * Directory-based parser for Risk Analysis.
 * Each risk analysis is stored as a separate markdown file.
 * Uses a 2x2 matrix (Impact vs Probability).
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { RiskAnalysis } from "../../types.ts";

interface RiskFrontmatter {
  id: string;
  date: string;
}

export class RiskDirectoryParser extends DirectoryParser<RiskAnalysis> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "risk" });
  }

  protected parseFile(content: string, _filePath: string): RiskAnalysis | null {
    const { frontmatter, content: body } = parseFrontmatter<RiskFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    let title = "Untitled Risk Analysis";
    const highImpactHighProb: string[] = [];
    const highImpactLowProb: string[] = [];
    const lowImpactHighProb: string[] = [];
    const lowImpactLowProb: string[] = [];

    let currentSection: "none" | "hihp" | "hilp" | "lihp" | "lilp" = "none";

    for (const line of lines) {
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }

      const lowerLine = line.toLowerCase();
      // High Impact, High Probability
      if (lowerLine.includes("high impact") && lowerLine.includes("high prob")) {
        currentSection = "hihp";
        continue;
      }
      // High Impact, Low Probability
      if (lowerLine.includes("high impact") && lowerLine.includes("low prob")) {
        currentSection = "hilp";
        continue;
      }
      // Low Impact, High Probability
      if (lowerLine.includes("low impact") && lowerLine.includes("high prob")) {
        currentSection = "lihp";
        continue;
      }
      // Low Impact, Low Probability
      if (lowerLine.includes("low impact") && lowerLine.includes("low prob")) {
        currentSection = "lilp";
        continue;
      }

      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        const item = listMatch[1].trim();
        switch (currentSection) {
          case "hihp":
            highImpactHighProb.push(item);
            break;
          case "hilp":
            highImpactLowProb.push(item);
            break;
          case "lihp":
            lowImpactHighProb.push(item);
            break;
          case "lilp":
            lowImpactLowProb.push(item);
            break;
        }
      }
    }

    return {
      id: frontmatter.id,
      title,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      highImpactHighProb,
      highImpactLowProb,
      lowImpactHighProb,
      lowImpactLowProb,
    };
  }

  protected serializeItem(risk: RiskAnalysis): string {
    const frontmatter: RiskFrontmatter = {
      id: risk.id,
      date: risk.date,
    };

    const sections: string[] = [`# ${risk.title}`];

    sections.push("");
    sections.push("## High Impact, High Probability");
    sections.push("");
    for (const item of risk.highImpactHighProb) {
      sections.push(`- ${item}`);
    }

    sections.push("");
    sections.push("## High Impact, Low Probability");
    sections.push("");
    for (const item of risk.highImpactLowProb) {
      sections.push(`- ${item}`);
    }

    sections.push("");
    sections.push("## Low Impact, High Probability");
    sections.push("");
    for (const item of risk.lowImpactHighProb) {
      sections.push(`- ${item}`);
    }

    sections.push("");
    sections.push("## Low Impact, Low Probability");
    sections.push("");
    for (const item of risk.lowImpactLowProb) {
      sections.push(`- ${item}`);
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async add(risk: Omit<RiskAnalysis, "id">): Promise<RiskAnalysis> {
    const newRisk: RiskAnalysis = {
      ...risk,
      id: this.generateId("risk"),
    };
    await this.write(newRisk);
    return newRisk;
  }

  async update(id: string, updates: Partial<RiskAnalysis>): Promise<RiskAnalysis | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: RiskAnalysis = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  async addItem(
    id: string,
    quadrant: "highImpactHighProb" | "highImpactLowProb" | "lowImpactHighProb" | "lowImpactLowProb",
    item: string
  ): Promise<RiskAnalysis | null> {
    const risk = await this.read(id);
    if (!risk) return null;

    risk[quadrant].push(item);
    await this.write(risk);
    return risk;
  }

  async removeItem(
    id: string,
    quadrant: "highImpactHighProb" | "highImpactLowProb" | "lowImpactHighProb" | "lowImpactLowProb",
    itemIndex: number
  ): Promise<RiskAnalysis | null> {
    const risk = await this.read(id);
    if (!risk) return null;

    if (itemIndex >= 0 && itemIndex < risk[quadrant].length) {
      risk[quadrant].splice(itemIndex, 1);
      await this.write(risk);
    }
    return risk;
  }
}
