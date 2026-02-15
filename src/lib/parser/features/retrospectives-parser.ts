/**
 * Retrospectives parser class for parsing and serializing retrospective-related markdown.
 * Handles Continue/Stop/Start retrospective format.
 */
import { Retrospective } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class RetrospectivesParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses retrospectives from the Retrospectives section in markdown.
   */
  parseRetrospectivesSection(lines: string[]): Retrospective[] {
    const retrospectives: Retrospective[] = [];

    let inRetrospectivesSection = false;
    let currentRetro: Partial<Retrospective> | null = null;
    let currentSubsection: "continue" | "stop" | "start" | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        line.startsWith("# Retrospectives") ||
        line.includes("<!-- Retrospectives -->")
      ) {
        inRetrospectivesSection = true;
        continue;
      }

      if (
        inRetrospectivesSection &&
        line.startsWith("# ") &&
        !line.startsWith("# Retrospectives")
      ) {
        if (currentRetro?.title) retrospectives.push(currentRetro as Retrospective);
        currentRetro = null;
        break;
      }

      if (!inRetrospectivesSection) continue;

      if (line.startsWith("## ")) {
        if (currentRetro?.title) retrospectives.push(currentRetro as Retrospective);
        const title = line.substring(3).trim();
        currentRetro = {
          id: this.generateRetroId(),
          title,
          date: new Date().toISOString().split("T")[0],
          status: "open",
          continue: [],
          stop: [],
          start: [],
        };
        currentSubsection = null;
      } else if (currentRetro) {
        if (line.startsWith("Date:")) {
          currentRetro.date = line.substring(5).trim();
        } else if (line.startsWith("Status:")) {
          const s = line.substring(7).trim().toLowerCase();
          if (["open", "closed"].includes(s)) {
            currentRetro.status = s as Retrospective["status"];
          }
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentRetro.id = match[1];
        } else if (line.startsWith("### Continue")) {
          currentSubsection = "continue";
        } else if (line.startsWith("### Stop")) {
          currentSubsection = "stop";
        } else if (line.startsWith("### Start")) {
          currentSubsection = "start";
        } else if (line.trim().startsWith("- ") && currentSubsection) {
          const item = line.trim().substring(2).trim();
          if (item) {
            currentRetro[currentSubsection]!.push(item);
          }
        }
      }
    }

    if (currentRetro?.title) retrospectives.push(currentRetro as Retrospective);
    return retrospectives;
  }

  /**
   * Generates a unique retrospective ID.
   */
  generateRetroId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts a retrospective to markdown format.
   */
  retrospectiveToMarkdown(retro: Retrospective): string {
    let content = `## ${retro.title}\n`;
    content += `<!-- id: ${retro.id} -->\n`;
    content += `Date: ${retro.date}\n`;
    content += `Status: ${retro.status}\n\n`;

    content += `### Continue\n`;
    for (const item of retro.continue) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    content += `### Stop\n`;
    for (const item of retro.stop) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    content += `### Start\n`;
    for (const item of retro.start) {
      content += `- ${item}\n`;
    }
    content += `\n`;

    return content;
  }

  /**
   * Serializes all retrospectives to markdown format.
   */
  retrospectivesToMarkdown(retrospectives: Retrospective[]): string {
    let content = "<!-- Retrospectives -->\n# Retrospectives\n\n";
    for (const retro of retrospectives) {
      content += this.retrospectiveToMarkdown(retro);
    }
    return content;
  }

  /**
   * Finds the Retrospectives section boundaries in the file lines.
   */
  findRetrospectivesSection(
    lines: string[],
  ): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Retrospectives -->") ||
          lines[i].startsWith("# Retrospectives"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Retrospectives")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Updates a retrospective in the retrospectives array.
   */
  updateRetrospectiveInList(
    retrospectives: Retrospective[],
    retroId: string,
    updates: Partial<Omit<Retrospective, "id">>,
  ): { retrospectives: Retrospective[]; success: boolean } {
    const index = retrospectives.findIndex((r) => r.id === retroId);

    if (index === -1) {
      return { retrospectives, success: false };
    }

    retrospectives[index] = {
      ...retrospectives[index],
      ...updates,
    };

    return { retrospectives, success: true };
  }

  /**
   * Deletes a retrospective from the retrospectives array.
   */
  deleteRetrospectiveFromList(
    retrospectives: Retrospective[],
    retroId: string,
  ): { retrospectives: Retrospective[]; success: boolean } {
    const originalLength = retrospectives.length;
    const filtered = retrospectives.filter((r) => r.id !== retroId);
    return {
      retrospectives: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new retrospective with generated ID.
   */
  createRetrospective(
    retro: Omit<Retrospective, "id">,
  ): Retrospective {
    return {
      ...retro,
      id: this.generateRetroId(),
    };
  }
}
