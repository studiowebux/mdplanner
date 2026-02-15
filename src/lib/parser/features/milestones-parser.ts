/**
 * Milestones parser class for parsing and serializing milestone-related markdown.
 * Handles milestone CRUD operations and markdown conversion.
 */
import { Milestone, Task } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class MilestonesParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses milestones from the Milestones section in markdown.
   * Returns a Map of milestone name to Milestone object.
   */
  parseMilestonesSection(lines: string[]): Map<string, Milestone> {
    const milestoneMap = new Map<string, Milestone>();

    let inMilestonesSection = false;
    let currentMilestone: Partial<Milestone> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        line.startsWith("# Milestones") ||
        line.includes("<!-- Milestones -->")
      ) {
        inMilestonesSection = true;
        continue;
      }

      if (
        inMilestonesSection &&
        line.startsWith("# ") &&
        !line.startsWith("# Milestones")
      ) {
        if (currentMilestone?.name) {
          milestoneMap.set(
            currentMilestone.name,
            currentMilestone as Milestone,
          );
        }
        break;
      }

      if (!inMilestonesSection) continue;

      if (line.startsWith("## ")) {
        if (currentMilestone?.name) {
          milestoneMap.set(
            currentMilestone.name,
            currentMilestone as Milestone,
          );
        }
        const name = line.substring(3).trim();
        currentMilestone = {
          id: this.generateMilestoneId(name),
          name,
          status: "open",
        };
      } else if (currentMilestone) {
        if (line.startsWith("Target:")) {
          currentMilestone.target = line.substring(7).trim();
        } else if (line.startsWith("Status:")) {
          const status = line.substring(7).trim().toLowerCase();
          currentMilestone.status = status === "completed" ? "completed" : "open";
        } else if (line.trim() && !line.startsWith("<!--")) {
          currentMilestone.description =
            (currentMilestone.description || "") + line.trim() + " ";
        }
      }
    }

    if (currentMilestone?.name) {
      milestoneMap.set(currentMilestone.name, currentMilestone as Milestone);
    }

    return milestoneMap;
  }

  /**
   * Extracts milestones from task configurations.
   * Returns a Map of milestone name to Milestone object.
   */
  extractMilestonesFromTasks(
    tasks: Task[],
    existingMap: Map<string, Milestone> = new Map(),
  ): Map<string, Milestone> {
    const extractFromTasks = (taskList: Task[]) => {
      for (const task of taskList) {
        if (task.config.milestone && !existingMap.has(task.config.milestone)) {
          const name = task.config.milestone;
          existingMap.set(name, {
            id: this.generateMilestoneId(name),
            name,
            status: "open",
          });
        }
        if (task.children) extractFromTasks(task.children);
      }
    };
    extractFromTasks(tasks);
    return existingMap;
  }

  /**
   * Generates a milestone ID from the milestone name.
   */
  generateMilestoneId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Converts a milestone to markdown format.
   */
  milestoneToMarkdown(milestone: Milestone): string {
    let content = `## ${milestone.name}\n`;
    if (milestone.target) content += `Target: ${milestone.target}\n`;
    content += `Status: ${milestone.status}\n`;
    if (milestone.description) content += `${milestone.description.trim()}\n`;
    content += "\n";
    return content;
  }

  /**
   * Serializes all milestones to markdown format.
   */
  milestonesToMarkdown(milestones: Milestone[]): string {
    let content = "<!-- Milestones -->\n# Milestones\n\n";
    for (const milestone of milestones) {
      content += this.milestoneToMarkdown(milestone);
    }
    return content;
  }

  /**
   * Finds the Milestones section boundaries in the file lines.
   * Returns start and end indices, or -1 if not found.
   */
  findMilestonesSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Milestones -->") ||
          lines[i].startsWith("# Milestones"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Milestones")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Updates a milestone in the milestones array.
   * Returns the updated array and success status.
   */
  updateMilestoneInList(
    milestones: Milestone[],
    milestoneId: string,
    updates: Partial<Omit<Milestone, "id">>,
  ): { milestones: Milestone[]; success: boolean } {
    const index = milestones.findIndex((m) => m.id === milestoneId);

    if (index === -1) {
      return { milestones, success: false };
    }

    milestones[index] = {
      ...milestones[index],
      ...updates,
    };

    return { milestones, success: true };
  }

  /**
   * Deletes a milestone from the milestones array.
   * Returns the filtered array and success status.
   */
  deleteMilestoneFromList(
    milestones: Milestone[],
    milestoneId: string,
  ): { milestones: Milestone[]; success: boolean } {
    const originalLength = milestones.length;
    const filtered = milestones.filter((m) => m.id !== milestoneId);
    return {
      milestones: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new milestone with generated ID.
   */
  createMilestone(
    milestone: Omit<Milestone, "id">,
  ): Milestone {
    return {
      ...milestone,
      id: this.generateMilestoneId(milestone.name),
    };
  }
}
