/**
 * Business Model Canvas parser class for parsing and serializing business model markdown.
 * Handles the Business Model Canvas format with 9 sections.
 */
import { BusinessModelCanvas } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class BusinessModelParser extends BaseParser {
  private sectionMap: Record<string, keyof Omit<BusinessModelCanvas, "id" | "title" | "date">> = {
    "### Key Partners": "keyPartners",
    "### Key Activities": "keyActivities",
    "### Key Resources": "keyResources",
    "### Value Proposition": "valueProposition",
    "### Value Propositions": "valueProposition",
    "### Customer Relationships": "customerRelationships",
    "### Channels": "channels",
    "### Customer Segments": "customerSegments",
    "### Cost Structure": "costStructure",
    "### Revenue Streams": "revenueStreams",
  };

  private sectionOrder: Array<{ header: string; key: keyof Omit<BusinessModelCanvas, "id" | "title" | "date"> }> = [
    { header: "Key Partners", key: "keyPartners" },
    { header: "Key Activities", key: "keyActivities" },
    { header: "Key Resources", key: "keyResources" },
    { header: "Value Proposition", key: "valueProposition" },
    { header: "Customer Relationships", key: "customerRelationships" },
    { header: "Channels", key: "channels" },
    { header: "Customer Segments", key: "customerSegments" },
    { header: "Cost Structure", key: "costStructure" },
    { header: "Revenue Streams", key: "revenueStreams" },
  ];

  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses Business Model Canvases from the Business Model section in markdown.
   */
  parseBusinessModelSection(lines: string[]): BusinessModelCanvas[] {
    const canvases: BusinessModelCanvas[] = [];

    let inSection = false;
    let currentCanvas: Partial<BusinessModelCanvas> | null = null;
    let currentSubsection: keyof Omit<BusinessModelCanvas, "id" | "title" | "date"> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        line.startsWith("# Business Model") ||
        line.includes("<!-- Business Model -->") ||
        line.includes("<!-- Business Model Canvas -->")
      ) {
        inSection = true;
        continue;
      }

      if (
        inSection &&
        line.startsWith("# ") &&
        !line.startsWith("# Business Model")
      ) {
        if (currentCanvas?.title) canvases.push(currentCanvas as BusinessModelCanvas);
        currentCanvas = null;
        break;
      }

      if (!inSection) continue;

      if (line.startsWith("## ")) {
        if (currentCanvas?.title) canvases.push(currentCanvas as BusinessModelCanvas);
        const title = line.substring(3).trim();
        currentCanvas = {
          id: this.generateBusinessModelId(),
          title,
          date: new Date().toISOString().split("T")[0],
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

    if (currentCanvas?.title) canvases.push(currentCanvas as BusinessModelCanvas);
    return canvases;
  }

  /**
   * Generates a unique Business Model Canvas ID.
   */
  generateBusinessModelId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts a Business Model Canvas to markdown format.
   */
  businessModelToMarkdown(canvas: BusinessModelCanvas): string {
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
   * Serializes all Business Model Canvases to markdown format.
   */
  businessModelsToMarkdown(canvases: BusinessModelCanvas[]): string {
    let content = "<!-- Business Model Canvas -->\n# Business Model Canvas\n\n";
    for (const canvas of canvases) {
      content += this.businessModelToMarkdown(canvas);
    }
    return content;
  }

  /**
   * Finds the Business Model Canvas section boundaries in the file lines.
   */
  findBusinessModelSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Business Model Canvas -->") ||
          lines[i].startsWith("# Business Model Canvas"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Business Model Canvas")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Updates a Business Model Canvas in the array.
   */
  updateBusinessModelInList(
    canvases: BusinessModelCanvas[],
    canvasId: string,
    updates: Partial<Omit<BusinessModelCanvas, "id">>,
  ): { canvases: BusinessModelCanvas[]; success: boolean } {
    const index = canvases.findIndex((c) => c.id === canvasId);

    if (index === -1) {
      return { canvases, success: false };
    }

    canvases[index] = {
      ...canvases[index],
      ...updates,
    };

    return { canvases, success: true };
  }

  /**
   * Deletes a Business Model Canvas from the array.
   */
  deleteBusinessModelFromList(
    canvases: BusinessModelCanvas[],
    canvasId: string,
  ): { canvases: BusinessModelCanvas[]; success: boolean } {
    const originalLength = canvases.length;
    const filtered = canvases.filter((c) => c.id !== canvasId);
    return {
      canvases: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new Business Model Canvas with generated ID.
   */
  createBusinessModel(canvas: Omit<BusinessModelCanvas, "id">): BusinessModelCanvas {
    return {
      ...canvas,
      id: this.generateBusinessModelId(),
    };
  }
}
