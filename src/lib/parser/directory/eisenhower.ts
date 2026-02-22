/**
 * Directory-based parser for Eisenhower Matrix.
 * Each matrix is stored as a separate markdown file.
 * Pattern: DirectoryParser subclass
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { EisenhowerMatrix } from "../../types.ts";

interface EisenhowerFrontmatter {
  id: string;
  date: string;
  urgentImportant: string[];
  notUrgentImportant: string[];
  urgentNotImportant: string[];
  notUrgentNotImportant: string[];
}

export class EisenhowerDirectoryParser
  extends DirectoryParser<EisenhowerMatrix> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "eisenhower" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): EisenhowerMatrix | null {
    const { frontmatter, content: body } = parseFrontmatter<
      EisenhowerFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    let title = "Untitled Matrix";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        break;
      }
    }

    return {
      id: frontmatter.id,
      title,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      urgentImportant: frontmatter.urgentImportant || [],
      notUrgentImportant: frontmatter.notUrgentImportant || [],
      urgentNotImportant: frontmatter.urgentNotImportant || [],
      notUrgentNotImportant: frontmatter.notUrgentNotImportant || [],
    };
  }

  protected serializeItem(matrix: EisenhowerMatrix): string {
    const frontmatter: EisenhowerFrontmatter = {
      id: matrix.id,
      date: matrix.date,
      urgentImportant: matrix.urgentImportant,
      notUrgentImportant: matrix.notUrgentImportant,
      urgentNotImportant: matrix.urgentNotImportant,
      notUrgentNotImportant: matrix.notUrgentNotImportant,
    };

    const body = `# ${matrix.title}`;

    return buildFileContent(frontmatter, body);
  }

  async add(
    matrix: Omit<EisenhowerMatrix, "id">,
  ): Promise<EisenhowerMatrix> {
    const newMatrix: EisenhowerMatrix = {
      ...matrix,
      id: this.generateId("eisenhower"),
    };
    await this.write(newMatrix);
    return newMatrix;
  }

  async update(
    id: string,
    updates: Partial<EisenhowerMatrix>,
  ): Promise<EisenhowerMatrix | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: EisenhowerMatrix = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }
}
