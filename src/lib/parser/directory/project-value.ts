/**
 * Directory-based parser for Project Value Board.
 * Each project value board is stored as a separate markdown file.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { ProjectValueBoard } from "../../types.ts";

interface ProjectValueFrontmatter {
  id: string;
  date: string;
}

type ProjectValueSection = keyof Omit<
  ProjectValueBoard,
  "id" | "title" | "date"
>;

const SECTION_HEADERS: Record<ProjectValueSection, string[]> = {
  customerSegments: ["customer segment", "target customer", "who"],
  problem: ["problem", "pain point"],
  solution: ["solution", "how we solve"],
  benefit: ["benefit", "value", "outcome"],
};

export class ProjectValueDirectoryParser
  extends DirectoryParser<ProjectValueBoard> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "projectvalue" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): ProjectValueBoard | null {
    const { frontmatter, content: body } = parseFrontmatter<
      ProjectValueFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    const result: ProjectValueBoard = {
      id: frontmatter.id,
      title: "Untitled Value Board",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      customerSegments: [],
      problem: [],
      solution: [],
      benefit: [],
    };

    let currentSection: ProjectValueSection | null = null;

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
            currentSection = section as ProjectValueSection;
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

  protected serializeItem(board: ProjectValueBoard): string {
    const frontmatter: ProjectValueFrontmatter = {
      id: board.id,
      date: board.date,
    };

    const sections: string[] = [`# ${board.title}`];

    const addSection = (header: string, items: string[]) => {
      sections.push("");
      sections.push(`## ${header}`);
      sections.push("");
      for (const item of items) {
        sections.push(`- ${item}`);
      }
    };

    addSection("Customer Segments", board.customerSegments);
    addSection("Problem", board.problem);
    addSection("Solution", board.solution);
    addSection("Benefit", board.benefit);

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async add(board: Omit<ProjectValueBoard, "id">): Promise<ProjectValueBoard> {
    const newBoard: ProjectValueBoard = {
      ...board,
      id: this.generateId("value"),
    };
    await this.write(newBoard);
    return newBoard;
  }

  async update(
    id: string,
    updates: Partial<ProjectValueBoard>,
  ): Promise<ProjectValueBoard | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: ProjectValueBoard = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  async addItem(
    id: string,
    section: ProjectValueSection,
    item: string,
  ): Promise<ProjectValueBoard | null> {
    const board = await this.read(id);
    if (!board) return null;

    board[section].push(item);
    await this.write(board);
    return board;
  }

  async removeItem(
    id: string,
    section: ProjectValueSection,
    itemIndex: number,
  ): Promise<ProjectValueBoard | null> {
    const board = await this.read(id);
    if (!board) return null;

    if (itemIndex >= 0 && itemIndex < board[section].length) {
      board[section].splice(itemIndex, 1);
      await this.write(board);
    }
    return board;
  }
}
