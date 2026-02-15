/**
 * Risk Analysis parser class for parsing and serializing risk analysis markdown.
 * Handles Impact/Probability matrix format with four quadrants.
 */
import { RiskAnalysis } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class RiskParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses Risk Analyses from the Risk Analysis section in markdown.
   */
  parseRiskSection(lines: string[]): RiskAnalysis[] {
    const riskAnalyses: RiskAnalysis[] = [];

    let inRiskSection = false;
    let currentRisk: Partial<RiskAnalysis> | null = null;
    let currentSubsection:
      | "highImpactHighProb"
      | "highImpactLowProb"
      | "lowImpactHighProb"
      | "lowImpactLowProb"
      | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        line.startsWith("# Risk Analysis") ||
        line.includes("<!-- Risk Analysis -->")
      ) {
        inRiskSection = true;
        continue;
      }

      if (
        inRiskSection &&
        line.startsWith("# ") &&
        !line.startsWith("# Risk Analysis")
      ) {
        if (currentRisk?.title) riskAnalyses.push(currentRisk as RiskAnalysis);
        currentRisk = null;
        break;
      }

      if (!inRiskSection) continue;

      if (line.startsWith("## ")) {
        if (currentRisk?.title) riskAnalyses.push(currentRisk as RiskAnalysis);
        const title = line.substring(3).trim();
        currentRisk = {
          id: this.generateRiskId(),
          title,
          date: new Date().toISOString().split("T")[0],
          highImpactHighProb: [],
          highImpactLowProb: [],
          lowImpactHighProb: [],
          lowImpactLowProb: [],
        };
        currentSubsection = null;
      } else if (currentRisk) {
        if (line.startsWith("Date:")) {
          currentRisk.date = line.substring(5).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentRisk.id = match[1];
        } else if (line.startsWith("### High Impact / High Probability")) {
          currentSubsection = "highImpactHighProb";
        } else if (line.startsWith("### High Impact / Low Probability")) {
          currentSubsection = "highImpactLowProb";
        } else if (line.startsWith("### Low Impact / High Probability")) {
          currentSubsection = "lowImpactHighProb";
        } else if (line.startsWith("### Low Impact / Low Probability")) {
          currentSubsection = "lowImpactLowProb";
        } else if (line.trim().startsWith("- ") && currentSubsection) {
          const item = line.trim().substring(2).trim();
          if (item) {
            currentRisk[currentSubsection]!.push(item);
          }
        }
      }
    }

    if (currentRisk?.title) riskAnalyses.push(currentRisk as RiskAnalysis);
    return riskAnalyses;
  }

  /**
   * Generates a unique Risk analysis ID.
   */
  generateRiskId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts a Risk analysis to markdown format.
   */
  riskToMarkdown(risk: RiskAnalysis): string {
    let content = `## ${risk.title}\n`;
    content += `<!-- id: ${risk.id} -->\n`;
    content += `Date: ${risk.date}\n\n`;

    content += `### High Impact / High Probability\n`;
    for (const item of risk.highImpactHighProb) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    content += `### High Impact / Low Probability\n`;
    for (const item of risk.highImpactLowProb) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    content += `### Low Impact / High Probability\n`;
    for (const item of risk.lowImpactHighProb) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    content += `### Low Impact / Low Probability\n`;
    for (const item of risk.lowImpactLowProb) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    return content;
  }

  /**
   * Serializes all Risk analyses to markdown format.
   */
  riskAnalysesToMarkdown(riskAnalyses: RiskAnalysis[]): string {
    let content = "<!-- Risk Analysis -->\n# Risk Analysis\n\n";
    for (const risk of riskAnalyses) {
      content += this.riskToMarkdown(risk);
    }
    return content;
  }

  /**
   * Finds the Risk Analysis section boundaries in the file lines.
   */
  findRiskSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Risk Analysis -->") ||
          lines[i].startsWith("# Risk Analysis"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Risk Analysis")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Updates a Risk analysis in the array.
   */
  updateRiskInList(
    riskAnalyses: RiskAnalysis[],
    riskId: string,
    updates: Partial<Omit<RiskAnalysis, "id">>,
  ): { riskAnalyses: RiskAnalysis[]; success: boolean } {
    const index = riskAnalyses.findIndex((r) => r.id === riskId);

    if (index === -1) {
      return { riskAnalyses, success: false };
    }

    riskAnalyses[index] = {
      ...riskAnalyses[index],
      ...updates,
    };

    return { riskAnalyses, success: true };
  }

  /**
   * Deletes a Risk analysis from the array.
   */
  deleteRiskFromList(
    riskAnalyses: RiskAnalysis[],
    riskId: string,
  ): { riskAnalyses: RiskAnalysis[]; success: boolean } {
    const originalLength = riskAnalyses.length;
    const filtered = riskAnalyses.filter((r) => r.id !== riskId);
    return {
      riskAnalyses: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new Risk analysis with generated ID.
   */
  createRisk(risk: Omit<RiskAnalysis, "id">): RiskAnalysis {
    return {
      ...risk,
      id: this.generateRiskId(),
    };
  }
}
