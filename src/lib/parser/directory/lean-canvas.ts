/**
 * Directory-based parser for Lean Canvas.
 * Each lean canvas is stored as a separate markdown file.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { LeanCanvas } from "../../types.ts";

interface LeanCanvasFrontmatter {
  id: string;
  date: string;
}

type LeanCanvasSection = keyof Omit<LeanCanvas, "id" | "title" | "date">;

const SECTION_HEADERS: Record<LeanCanvasSection, string[]> = {
  problem: ["problem"],
  solution: ["solution"],
  uniqueValueProp: ["unique value", "value proposition", "uvp"],
  unfairAdvantage: ["unfair advantage"],
  customerSegments: ["customer segment"],
  existingAlternatives: ["existing alternative", "alternatives"],
  keyMetrics: ["key metric", "metrics"],
  highLevelConcept: ["high level concept", "concept"],
  channels: ["channel"],
  earlyAdopters: ["early adopter"],
  costStructure: ["cost structure", "cost"],
  revenueStreams: ["revenue stream", "revenue"],
};

export class LeanCanvasDirectoryParser extends DirectoryParser<LeanCanvas> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "leancanvas" });
  }

  protected parseFile(content: string, _filePath: string): LeanCanvas | null {
    const { frontmatter, content: body } = parseFrontmatter<
      LeanCanvasFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    const title = "Untitled Lean Canvas";
    const result: LeanCanvas = {
      id: frontmatter.id,
      title,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      problem: [],
      solution: [],
      uniqueValueProp: [],
      unfairAdvantage: [],
      customerSegments: [],
      existingAlternatives: [],
      keyMetrics: [],
      highLevelConcept: [],
      channels: [],
      earlyAdopters: [],
      costStructure: [],
      revenueStreams: [],
    };

    let currentSection: LeanCanvasSection | null = null;
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
          if (keywords.some((kw) => headerText.includes(kw))) {
            currentSection = section as LeanCanvasSection;
            break;
          }
        }
        continue;
      }

      // List items
      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentSection) {
        flushParagraph();
        result[currentSection].push(listMatch[1].trim());
        continue;
      }

      // Paragraph text (non-empty lines that aren't headers or list items)
      const trimmed = line.trim();
      if (trimmed && currentSection) {
        currentParagraph.push(trimmed);
      } else if (!trimmed && currentParagraph.length > 0) {
        flushParagraph();
      }
    }

    // Flush any remaining paragraph
    flushParagraph();

    return result;
  }

  protected serializeItem(canvas: LeanCanvas): string {
    const frontmatter: LeanCanvasFrontmatter = {
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

    addSection("Problem", canvas.problem);
    addSection("Existing Alternatives", canvas.existingAlternatives);
    addSection("Solution", canvas.solution);
    addSection("Key Metrics", canvas.keyMetrics);
    addSection("Unique Value Proposition", canvas.uniqueValueProp);
    addSection("High Level Concept", canvas.highLevelConcept);
    addSection("Unfair Advantage", canvas.unfairAdvantage);
    addSection("Channels", canvas.channels);
    addSection("Customer Segments", canvas.customerSegments);
    addSection("Early Adopters", canvas.earlyAdopters);
    addSection("Cost Structure", canvas.costStructure);
    addSection("Revenue Streams", canvas.revenueStreams);

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async add(canvas: Omit<LeanCanvas, "id">): Promise<LeanCanvas> {
    const newCanvas: LeanCanvas = {
      ...canvas,
      id: this.generateId("leancanvas"),
    };
    await this.write(newCanvas);
    return newCanvas;
  }

  async update(
    id: string,
    updates: Partial<LeanCanvas>,
  ): Promise<LeanCanvas | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: LeanCanvas = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  async addItem(
    id: string,
    section: LeanCanvasSection,
    item: string,
  ): Promise<LeanCanvas | null> {
    const canvas = await this.read(id);
    if (!canvas) return null;

    canvas[section].push(item);
    await this.write(canvas);
    return canvas;
  }

  async removeItem(
    id: string,
    section: LeanCanvasSection,
    itemIndex: number,
  ): Promise<LeanCanvas | null> {
    const canvas = await this.read(id);
    if (!canvas) return null;

    if (itemIndex >= 0 && itemIndex < canvas[section].length) {
      canvas[section].splice(itemIndex, 1);
      await this.write(canvas);
    }
    return canvas;
  }
}
