/**
 * SWOT Analysis parser class for parsing and serializing SWOT analysis markdown.
 * Handles Strengths, Weaknesses, Opportunities, Threats format.
 */
import { SwotAnalysis } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class SwotParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses SWOT analyses from the SWOT Analysis section in markdown.
   */
  parseSwotSection(lines: string[]): SwotAnalysis[] {
    const swotAnalyses: SwotAnalysis[] = [];

    let inSwotSection = false;
    let currentSwot: Partial<SwotAnalysis> | null = null;
    let currentSubsection:
      | "strengths"
      | "weaknesses"
      | "opportunities"
      | "threats"
      | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        line.startsWith("# SWOT Analysis") ||
        line.includes("<!-- SWOT Analysis -->")
      ) {
        inSwotSection = true;
        continue;
      }

      if (
        inSwotSection &&
        line.startsWith("# ") &&
        !line.startsWith("# SWOT Analysis")
      ) {
        if (currentSwot?.title) swotAnalyses.push(currentSwot as SwotAnalysis);
        currentSwot = null;
        break;
      }

      if (!inSwotSection) continue;

      if (line.startsWith("## ")) {
        if (currentSwot?.title) swotAnalyses.push(currentSwot as SwotAnalysis);
        const title = line.substring(3).trim();
        currentSwot = {
          id: this.generateSwotId(),
          title,
          date: new Date().toISOString().split("T")[0],
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: [],
        };
        currentSubsection = null;
      } else if (currentSwot) {
        if (line.startsWith("Date:")) {
          currentSwot.date = line.substring(5).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentSwot.id = match[1];
        } else if (line.startsWith("### Strengths")) {
          currentSubsection = "strengths";
        } else if (line.startsWith("### Weaknesses")) {
          currentSubsection = "weaknesses";
        } else if (line.startsWith("### Opportunities")) {
          currentSubsection = "opportunities";
        } else if (line.startsWith("### Threats")) {
          currentSubsection = "threats";
        } else if (line.trim().startsWith("- ") && currentSubsection) {
          const item = line.trim().substring(2).trim();
          if (item) {
            currentSwot[currentSubsection]!.push(item);
          }
        }
      }
    }

    if (currentSwot?.title) swotAnalyses.push(currentSwot as SwotAnalysis);
    return swotAnalyses;
  }

  /**
   * Generates a unique SWOT analysis ID.
   */
  generateSwotId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts a SWOT analysis to markdown format.
   */
  swotToMarkdown(swot: SwotAnalysis): string {
    let content = `## ${swot.title}\n`;
    content += `<!-- id: ${swot.id} -->\n`;
    content += `Date: ${swot.date}\n\n`;

    content += `### Strengths\n`;
    for (const item of swot.strengths) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    content += `### Weaknesses\n`;
    for (const item of swot.weaknesses) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    content += `### Opportunities\n`;
    for (const item of swot.opportunities) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    content += `### Threats\n`;
    for (const item of swot.threats) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    return content;
  }

  /**
   * Serializes all SWOT analyses to markdown format.
   */
  swotAnalysesToMarkdown(swotAnalyses: SwotAnalysis[]): string {
    let content = "<!-- SWOT Analysis -->\n# SWOT Analysis\n\n";
    for (const swot of swotAnalyses) {
      content += this.swotToMarkdown(swot);
    }
    return content;
  }

  /**
   * Finds the SWOT Analysis section boundaries in the file lines.
   */
  findSwotSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- SWOT Analysis -->") ||
          lines[i].startsWith("# SWOT Analysis"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# SWOT Analysis")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Updates a SWOT analysis in the array.
   */
  updateSwotInList(
    swotAnalyses: SwotAnalysis[],
    swotId: string,
    updates: Partial<Omit<SwotAnalysis, "id">>,
  ): { swotAnalyses: SwotAnalysis[]; success: boolean } {
    const index = swotAnalyses.findIndex((s) => s.id === swotId);

    if (index === -1) {
      return { swotAnalyses, success: false };
    }

    swotAnalyses[index] = {
      ...swotAnalyses[index],
      ...updates,
    };

    return { swotAnalyses, success: true };
  }

  /**
   * Deletes a SWOT analysis from the array.
   */
  deleteSwotFromList(
    swotAnalyses: SwotAnalysis[],
    swotId: string,
  ): { swotAnalyses: SwotAnalysis[]; success: boolean } {
    const originalLength = swotAnalyses.length;
    const filtered = swotAnalyses.filter((s) => s.id !== swotId);
    return {
      swotAnalyses: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new SWOT analysis with generated ID.
   */
  createSwot(swot: Omit<SwotAnalysis, "id">): SwotAnalysis {
    return {
      ...swot,
      id: this.generateSwotId(),
    };
  }
}
