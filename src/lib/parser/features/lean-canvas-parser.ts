/**
 * Lean Canvas parser class for parsing and serializing lean canvas markdown.
 * Handles the Lean Canvas business model format with 12 sections.
 */
import { LeanCanvas } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class LeanCanvasParser extends BaseParser {
  private sectionMap: Record<string, keyof Omit<LeanCanvas, "id" | "title" | "date">> = {
    "### Problem": "problem",
    "### Solution": "solution",
    "### Unique Value Proposition": "uniqueValueProp",
    "### Unfair Advantage": "unfairAdvantage",
    "### Customer Segments": "customerSegments",
    "### Existing Alternatives": "existingAlternatives",
    "### Key Metrics": "keyMetrics",
    "### High-Level Concept": "highLevelConcept",
    "### Channels": "channels",
    "### Early Adopters": "earlyAdopters",
    "### Cost Structure": "costStructure",
    "### Revenue Streams": "revenueStreams",
  };

  private sectionOrder: Array<{ header: string; key: keyof Omit<LeanCanvas, "id" | "title" | "date"> }> = [
    { header: "Problem", key: "problem" },
    { header: "Solution", key: "solution" },
    { header: "Unique Value Proposition", key: "uniqueValueProp" },
    { header: "Unfair Advantage", key: "unfairAdvantage" },
    { header: "Customer Segments", key: "customerSegments" },
    { header: "Existing Alternatives", key: "existingAlternatives" },
    { header: "Key Metrics", key: "keyMetrics" },
    { header: "High-Level Concept", key: "highLevelConcept" },
    { header: "Channels", key: "channels" },
    { header: "Early Adopters", key: "earlyAdopters" },
    { header: "Cost Structure", key: "costStructure" },
    { header: "Revenue Streams", key: "revenueStreams" },
  ];

  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses Lean Canvases from the Lean Canvas section in markdown.
   */
  parseLeanCanvasSection(lines: string[]): LeanCanvas[] {
    const leanCanvases: LeanCanvas[] = [];

    let inLeanSection = false;
    let currentCanvas: Partial<LeanCanvas> | null = null;
    let currentSubsection: keyof Omit<LeanCanvas, "id" | "title" | "date"> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        line.startsWith("# Lean Canvas") ||
        line.includes("<!-- Lean Canvas -->")
      ) {
        inLeanSection = true;
        continue;
      }

      if (
        inLeanSection &&
        line.startsWith("# ") &&
        !line.startsWith("# Lean Canvas")
      ) {
        if (currentCanvas?.title) leanCanvases.push(currentCanvas as LeanCanvas);
        currentCanvas = null;
        break;
      }

      if (!inLeanSection) continue;

      if (line.startsWith("## ")) {
        if (currentCanvas?.title) leanCanvases.push(currentCanvas as LeanCanvas);
        const title = line.substring(3).trim();
        currentCanvas = {
          id: this.generateLeanCanvasId(),
          title,
          date: new Date().toISOString().split("T")[0],
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
        currentSubsection = null;
      } else if (currentCanvas) {
        if (line.startsWith("Date:")) {
          currentCanvas.date = line.substring(5).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentCanvas.id = match[1];
        } else {
          for (const [header, key] of Object.entries(this.sectionMap)) {
            if (line.startsWith(header)) {
              currentSubsection = key;
              break;
            }
          }
          if (line.trim().startsWith("- ") && currentSubsection) {
            const item = line.trim().substring(2).trim();
            if (item) {
              (currentCanvas[currentSubsection] as string[]).push(item);
            }
          }
        }
      }
    }

    if (currentCanvas?.title) leanCanvases.push(currentCanvas as LeanCanvas);
    return leanCanvases;
  }

  /**
   * Generates a unique Lean Canvas ID.
   */
  generateLeanCanvasId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts a Lean Canvas to markdown format.
   */
  leanCanvasToMarkdown(canvas: LeanCanvas): string {
    let content = `## ${canvas.title}\n`;
    content += `<!-- id: ${canvas.id} -->\n`;
    content += `Date: ${canvas.date}\n\n`;

    for (const { header, key } of this.sectionOrder) {
      content += `### ${header}\n`;
      for (const item of canvas[key]) {
        content += `- ${item}\n`;
      }
      content += `\n`;
    }

    return content;
  }

  /**
   * Serializes all Lean Canvases to markdown format.
   */
  leanCanvasesToMarkdown(leanCanvases: LeanCanvas[]): string {
    let content = "<!-- Lean Canvas -->\n# Lean Canvas\n\n";
    for (const canvas of leanCanvases) {
      content += this.leanCanvasToMarkdown(canvas);
    }
    return content;
  }

  /**
   * Finds the Lean Canvas section boundaries in the file lines.
   */
  findLeanCanvasSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Lean Canvas -->") ||
          lines[i].startsWith("# Lean Canvas"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Lean Canvas")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Updates a Lean Canvas in the array.
   */
  updateLeanCanvasInList(
    leanCanvases: LeanCanvas[],
    canvasId: string,
    updates: Partial<Omit<LeanCanvas, "id">>,
  ): { leanCanvases: LeanCanvas[]; success: boolean } {
    const index = leanCanvases.findIndex((c) => c.id === canvasId);

    if (index === -1) {
      return { leanCanvases, success: false };
    }

    leanCanvases[index] = {
      ...leanCanvases[index],
      ...updates,
    };

    return { leanCanvases, success: true };
  }

  /**
   * Deletes a Lean Canvas from the array.
   */
  deleteLeanCanvasFromList(
    leanCanvases: LeanCanvas[],
    canvasId: string,
  ): { leanCanvases: LeanCanvas[]; success: boolean } {
    const originalLength = leanCanvases.length;
    const filtered = leanCanvases.filter((c) => c.id !== canvasId);
    return {
      leanCanvases: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new Lean Canvas with generated ID.
   */
  createLeanCanvas(canvas: Omit<LeanCanvas, "id">): LeanCanvas {
    return {
      ...canvas,
      id: this.generateLeanCanvasId(),
    };
  }
}
