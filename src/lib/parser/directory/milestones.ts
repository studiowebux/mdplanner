/**
 * Directory-based parser for Milestones.
 * Each milestone is stored as a separate markdown file.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Milestone } from "../../types.ts";

interface MilestoneFrontmatter {
  id: string;
  target?: string;
  status: "open" | "completed";
  project?: string;
}

export class MilestonesDirectoryParser extends DirectoryParser<Milestone> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "milestones" });
  }

  protected parseFile(content: string, _filePath: string): Milestone | null {
    const { frontmatter, content: body } = parseFrontmatter<
      MilestoneFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    // Extract name from first heading
    const lines = body.split("\n");
    let name = "Untitled Milestone";
    let descriptionStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        name = line.slice(2).trim();
        descriptionStartIndex = i + 1;
        break;
      }
    }

    const description = lines.slice(descriptionStartIndex).join("\n").trim();

    return {
      id: frontmatter.id,
      name,
      target: frontmatter.target,
      status: frontmatter.status || "open",
      description: description || undefined,
      project: frontmatter.project,
    };
  }

  protected serializeItem(milestone: Milestone): string {
    const frontmatter: MilestoneFrontmatter = {
      id: milestone.id,
      status: milestone.status,
    };

    if (milestone.target) {
      frontmatter.target = milestone.target;
    }

    if (milestone.project) {
      frontmatter.project = milestone.project;
    }

    const body = `# ${milestone.name}\n\n${milestone.description || ""}`;

    return buildFileContent(frontmatter, body);
  }

  /**
   * Add a new milestone.
   */
  async add(milestone: Omit<Milestone, "id">): Promise<Milestone> {
    const newMilestone: Milestone = {
      ...milestone,
      id: this.generateId("milestone"),
    };
    await this.write(newMilestone);
    return newMilestone;
  }

  /**
   * Update an existing milestone.
   */
  async update(
    id: string,
    updates: Partial<Milestone>,
  ): Promise<Milestone | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Milestone = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }
}
