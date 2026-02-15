/**
 * Brief parser class for parsing and serializing brief markdown.
 * Handles the Brief format with RACI and other planning sections.
 */
import { Brief } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class BriefParser extends BaseParser {
  private sectionMap: Record<string, keyof Omit<Brief, "id" | "title" | "date">> = {
    "### Summary": "summary",
    "### Mission": "mission",
    "### Responsible": "responsible",
    "### Accountable": "accountable",
    "### Consulted": "consulted",
    "### Informed": "informed",
    "### High Level Budget": "highLevelBudget",
    "### High Level Timeline": "highLevelTimeline",
    "### Culture": "culture",
    "### Change Capacity": "changeCapacity",
    "### Guiding Principles": "guidingPrinciples",
  };

  private sectionOrder: Array<{ header: string; key: keyof Omit<Brief, "id" | "title" | "date"> }> = [
    { header: "Summary", key: "summary" },
    { header: "Mission", key: "mission" },
    { header: "Responsible", key: "responsible" },
    { header: "Accountable", key: "accountable" },
    { header: "Consulted", key: "consulted" },
    { header: "Informed", key: "informed" },
    { header: "High Level Budget", key: "highLevelBudget" },
    { header: "High Level Timeline", key: "highLevelTimeline" },
    { header: "Culture", key: "culture" },
    { header: "Change Capacity", key: "changeCapacity" },
    { header: "Guiding Principles", key: "guidingPrinciples" },
  ];

  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses Briefs from the Brief section in markdown.
   */
  parseBriefSection(lines: string[]): Brief[] {
    const briefs: Brief[] = [];

    let inSection = false;
    let currentBrief: Partial<Brief> | null = null;
    let currentSubsection: keyof Omit<Brief, "id" | "title" | "date"> | null = null;
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0 && currentSubsection && currentBrief) {
        const text = currentParagraph.join(" ").trim();
        if (text) {
          currentBrief[currentSubsection]?.push(text);
        }
        currentParagraph = [];
      }
    };

    for (const line of lines) {
      if (line.includes("<!-- Brief -->") || line.startsWith("# Brief")) {
        inSection = true;
        continue;
      }

      if (inSection && line.startsWith("# ") && !line.startsWith("# Brief")) {
        flushParagraph();
        if (currentBrief?.title) briefs.push(currentBrief as Brief);
        currentBrief = null;
        break;
      }

      if (!inSection) continue;

      if (line.startsWith("## ")) {
        flushParagraph();
        if (currentBrief?.title) briefs.push(currentBrief as Brief);
        const title = line.substring(3).trim();
        currentBrief = {
          id: this.generateBriefId(),
          title,
          date: new Date().toISOString().split("T")[0],
          summary: [],
          mission: [],
          responsible: [],
          accountable: [],
          consulted: [],
          informed: [],
          highLevelBudget: [],
          highLevelTimeline: [],
          culture: [],
          changeCapacity: [],
          guidingPrinciples: [],
        };
        currentSubsection = null;
        continue;
      }

      if (!currentBrief) continue;

      const idMatch = line.match(/<!--\s*id:\s*([^\s]+)\s*-->/);
      if (idMatch) {
        currentBrief.id = idMatch[1];
        continue;
      }

      if (line.startsWith("Date:")) {
        currentBrief.date = line.substring(5).trim();
        continue;
      }

      // Check if line is a section header
      let foundHeader = false;
      for (const [header, key] of Object.entries(this.sectionMap)) {
        if (line.startsWith(header)) {
          flushParagraph();
          currentSubsection = key;
          foundHeader = true;
          break;
        }
      }
      if (foundHeader) continue;

      // Handle list items
      if (currentSubsection && line.startsWith("- ")) {
        flushParagraph();
        const item = line.substring(2).trim();
        if (item) currentBrief[currentSubsection]?.push(item);
        continue;
      }

      // Handle paragraph text
      const trimmed = line.trim();
      if (trimmed && currentSubsection && !trimmed.startsWith("#") && !trimmed.startsWith("<!--")) {
        currentParagraph.push(trimmed);
      } else if (!trimmed && currentParagraph.length > 0) {
        flushParagraph();
      }
    }

    flushParagraph();
    if (currentBrief?.title) briefs.push(currentBrief as Brief);
    return briefs;
  }

  /**
   * Generates a unique Brief ID.
   */
  generateBriefId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts a Brief to markdown format.
   */
  briefToMarkdown(brief: Brief): string {
    let content = `## ${brief.title}\n`;
    content += `<!-- id: ${brief.id} -->\n`;
    content += `Date: ${brief.date}\n\n`;

    for (const { header, key } of this.sectionOrder) {
      content += `### ${header}\n`;
      for (const item of brief[key]) {
        content += `- ${item}\n`;
      }
      content += `\n`;
    }

    return content;
  }

  /**
   * Serializes all Briefs to markdown format.
   */
  briefsToMarkdown(briefs: Brief[]): string {
    let content = "<!-- Brief -->\n# Brief\n\n";
    for (const brief of briefs) {
      content += this.briefToMarkdown(brief);
    }
    return content;
  }

  /**
   * Finds the Brief section boundaries in the file lines.
   */
  findBriefSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Brief -->") || lines[i].startsWith("# Brief"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Brief")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Updates a Brief in the array.
   */
  updateBriefInList(
    briefs: Brief[],
    briefId: string,
    updates: Partial<Omit<Brief, "id">>,
  ): { briefs: Brief[]; success: boolean } {
    const index = briefs.findIndex((b) => b.id === briefId);

    if (index === -1) {
      return { briefs, success: false };
    }

    briefs[index] = {
      ...briefs[index],
      ...updates,
    };

    return { briefs, success: true };
  }

  /**
   * Deletes a Brief from the array.
   */
  deleteBriefFromList(
    briefs: Brief[],
    briefId: string,
  ): { briefs: Brief[]; success: boolean } {
    const originalLength = briefs.length;
    const filtered = briefs.filter((b) => b.id !== briefId);
    return {
      briefs: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new Brief with generated ID.
   */
  createBrief(brief: Omit<Brief, "id">): Brief {
    return {
      ...brief,
      id: this.generateBriefId(),
    };
  }
}
