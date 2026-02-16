/**
 * Directory-based parser for Brief.
 * Each brief is stored as a separate markdown file.
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { Brief } from "../../types.ts";

interface BriefFrontmatter {
  id: string;
  date: string;
}

type BriefSection = keyof Omit<Brief, "id" | "title" | "date">;

const SECTION_HEADERS: Record<BriefSection, string[]> = {
  summary: ["summary", "executive summary", "overview"],
  mission: ["mission"],
  responsible: ["responsible"],
  accountable: ["accountable"],
  consulted: ["consulted"],
  informed: ["informed"],
  highLevelBudget: ["budget", "high level budget"],
  highLevelTimeline: ["timeline", "high level timeline"],
  culture: ["culture"],
  changeCapacity: ["change capacity", "capacity for change"],
  guidingPrinciples: ["guiding principle", "principles"],
};

export class BriefDirectoryParser extends DirectoryParser<Brief> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "brief" });
  }

  protected parseFile(content: string, _filePath: string): Brief | null {
    const { frontmatter, content: body } = parseFrontmatter<BriefFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    const result: Brief = {
      id: frontmatter.id,
      title: "Untitled Brief",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
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

    let currentSection: BriefSection | null = null;
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0 && currentSection) {
        const text = currentParagraph.join(" ").trim();
        if (text) {
          result[currentSection].push(text);
        }
        currentParagraph = [];
      }
    };

    for (const line of lines) {
      if (line.startsWith("# ")) {
        flushParagraph();
        result.title = line.slice(2).trim();
        continue;
      }

      if (line.startsWith("## ")) {
        flushParagraph();
        const headerText = line.slice(3).trim().toLowerCase();
        currentSection = null;

        for (const [section, keywords] of Object.entries(SECTION_HEADERS)) {
          if (keywords.some(kw => headerText.includes(kw))) {
            currentSection = section as BriefSection;
            break;
          }
        }
        continue;
      }

      // Handle list items
      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentSection) {
        flushParagraph();
        result[currentSection].push(listMatch[1].trim());
        continue;
      }

      // Handle paragraph text (non-empty lines that aren't list items)
      const trimmedLine = line.trim();
      if (trimmedLine && currentSection && !trimmedLine.startsWith("#")) {
        currentParagraph.push(trimmedLine);
      } else if (!trimmedLine && currentParagraph.length > 0) {
        // Empty line ends a paragraph
        flushParagraph();
      }
    }

    // Flush any remaining paragraph
    flushParagraph();

    return result;
  }

  protected serializeItem(brief: Brief): string {
    const frontmatter: BriefFrontmatter = {
      id: brief.id,
      date: brief.date,
    };

    const sections: string[] = [`# ${brief.title}`];

    const addSection = (header: string, items: string[]) => {
      sections.push("");
      sections.push(`## ${header}`);
      sections.push("");
      for (const item of items) {
        sections.push(`- ${item}`);
      }
    };

    addSection("Summary", brief.summary);
    addSection("Mission", brief.mission);
    addSection("Responsible", brief.responsible);
    addSection("Accountable", brief.accountable);
    addSection("Consulted", brief.consulted);
    addSection("Informed", brief.informed);
    addSection("High Level Budget", brief.highLevelBudget);
    addSection("High Level Timeline", brief.highLevelTimeline);
    addSection("Culture", brief.culture);
    addSection("Change Capacity", brief.changeCapacity);
    addSection("Guiding Principles", brief.guidingPrinciples);

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async add(brief: Omit<Brief, "id">): Promise<Brief> {
    const newBrief: Brief = {
      ...brief,
      id: this.generateId("brief"),
    };
    await this.write(newBrief);
    return newBrief;
  }

  async update(id: string, updates: Partial<Brief>): Promise<Brief | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Brief = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  async addItem(id: string, section: BriefSection, item: string): Promise<Brief | null> {
    const brief = await this.read(id);
    if (!brief) return null;

    brief[section].push(item);
    await this.write(brief);
    return brief;
  }

  async removeItem(id: string, section: BriefSection, itemIndex: number): Promise<Brief | null> {
    const brief = await this.read(id);
    if (!brief) return null;

    if (itemIndex >= 0 && itemIndex < brief[section].length) {
      brief[section].splice(itemIndex, 1);
      await this.write(brief);
    }
    return brief;
  }
}
