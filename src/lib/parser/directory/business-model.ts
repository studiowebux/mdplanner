/**
 * Directory-based parser for Business Model Canvas.
 * Each business model canvas is stored as a separate markdown file.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { BusinessModelCanvas } from "../../types.ts";

interface BusinessModelFrontmatter {
  id: string;
  date: string;
}

type BusinessModelSection = keyof Omit<
  BusinessModelCanvas,
  "id" | "title" | "date"
>;

const SECTION_HEADERS: Record<BusinessModelSection, string[]> = {
  keyPartners: ["key partner", "partners"],
  keyActivities: ["key activit", "activities"],
  keyResources: ["key resource", "resources"],
  valueProposition: ["value proposition"],
  customerRelationships: ["customer relationship"],
  channels: ["channel"],
  customerSegments: ["customer segment"],
  costStructure: ["cost structure", "cost"],
  revenueStreams: ["revenue stream", "revenue"],
};

export class BusinessModelDirectoryParser
  extends DirectoryParser<BusinessModelCanvas> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "businessmodel" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): BusinessModelCanvas | null {
    const { frontmatter, content: body } = parseFrontmatter<
      BusinessModelFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    const result: BusinessModelCanvas = {
      id: frontmatter.id,
      title: "Untitled Business Model",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      keyPartners: [],
      keyActivities: [],
      keyResources: [],
      valueProposition: [],
      customerRelationships: [],
      channels: [],
      customerSegments: [],
      costStructure: [],
      revenueStreams: [],
    };

    let currentSection: BusinessModelSection | null = null;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        result.title = line.slice(2).trim();
        continue;
      }

      if (line.startsWith("## ")) {
        const headerText = line.slice(3).trim().toLowerCase();
        currentSection = null;

        for (const [section, keywords] of Object.entries(SECTION_HEADERS)) {
          if (keywords.some((kw) => headerText.includes(kw))) {
            currentSection = section as BusinessModelSection;
            break;
          }
        }
        continue;
      }

      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentSection) {
        result[currentSection].push(listMatch[1].trim());
      }
    }

    return result;
  }

  protected serializeItem(canvas: BusinessModelCanvas): string {
    const frontmatter: BusinessModelFrontmatter = {
      id: canvas.id,
      date: canvas.date,
    };

    const sections: string[] = [`# ${canvas.title}`];

    const addSection = (header: string, items: string[]) => {
      sections.push("");
      sections.push(`## ${header}`);
      sections.push("");
      for (const item of items) {
        sections.push(`- ${item}`);
      }
    };

    addSection("Key Partners", canvas.keyPartners);
    addSection("Key Activities", canvas.keyActivities);
    addSection("Key Resources", canvas.keyResources);
    addSection("Value Proposition", canvas.valueProposition);
    addSection("Customer Relationships", canvas.customerRelationships);
    addSection("Channels", canvas.channels);
    addSection("Customer Segments", canvas.customerSegments);
    addSection("Cost Structure", canvas.costStructure);
    addSection("Revenue Streams", canvas.revenueStreams);

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async add(
    canvas: Omit<BusinessModelCanvas, "id">,
  ): Promise<BusinessModelCanvas> {
    const newCanvas: BusinessModelCanvas = {
      ...canvas,
      id: this.generateId("bmc"),
    };
    await this.write(newCanvas);
    return newCanvas;
  }

  async update(
    id: string,
    updates: Partial<BusinessModelCanvas>,
  ): Promise<BusinessModelCanvas | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: BusinessModelCanvas = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  async addItem(
    id: string,
    section: BusinessModelSection,
    item: string,
  ): Promise<BusinessModelCanvas | null> {
    const canvas = await this.read(id);
    if (!canvas) return null;

    canvas[section].push(item);
    await this.write(canvas);
    return canvas;
  }

  async removeItem(
    id: string,
    section: BusinessModelSection,
    itemIndex: number,
  ): Promise<BusinessModelCanvas | null> {
    const canvas = await this.read(id);
    if (!canvas) return null;

    if (itemIndex >= 0 && itemIndex < canvas[section].length) {
      canvas[section].splice(itemIndex, 1);
      await this.write(canvas);
    }
    return canvas;
  }
}
