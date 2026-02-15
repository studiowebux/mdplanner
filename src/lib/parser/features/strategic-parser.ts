/**
 * Strategic Levels parser class for parsing and serializing strategic levels markdown.
 * Handles Vision, Mission, Goals, Objectives, Strategies, and Tactics.
 */
import {
  StrategicLevel,
  StrategicLevelsBuilder,
  StrategicLevelType,
  STRATEGIC_LEVEL_ORDER,
} from "../../types.ts";
import { BaseParser } from "../core.ts";

export class StrategicParser extends BaseParser {
  private levelHeaderMap: Record<string, StrategicLevelType> = {
    "### Vision": "vision",
    "### Mission": "mission",
    "### Goals": "goals",
    "### Objectives": "objectives",
    "### Strategies": "strategies",
    "### Tactics": "tactics",
  };

  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses Strategic Levels Builders from the Strategic Levels section in markdown.
   */
  parseStrategicSection(lines: string[]): StrategicLevelsBuilder[] {
    const builders: StrategicLevelsBuilder[] = [];

    let inSection = false;
    let currentBuilder: Partial<StrategicLevelsBuilder> | null = null;
    let currentLevel: Partial<StrategicLevel> | null = null;
    let currentLevelType: StrategicLevelType | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.includes("<!-- Strategic Levels -->") || trimmed === "# Strategic Levels") {
        inSection = true;
        continue;
      }

      if (inSection && trimmed.startsWith("# ") && !trimmed.startsWith("# Strategic Levels")) {
        if (currentLevel?.title && currentBuilder) {
          currentBuilder.levels?.push(currentLevel as StrategicLevel);
          currentLevel = null;
        }
        if (currentBuilder?.title) {
          builders.push(currentBuilder as StrategicLevelsBuilder);
          currentBuilder = null;
        }
        break;
      }

      if (!inSection) continue;

      if (trimmed.startsWith("## ")) {
        if (currentLevel?.title && currentBuilder) {
          currentBuilder.levels?.push(currentLevel as StrategicLevel);
          currentLevel = null;
        }
        if (currentBuilder?.title) builders.push(currentBuilder as StrategicLevelsBuilder);

        currentBuilder = {
          id: this.generateStrategicId(),
          title: trimmed.substring(3).trim(),
          date: new Date().toISOString().split("T")[0],
          levels: [],
        };
        currentLevelType = null;
        continue;
      }

      if (!currentBuilder) continue;

      const idMatch = trimmed.match(/<!--\s*id:\s*([^\s]+)\s*-->/);
      if (idMatch) {
        currentBuilder.id = idMatch[1];
        continue;
      }

      if (trimmed.startsWith("Date:")) {
        currentBuilder.date = trimmed.substring(5).trim();
        continue;
      }

      for (const [header, levelType] of Object.entries(this.levelHeaderMap)) {
        if (trimmed.startsWith(header)) {
          if (currentLevel?.title && currentBuilder) {
            currentBuilder.levels?.push(currentLevel as StrategicLevel);
            currentLevel = null;
          }
          currentLevelType = levelType;
          break;
        }
      }

      if (currentLevelType && trimmed.startsWith("- ")) {
        if (currentLevel?.title && currentBuilder) {
          currentBuilder.levels?.push(currentLevel as StrategicLevel);
        }

        const levelText = trimmed.substring(2).trim();
        currentLevel = {
          id: this.generateLevelId(),
          title: levelText,
          level: currentLevelType,
          order: (currentBuilder.levels?.filter(l => l.level === currentLevelType).length || 0),
          linkedTasks: [],
          linkedMilestones: [],
        };
        continue;
      }

      if (currentLevel) {
        const levelIdMatch = trimmed.match(/<!--\s*level-id:\s*([^,\s]+)(?:,\s*parent:\s*([^\s]+))?\s*-->/);
        if (levelIdMatch) {
          currentLevel.id = levelIdMatch[1];
          if (levelIdMatch[2]) {
            currentLevel.parentId = levelIdMatch[2];
          }
          continue;
        }

        const linkedTasksMatch = trimmed.match(/<!--\s*linked-tasks:\s*([^\s]+)\s*-->/);
        if (linkedTasksMatch) {
          currentLevel.linkedTasks = linkedTasksMatch[1].split(",").map(t => t.trim()).filter(Boolean);
          continue;
        }

        const linkedMilestonesMatch = trimmed.match(/<!--\s*linked-milestones:\s*([^\s]+)\s*-->/);
        if (linkedMilestonesMatch) {
          currentLevel.linkedMilestones = linkedMilestonesMatch[1].split(",").map(m => m.trim()).filter(Boolean);
          continue;
        }

        if (trimmed && !trimmed.startsWith("<!--") && !trimmed.startsWith("-") && !trimmed.startsWith("#") && !trimmed.startsWith("Date:")) {
          if (!currentLevel.description) {
            currentLevel.description = trimmed;
          } else {
            currentLevel.description += " " + trimmed;
          }
          continue;
        }
      }
    }

    if (currentLevel?.title && currentBuilder) {
      currentBuilder.levels?.push(currentLevel as StrategicLevel);
    }
    if (currentBuilder?.title) builders.push(currentBuilder as StrategicLevelsBuilder);

    return builders;
  }

  generateStrategicId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  generateLevelId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts a Strategic Levels Builder to markdown format.
   */
  strategicBuilderToMarkdown(builder: StrategicLevelsBuilder): string {
    let content = `## ${builder.title}\n`;
    content += `<!-- id: ${builder.id} -->\n`;
    content += `Date: ${builder.date}\n\n`;

    for (const levelType of STRATEGIC_LEVEL_ORDER) {
      const levelsOfType = builder.levels
        .filter(l => l.level === levelType)
        .sort((a, b) => a.order - b.order);

      if (levelsOfType.length === 0) continue;

      const header = levelType.charAt(0).toUpperCase() + levelType.slice(1);
      content += `### ${header}\n`;

      for (const level of levelsOfType) {
        content += `- ${level.title}\n`;

        let metadata = `level-id: ${level.id}`;
        if (level.parentId) {
          metadata += `, parent: ${level.parentId}`;
        }
        content += `<!-- ${metadata} -->\n`;

        if (level.description) {
          content += `${level.description}\n`;
        }

        if (level.linkedTasks && level.linkedTasks.length > 0) {
          content += `<!-- linked-tasks: ${level.linkedTasks.join(",")} -->\n`;
        }

        if (level.linkedMilestones && level.linkedMilestones.length > 0) {
          content += `<!-- linked-milestones: ${level.linkedMilestones.join(",")} -->\n`;
        }
      }
      content += "\n";
    }

    return content;
  }

  /**
   * Serializes all Strategic Levels Builders to markdown format.
   */
  strategicBuildersToMarkdown(builders: StrategicLevelsBuilder[]): string {
    let content = "<!-- Strategic Levels -->\n# Strategic Levels\n\n";
    for (const builder of builders) {
      content += this.strategicBuilderToMarkdown(builder);
    }
    return content;
  }

  /**
   * Finds the Strategic Levels section boundaries in the file lines.
   */
  findStrategicSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Strategic Levels -->") ||
          lines[i].trim() === "# Strategic Levels")
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].trim().startsWith("# ") &&
        !lines[i].trim().startsWith("# Strategic Levels")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  updateStrategicInList(
    builders: StrategicLevelsBuilder[],
    builderId: string,
    updates: Partial<Omit<StrategicLevelsBuilder, "id">>,
  ): { builders: StrategicLevelsBuilder[]; success: boolean } {
    const index = builders.findIndex((b) => b.id === builderId);
    if (index === -1) {
      return { builders, success: false };
    }
    builders[index] = { ...builders[index], ...updates };
    return { builders, success: true };
  }

  deleteStrategicFromList(
    builders: StrategicLevelsBuilder[],
    builderId: string,
  ): { builders: StrategicLevelsBuilder[]; success: boolean } {
    const originalLength = builders.length;
    const filtered = builders.filter((b) => b.id !== builderId);
    return {
      builders: filtered,
      success: filtered.length !== originalLength,
    };
  }

  createStrategicBuilder(builder: Omit<StrategicLevelsBuilder, "id">): StrategicLevelsBuilder {
    return {
      ...builder,
      id: this.generateStrategicId(),
    };
  }
}
