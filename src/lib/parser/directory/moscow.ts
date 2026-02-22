/**
 * Directory-based parser for MoSCoW Analysis.
 * Each analysis is stored as a separate markdown file.
 * Pattern: DirectoryParser subclass
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { MoscowAnalysis } from "../../types.ts";

interface MoscowFrontmatter {
  id: string;
  date: string;
  must: string[];
  should: string[];
  could: string[];
  wont: string[];
}

export class MoscowDirectoryParser extends DirectoryParser<MoscowAnalysis> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "moscow" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): MoscowAnalysis | null {
    const { frontmatter, content: body } = parseFrontmatter<MoscowFrontmatter>(
      content,
    );

    if (!frontmatter.id) {
      return null;
    }

    // Extract title from first heading
    const lines = body.split("\n");
    let title = "Untitled Analysis";

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
      must: frontmatter.must || [],
      should: frontmatter.should || [],
      could: frontmatter.could || [],
      wont: frontmatter.wont || [],
    };
  }

  protected serializeItem(analysis: MoscowAnalysis): string {
    const frontmatter: MoscowFrontmatter = {
      id: analysis.id,
      date: analysis.date,
      must: analysis.must,
      should: analysis.should,
      could: analysis.could,
      wont: analysis.wont,
    };

    const body = `# ${analysis.title}`;

    return buildFileContent(frontmatter, body);
  }

  async add(analysis: Omit<MoscowAnalysis, "id">): Promise<MoscowAnalysis> {
    const newAnalysis: MoscowAnalysis = {
      ...analysis,
      id: this.generateId("moscow"),
    };
    await this.write(newAnalysis);
    return newAnalysis;
  }

  async update(
    id: string,
    updates: Partial<MoscowAnalysis>,
  ): Promise<MoscowAnalysis | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: MoscowAnalysis = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }
}
