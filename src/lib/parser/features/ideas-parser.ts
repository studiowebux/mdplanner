/**
 * Ideas parser class for parsing and serializing ideas-related markdown.
 * Handles idea CRUD operations and Zettelkasten-style backlinks.
 */
import { Idea } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class IdeasParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses ideas from the Ideas section in markdown.
   */
  parseIdeasSection(lines: string[]): Idea[] {
    const ideas: Idea[] = [];

    let inIdeasSection = false;
    let currentIdea: Partial<Idea> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# Ideas") || line.includes("<!-- Ideas -->")) {
        inIdeasSection = true;
        continue;
      }

      if (
        inIdeasSection &&
        line.startsWith("# ") &&
        !line.startsWith("# Ideas")
      ) {
        if (currentIdea?.title) ideas.push(currentIdea as Idea);
        currentIdea = null;
        break;
      }

      if (!inIdeasSection) continue;

      if (line.startsWith("## ")) {
        if (currentIdea?.title) ideas.push(currentIdea as Idea);
        let title = line.substring(3).trim();
        let status: Idea["status"] = "new";

        // Parse inline metadata {status: X} from header
        const inlineMatch = title.match(/\{status:\s*([^}]+)\}/i);
        if (inlineMatch) {
          const s = inlineMatch[1].trim().toLowerCase();
          if (
            ["new", "considering", "planned", "approved", "rejected"].includes(
              s,
            )
          ) {
            status = s as Idea["status"];
          }
          title = title.replace(/\s*\{status:\s*[^}]+\}/, "").trim();
        }

        currentIdea = {
          id: this.generateIdeaId(),
          title,
          status,
          created: new Date().toISOString().split("T")[0],
        };
      } else if (currentIdea) {
        if (line.startsWith("Status:")) {
          const s = line.substring(7).trim().toLowerCase();
          if (
            ["new", "considering", "planned", "approved", "rejected"].includes(
              s,
            )
          ) {
            currentIdea.status = s as Idea["status"];
          }
        } else if (line.startsWith("Category:")) {
          currentIdea.category = line.substring(9).trim();
        } else if (line.startsWith("Created:")) {
          currentIdea.created = line.substring(8).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentIdea.id = match[1];
        } else if (line.startsWith("<!-- links:")) {
          const match = line.match(/<!-- links: ([^-]+) -->/);
          if (match) {
            const linkIds = match[1]
              .trim()
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id);
            if (linkIds.length > 0) currentIdea.links = linkIds;
          }
        } else if (line.trim() && !line.startsWith("<!--")) {
          currentIdea.description =
            (currentIdea.description || "") + line.trim() + "\n";
        }
      }
    }

    if (currentIdea?.title) ideas.push(currentIdea as Idea);
    return ideas;
  }

  /**
   * Generates a unique idea ID.
   */
  generateIdeaId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts an idea to markdown format.
   */
  ideaToMarkdown(idea: Idea): string {
    let content = `## ${idea.title}\n`;
    content += `<!-- id: ${idea.id} -->\n`;
    if (idea.links && idea.links.length > 0) {
      content += `<!-- links: ${idea.links.join(",")} -->\n`;
    }
    content += `Status: ${idea.status}\n`;
    if (idea.category) content += `Category: ${idea.category}\n`;
    content += `Created: ${idea.created}\n`;
    if (idea.description) content += `\n${idea.description.trim()}\n`;
    content += "\n";
    return content;
  }

  /**
   * Serializes all ideas to markdown format.
   */
  ideasToMarkdown(ideas: Idea[]): string {
    let content = "<!-- Ideas -->\n# Ideas\n\n";
    for (const idea of ideas) {
      content += this.ideaToMarkdown(idea);
    }
    return content;
  }

  /**
   * Finds the Ideas section boundaries in the file lines.
   */
  findIdeasSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Ideas -->") || lines[i].startsWith("# Ideas"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Ideas")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Computes backlinks for ideas (Zettelkasten-style).
   * Returns ideas with their backlinks populated.
   */
  computeBacklinks(ideas: Idea[]): (Idea & { backlinks: string[] })[] {
    return ideas.map((idea) => {
      const backlinks = ideas
        .filter((other) => other.links?.includes(idea.id))
        .map((other) => other.id);
      return { ...idea, backlinks };
    });
  }

  /**
   * Updates an idea in the ideas array.
   */
  updateIdeaInList(
    ideas: Idea[],
    ideaId: string,
    updates: Partial<Omit<Idea, "id">>,
  ): { ideas: Idea[]; success: boolean } {
    const index = ideas.findIndex((i) => i.id === ideaId);

    if (index === -1) {
      return { ideas, success: false };
    }

    ideas[index] = {
      ...ideas[index],
      ...updates,
    };

    return { ideas, success: true };
  }

  /**
   * Deletes an idea from the ideas array.
   */
  deleteIdeaFromList(
    ideas: Idea[],
    ideaId: string,
  ): { ideas: Idea[]; success: boolean } {
    const originalLength = ideas.length;
    const filtered = ideas.filter((i) => i.id !== ideaId);
    return {
      ideas: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new idea with generated ID.
   */
  createIdea(idea: Omit<Idea, "id">): Idea {
    return {
      ...idea,
      id: this.generateIdeaId(),
    };
  }
}
