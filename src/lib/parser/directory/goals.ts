/**
 * Directory-based parser for Goals.
 * Each goal is stored as a separate markdown file.
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { Goal } from "../../types.ts";

interface GoalFrontmatter {
  id: string;
  type: "enterprise" | "project";
  kpi: string;
  start: string;
  end: string;
  status: "planning" | "on-track" | "at-risk" | "late" | "success" | "failed";
}

export class GoalsDirectoryParser extends DirectoryParser<Goal> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "goals" });
  }

  protected parseFile(content: string, _filePath: string): Goal | null {
    const { frontmatter, content: body } = parseFrontmatter<GoalFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    // Extract title from first heading
    const lines = body.split("\n");
    let title = "Untitled Goal";
    let descriptionStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        descriptionStartIndex = i + 1;
        break;
      }
    }

    const description = lines.slice(descriptionStartIndex).join("\n").trim();

    return {
      id: frontmatter.id,
      title,
      description,
      type: frontmatter.type || "project",
      kpi: frontmatter.kpi || "",
      startDate: frontmatter.start || "",
      endDate: frontmatter.end || "",
      status: frontmatter.status || "planning",
    };
  }

  protected serializeItem(goal: Goal): string {
    const frontmatter: GoalFrontmatter = {
      id: goal.id,
      type: goal.type,
      kpi: goal.kpi,
      start: goal.startDate,
      end: goal.endDate,
      status: goal.status,
    };

    const body = `# ${goal.title}\n\n${goal.description || ""}`;

    return buildFileContent(frontmatter, body);
  }

  /**
   * Add a new goal.
   */
  async add(goal: Omit<Goal, "id">): Promise<Goal> {
    const newGoal: Goal = {
      ...goal,
      id: this.generateId("goal"),
    };
    await this.write(newGoal);
    return newGoal;
  }

  /**
   * Update an existing goal.
   */
  async update(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Goal = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
    };
    await this.write(updated);
    return updated;
  }
}
