/**
 * Directory-based parser for SWOT Analysis.
 * Each SWOT analysis is stored as a separate markdown file.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { SwotAnalysis } from "../../types.ts";

interface SwotFrontmatter {
  id: string;
  date: string;
}

export class SwotDirectoryParser extends DirectoryParser<SwotAnalysis> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "swot" });
  }

  protected parseFile(content: string, _filePath: string): SwotAnalysis | null {
    const { frontmatter, content: body } = parseFrontmatter<SwotFrontmatter>(
      content,
    );

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    let title = "Untitled SWOT";
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    let currentSection:
      | "none"
      | "strengths"
      | "weaknesses"
      | "opportunities"
      | "threats" = "none";

    for (const line of lines) {
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }

      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith("## strength")) {
        currentSection = "strengths";
        continue;
      }
      if (lowerLine.startsWith("## weakness")) {
        currentSection = "weaknesses";
        continue;
      }
      if (lowerLine.startsWith("## opportunit")) {
        currentSection = "opportunities";
        continue;
      }
      if (lowerLine.startsWith("## threat")) {
        currentSection = "threats";
        continue;
      }

      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        const item = listMatch[1].trim();
        switch (currentSection) {
          case "strengths":
            strengths.push(item);
            break;
          case "weaknesses":
            weaknesses.push(item);
            break;
          case "opportunities":
            opportunities.push(item);
            break;
          case "threats":
            threats.push(item);
            break;
        }
      }
    }

    return {
      id: frontmatter.id,
      title,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      strengths,
      weaknesses,
      opportunities,
      threats,
    };
  }

  protected serializeItem(swot: SwotAnalysis): string {
    const frontmatter: SwotFrontmatter = {
      id: swot.id,
      date: swot.date,
    };

    const sections: string[] = [`# ${swot.title}`];

    sections.push("");
    sections.push("## Strengths");
    sections.push("");
    for (const item of swot.strengths) {
      sections.push(`- ${item}`);
    }

    sections.push("");
    sections.push("## Weaknesses");
    sections.push("");
    for (const item of swot.weaknesses) {
      sections.push(`- ${item}`);
    }

    sections.push("");
    sections.push("## Opportunities");
    sections.push("");
    for (const item of swot.opportunities) {
      sections.push(`- ${item}`);
    }

    sections.push("");
    sections.push("## Threats");
    sections.push("");
    for (const item of swot.threats) {
      sections.push(`- ${item}`);
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async add(swot: Omit<SwotAnalysis, "id">): Promise<SwotAnalysis> {
    const newSwot: SwotAnalysis = {
      ...swot,
      id: this.generateId("swot"),
    };
    await this.write(newSwot);
    return newSwot;
  }

  async update(
    id: string,
    updates: Partial<SwotAnalysis>,
  ): Promise<SwotAnalysis | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: SwotAnalysis = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  async addItem(
    id: string,
    section: "strengths" | "weaknesses" | "opportunities" | "threats",
    item: string,
  ): Promise<SwotAnalysis | null> {
    const swot = await this.read(id);
    if (!swot) return null;

    swot[section].push(item);
    await this.write(swot);
    return swot;
  }

  async removeItem(
    id: string,
    section: "strengths" | "weaknesses" | "opportunities" | "threats",
    itemIndex: number,
  ): Promise<SwotAnalysis | null> {
    const swot = await this.read(id);
    if (!swot) return null;

    if (itemIndex >= 0 && itemIndex < swot[section].length) {
      swot[section].splice(itemIndex, 1);
      await this.write(swot);
    }
    return swot;
  }
}
