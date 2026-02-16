/**
 * Directory-based parser for Retrospectives.
 * Each retrospective is stored as a separate markdown file.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Retrospective } from "../../types.ts";

interface RetrospectiveFrontmatter {
  id: string;
  date: string;
  status: "open" | "closed";
}

export class RetrospectivesDirectoryParser
  extends DirectoryParser<Retrospective> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "retrospectives" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): Retrospective | null {
    const { frontmatter, content: body } = parseFrontmatter<
      RetrospectiveFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    // Extract title from first heading
    const lines = body.split("\n");
    let title = "Untitled Retrospective";
    const continueItems: string[] = [];
    const stopItems: string[] = [];
    const startItems: string[] = [];

    let currentSection: "none" | "continue" | "stop" | "start" = "none";

    for (const line of lines) {
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }

      // Check for section headers
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.startsWith("## continue") ||
        lowerLine.startsWith("## went well") ||
        lowerLine.startsWith("## keep doing")
      ) {
        currentSection = "continue";
        continue;
      }
      if (
        lowerLine.startsWith("## stop") || lowerLine.startsWith("## improve") ||
        lowerLine.startsWith("## needs improvement")
      ) {
        currentSection = "stop";
        continue;
      }
      if (
        lowerLine.startsWith("## start") || lowerLine.startsWith("## action") ||
        lowerLine.startsWith("## try")
      ) {
        currentSection = "start";
        continue;
      }

      // Parse list items
      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        const item = listMatch[1].trim();
        switch (currentSection) {
          case "continue":
            continueItems.push(item);
            break;
          case "stop":
            stopItems.push(item);
            break;
          case "start":
            startItems.push(item);
            break;
        }
      }
    }

    return {
      id: frontmatter.id,
      title,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      status: frontmatter.status || "open",
      continue: continueItems,
      stop: stopItems,
      start: startItems,
    };
  }

  protected serializeItem(retro: Retrospective): string {
    const frontmatter: RetrospectiveFrontmatter = {
      id: retro.id,
      date: retro.date,
      status: retro.status,
    };

    const sections: string[] = [`# ${retro.title}`];

    if (retro.continue.length > 0) {
      sections.push("");
      sections.push("## Continue (Went Well)");
      sections.push("");
      for (const item of retro.continue) {
        sections.push(`- ${item}`);
      }
    }

    if (retro.stop.length > 0) {
      sections.push("");
      sections.push("## Stop (Needs Improvement)");
      sections.push("");
      for (const item of retro.stop) {
        sections.push(`- ${item}`);
      }
    }

    if (retro.start.length > 0) {
      sections.push("");
      sections.push("## Start (Actions)");
      sections.push("");
      for (const item of retro.start) {
        sections.push(`- ${item}`);
      }
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  /**
   * Add a new retrospective.
   */
  async add(retro: Omit<Retrospective, "id">): Promise<Retrospective> {
    const newRetro: Retrospective = {
      ...retro,
      id: this.generateId("retro"),
    };
    await this.write(newRetro);
    return newRetro;
  }

  /**
   * Update an existing retrospective.
   */
  async update(
    id: string,
    updates: Partial<Retrospective>,
  ): Promise<Retrospective | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Retrospective = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  /**
   * Add item to a specific section.
   */
  async addItem(
    id: string,
    section: "continue" | "stop" | "start",
    item: string,
  ): Promise<Retrospective | null> {
    const retro = await this.read(id);
    if (!retro) return null;

    retro[section].push(item);
    await this.write(retro);
    return retro;
  }

  /**
   * Remove item from a specific section.
   */
  async removeItem(
    id: string,
    section: "continue" | "stop" | "start",
    itemIndex: number,
  ): Promise<Retrospective | null> {
    const retro = await this.read(id);
    if (!retro) return null;

    if (itemIndex >= 0 && itemIndex < retro[section].length) {
      retro[section].splice(itemIndex, 1);
      await this.write(retro);
    }
    return retro;
  }
}
