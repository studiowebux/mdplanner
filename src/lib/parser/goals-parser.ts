/**
 * Goals parser class for parsing and serializing goal-related markdown.
 * Handles goal CRUD operations and markdown conversion.
 */
import { Goal } from "../types.ts";
import { BaseParser } from "./core.ts";

export class GoalsParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses the goals section from markdown lines starting at the given index.
   * Returns the parsed goals and the next line index to process.
   */
  parseGoalsSection(
    lines: string[],
    startIndex: number,
  ): { goals: Goal[]; nextIndex: number } {
    const goals: Goal[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Stop at next major section
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        break;
      }

      // Parse goal (## Goal Title {type: enterprise; kpi: 30% revenue; start: 2024-01-01; end: 2024-12-31; status: on-track})
      if (line.startsWith("## ")) {
        const goalMatch = line.match(/^## (.+?)\s*\{(.+)\}$/);
        if (goalMatch) {
          const [, title, configStr] = goalMatch;
          const goalDescription: string[] = [];
          i++;

          // Collect goal description until next ## or # or boundary comment
          while (i < lines.length) {
            const contentLine = lines[i];
            const trimmedLine = contentLine.trim();

            // Stop at next goal, section, or section boundary comment (but NOT id comments)
            if (
              trimmedLine.startsWith("## ") ||
              trimmedLine.startsWith("# ") ||
              (trimmedLine.match(/^<!--\s*[A-Z]/) && !trimmedLine.includes("id:"))
            ) {
              break;
            }

            if (trimmedLine) {
              goalDescription.push(trimmedLine);
            }
            i++;
          }

          // Check for existing ID in comment format <!-- id: goal_xxx -->
          let goalId = this.generateGoalId();
          let actualDescription = goalDescription.join("\n");

          const idMatch = actualDescription.match(/<!-- id: (goal_\d+) -->/);
          if (idMatch) {
            goalId = idMatch[1];
            // Remove the ID comment from description
            actualDescription = actualDescription.replace(
              /<!-- id: goal_\d+ -->\s*/,
              "",
            ).trim();
          }

          // Parse goal config
          const goal: Goal = {
            id: goalId,
            title,
            description: actualDescription,
            type: "project",
            kpi: "",
            startDate: "",
            endDate: "",
            status: "planning",
          };

          // Parse config string
          const configPairs = configStr.split(";");
          for (const pair of configPairs) {
            const [key, value] = pair.split(":").map((s) => s.trim());
            if (key && value) {
              switch (key) {
                case "type":
                  goal.type = value as "enterprise" | "project";
                  break;
                case "kpi":
                  goal.kpi = value;
                  break;
                case "start":
                  goal.startDate = value;
                  break;
                case "end":
                  goal.endDate = value;
                  break;
                case "status":
                  goal.status = value as Goal["status"];
                  break;
              }
            }
          }

          goals.push(goal);
          continue;
        }
      }

      i++;
    }

    return { goals, nextIndex: i };
  }

  /**
   * Generates the next goal ID based on existing goals in the file.
   */
  generateGoalId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const goalIdMatches = content.match(/<!-- id: goal_(\d+) -->/g) || [];
      const maxId = Math.max(
        0,
        ...goalIdMatches.map((match) => {
          const idMatch = match.match(/goal_(\d+)/);
          return idMatch ? parseInt(idMatch[1]) : 0;
        }),
      );
      return `goal_${maxId + 1}`;
    } catch {
      return "goal_1";
    }
  }

  /**
   * Converts a goal to markdown format.
   */
  goalToMarkdown(goal: Goal): string {
    let content =
      `## ${goal.title} {type: ${goal.type}; kpi: ${goal.kpi}; start: ${goal.startDate}; end: ${goal.endDate}; status: ${goal.status}}\n\n`;
    content += `<!-- id: ${goal.id} -->\n`;
    if (goal.description && goal.description.trim()) {
      // Remove any embedded HTML comments from description
      const cleanDescription = goal.description.replace(/<!--[\s\S]*?-->/g, "").trim();
      if (cleanDescription) {
        content += `${cleanDescription}\n\n`;
      } else {
        content += `\n`;
      }
    } else {
      content += `\n`;
    }
    return content;
  }

  /**
   * Serializes all goals to markdown format.
   */
  goalsToMarkdown(goals: Goal[]): string {
    let content = "<!-- Goals -->\n# Goals\n\n";
    for (const goal of goals) {
      content += this.goalToMarkdown(goal);
    }
    return content;
  }

  /**
   * Updates a goal in the goals array.
   * Returns the updated array and success status.
   */
  updateGoalInList(
    goals: Goal[],
    goalId: string,
    updates: Partial<Omit<Goal, "id">>,
  ): { goals: Goal[]; success: boolean } {
    const goalIndex = goals.findIndex((goal) => goal.id === goalId);

    if (goalIndex === -1) {
      return { goals, success: false };
    }

    goals[goalIndex] = {
      ...goals[goalIndex],
      ...updates,
    };

    return { goals, success: true };
  }

  /**
   * Deletes a goal from the goals array.
   * Returns the filtered array and success status.
   */
  deleteGoalFromList(
    goals: Goal[],
    goalId: string,
  ): { goals: Goal[]; success: boolean } {
    const originalLength = goals.length;
    const filtered = goals.filter((goal) => goal.id !== goalId);
    return {
      goals: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new goal with generated ID.
   */
  createGoal(goal: Omit<Goal, "id">): Goal {
    return {
      ...goal,
      id: this.generateGoalId(),
    };
  }

  /**
   * Finds the Goals section boundaries in the file.
   * Returns startIndex (line with marker) and endIndex (line of next section).
   */
  findGoalsSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    // Known section boundary patterns
    const sectionBoundaryPattern = /^<!-- (Notes|Canvas|Mindmap|C4 Architecture|Board|Configurations|Milestones|Ideas|Retrospectives|SWOT Analysis|Risk Analysis|Lean Canvas|Business Model|Project Value Board|Brief|Time Tracking|Capacity Planning|Strategic Levels|Billing|Customers|Billing Rates|Quotes|Invoices|Companies|Contacts|Deals|Interactions) -->$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (startIndex === -1) {
        if (line === "<!-- Goals -->" || line === "# Goals") {
          startIndex = line === "<!-- Goals -->" ? i : i;
          // If we found "# Goals", check if there's a comment before it
          if (line === "# Goals" && i > 0 && lines[i - 1].trim() === "<!-- Goals -->") {
            startIndex = i - 1;
          }
        }
      } else {
        // Look for the next section - must be a known section boundary
        if (sectionBoundaryPattern.test(line)) {
          endIndex = i;
          break;
        }
        // Also check for # headers that are sections (not ## which are goals)
        if (line.startsWith("# ") && !line.startsWith("## ") && line !== "# Goals") {
          endIndex = i;
          break;
        }
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Reads all goals from the file using section-specific parsing.
   */
  async readGoals(): Promise<Goal[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    const { startIndex } = this.findGoalsSection(lines);

    if (startIndex === -1) {
      return [];
    }

    // Find the first ## header after the section start
    let parseStart = startIndex;
    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].trim().startsWith("## ")) {
        parseStart = i;
        break;
      }
    }

    const result = this.parseGoalsSection(lines, parseStart);
    return result.goals;
  }

  /**
   * Saves goals by replacing only the Goals section in the file.
   * This preserves all other sections.
   */
  async saveGoals(goals: Goal[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.findGoalsSection(lines);
    const goalsContent = this.goalsToMarkdown(goals);

    if (startIndex === -1) {
      // No Goals section exists, find where to insert it
      // Insert before Canvas, Mindmap, or Board
      let insertIndex = lines.length;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (
          line === "<!-- Canvas -->" ||
          line === "# Canvas" ||
          line === "<!-- Mindmap -->" ||
          line === "# Mindmap" ||
          line === "<!-- Board -->" ||
          line === "# Board"
        ) {
          insertIndex = i;
          break;
        }
      }
      lines.splice(insertIndex, 0, goalsContent);
    } else {
      // Replace existing Goals section
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, goalsContent.trimEnd(), ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }
}
