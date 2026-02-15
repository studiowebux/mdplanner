/**
 * Project Value Board parser class for parsing and serializing project value markdown.
 * Handles the Project Value Board format with 4 sections.
 */
import { ProjectValueBoard } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class ProjectValueParser extends BaseParser {
  private sectionMap: Record<string, keyof Omit<ProjectValueBoard, "id" | "title" | "date">> = {
    "### Customer Segments": "customerSegments",
    "### Problem": "problem",
    "### Solution": "solution",
    "### Benefit": "benefit",
  };

  private sectionOrder: Array<{ header: string; key: keyof Omit<ProjectValueBoard, "id" | "title" | "date"> }> = [
    { header: "Customer Segments", key: "customerSegments" },
    { header: "Problem", key: "problem" },
    { header: "Solution", key: "solution" },
    { header: "Benefit", key: "benefit" },
  ];

  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses Project Value Boards from the Project Value Board section in markdown.
   */
  parseProjectValueSection(lines: string[]): ProjectValueBoard[] {
    const boards: ProjectValueBoard[] = [];

    let inSection = false;
    let currentBoard: Partial<ProjectValueBoard> | null = null;
    let currentSubsection: keyof Omit<ProjectValueBoard, "id" | "title" | "date"> | null = null;

    for (const line of lines) {
      if (
        line.includes("<!-- Project Value Board -->") ||
        line.startsWith("# Project Value Board")
      ) {
        inSection = true;
        continue;
      }

      if (
        inSection &&
        line.startsWith("# ") &&
        !line.startsWith("# Project Value Board")
      ) {
        if (currentBoard?.title) boards.push(currentBoard as ProjectValueBoard);
        currentBoard = null;
        break;
      }

      if (!inSection) continue;

      if (line.startsWith("## ")) {
        if (currentBoard?.title) boards.push(currentBoard as ProjectValueBoard);
        const title = line.substring(3).trim();
        currentBoard = {
          id: this.generateProjectValueId(),
          title,
          date: new Date().toISOString().split("T")[0],
          customerSegments: [],
          problem: [],
          solution: [],
          benefit: [],
        };
        currentSubsection = null;
        continue;
      }

      if (!currentBoard) continue;

      const idMatch = line.match(/<!--\s*id:\s*([^\s]+)\s*-->/);
      if (idMatch) {
        currentBoard.id = idMatch[1];
        continue;
      }

      if (line.startsWith("Date:")) {
        currentBoard.date = line.substring(5).trim();
        continue;
      }

      for (const [header, key] of Object.entries(this.sectionMap)) {
        if (line.startsWith(header)) {
          currentSubsection = key;
          break;
        }
      }

      if (currentSubsection && line.startsWith("- ")) {
        const item = line.substring(2).trim();
        if (item) currentBoard[currentSubsection]?.push(item);
      }
    }

    if (currentBoard?.title) boards.push(currentBoard as ProjectValueBoard);
    return boards;
  }

  /**
   * Generates a unique Project Value Board ID.
   */
  generateProjectValueId(): string {
    return crypto.randomUUID();
  }

  /**
   * Converts a Project Value Board to markdown format.
   */
  projectValueToMarkdown(board: ProjectValueBoard): string {
    let content = `## ${board.title}\n`;
    content += `<!-- id: ${board.id} -->\n`;
    content += `Date: ${board.date}\n\n`;

    for (const { header, key } of this.sectionOrder) {
      content += `### ${header}\n`;
      for (const item of board[key]) {
        content += `- ${item}\n`;
      }
      content += `\n`;
    }

    return content;
  }

  /**
   * Serializes all Project Value Boards to markdown format.
   */
  projectValuesToMarkdown(boards: ProjectValueBoard[]): string {
    let content = "<!-- Project Value Board -->\n# Project Value Board\n\n";
    for (const board of boards) {
      content += this.projectValueToMarkdown(board);
    }
    return content;
  }

  /**
   * Finds the Project Value Board section boundaries in the file lines.
   */
  findProjectValueSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Project Value Board -->") ||
          lines[i].startsWith("# Project Value Board"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Project Value Board")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Updates a Project Value Board in the array.
   */
  updateProjectValueInList(
    boards: ProjectValueBoard[],
    boardId: string,
    updates: Partial<Omit<ProjectValueBoard, "id">>,
  ): { boards: ProjectValueBoard[]; success: boolean } {
    const index = boards.findIndex((b) => b.id === boardId);

    if (index === -1) {
      return { boards, success: false };
    }

    boards[index] = {
      ...boards[index],
      ...updates,
    };

    return { boards, success: true };
  }

  /**
   * Deletes a Project Value Board from the array.
   */
  deleteProjectValueFromList(
    boards: ProjectValueBoard[],
    boardId: string,
  ): { boards: ProjectValueBoard[]; success: boolean } {
    const originalLength = boards.length;
    const filtered = boards.filter((b) => b.id !== boardId);
    return {
      boards: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new Project Value Board with generated ID.
   */
  createProjectValue(board: Omit<ProjectValueBoard, "id">): ProjectValueBoard {
    return {
      ...board,
      id: this.generateProjectValueId(),
    };
  }
}
