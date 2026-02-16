/**
 * Directory-based parser for Strategic Levels Builder.
 * Each strategic levels builder is stored as a separate markdown file.
 * Levels are stored as nested hierarchical structures.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type {
  StrategicLevel,
  StrategicLevelsBuilder,
  StrategicLevelType,
} from "../../types.ts";

interface StrategicLevelsFrontmatter {
  id: string;
  date: string;
}

const LEVEL_ORDER: StrategicLevelType[] = [
  "vision",
  "mission",
  "goals",
  "objectives",
  "strategies",
  "tactics",
];

export class StrategicLevelsDirectoryParser
  extends DirectoryParser<StrategicLevelsBuilder> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "strategiclevels" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): StrategicLevelsBuilder | null {
    const { frontmatter, content: body } = parseFrontmatter<
      StrategicLevelsFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    const result: StrategicLevelsBuilder = {
      id: frontmatter.id,
      title: "Untitled Strategic Levels",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      levels: [],
    };

    let currentLevelType: StrategicLevelType | null = null;
    let order = 0;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        result.title = line.slice(2).trim();
        continue;
      }

      // Check for level type headers
      if (line.startsWith("## ")) {
        const headerText = line.slice(3).trim().toLowerCase();
        for (const levelType of LEVEL_ORDER) {
          if (headerText.includes(levelType)) {
            currentLevelType = levelType;
            break;
          }
        }
        continue;
      }

      // Parse level items: - (level_id) Title | description | parentId | linkedTasks | linkedMilestones
      if (currentLevelType) {
        const levelMatch = line.match(
          /^[-*]\s+\((\w+)\)\s+(.+?)(?:\s*\|\s*(.*))?$/,
        );
        if (levelMatch) {
          const parts = levelMatch[3]?.split("|").map((p) => p.trim()) || [];
          const description = parts[0] || undefined;
          const parentId = parts[1] || undefined;
          const linkedTasks = parts[2]
            ? parts[2].split(",").map((t) => t.trim()).filter(Boolean)
            : undefined;
          const linkedMilestones = parts[3]
            ? parts[3].split(",").map((m) => m.trim()).filter(Boolean)
            : undefined;

          result.levels.push({
            id: levelMatch[1],
            title: levelMatch[2].trim(),
            description,
            level: currentLevelType,
            parentId,
            order: order++,
            linkedTasks,
            linkedMilestones,
          });
        }
      }
    }

    return result;
  }

  protected serializeItem(builder: StrategicLevelsBuilder): string {
    const frontmatter: StrategicLevelsFrontmatter = {
      id: builder.id,
      date: builder.date,
    };

    const sections: string[] = [`# ${builder.title}`];

    // Group levels by type
    const levelsByType = new Map<StrategicLevelType, StrategicLevel[]>();
    for (const levelType of LEVEL_ORDER) {
      levelsByType.set(levelType, []);
    }
    for (const level of builder.levels) {
      levelsByType.get(level.level)?.push(level);
    }

    // Serialize each level type section
    for (const levelType of LEVEL_ORDER) {
      const levels = levelsByType.get(levelType) || [];
      if (levels.length > 0) {
        sections.push("");
        sections.push(
          `## ${levelType.charAt(0).toUpperCase() + levelType.slice(1)}`,
        );
        sections.push("");

        for (const level of levels.sort((a, b) => a.order - b.order)) {
          const parts: string[] = [];
          if (level.description) parts.push(level.description);
          if (level.parentId) parts.push(level.parentId);
          else if (parts.length > 0) parts.push("");
          if (level.linkedTasks?.length) {
            parts.push(level.linkedTasks.join(","));
          } else if (parts.length > 1) parts.push("");
          if (level.linkedMilestones?.length) {
            parts.push(level.linkedMilestones.join(","));
          }

          const suffix = parts.length > 0 ? ` | ${parts.join(" | ")}` : "";
          sections.push(`- (${level.id}) ${level.title}${suffix}`);
        }
      }
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async add(
    builder: Omit<StrategicLevelsBuilder, "id">,
  ): Promise<StrategicLevelsBuilder> {
    const newBuilder: StrategicLevelsBuilder = {
      ...builder,
      id: this.generateId("strategic"),
    };
    await this.write(newBuilder);
    return newBuilder;
  }

  async update(
    id: string,
    updates: Partial<StrategicLevelsBuilder>,
  ): Promise<StrategicLevelsBuilder | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: StrategicLevelsBuilder = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  async addLevel(
    builderId: string,
    level: Omit<StrategicLevel, "id" | "order">,
  ): Promise<StrategicLevelsBuilder | null> {
    const builder = await this.read(builderId);
    if (!builder) return null;

    const maxOrder = builder.levels.reduce(
      (max, l) => Math.max(max, l.order),
      -1,
    );
    const newLevel: StrategicLevel = {
      ...level,
      id: this.generateId("level"),
      order: maxOrder + 1,
    };
    builder.levels.push(newLevel);
    await this.write(builder);
    return builder;
  }

  async updateLevel(
    builderId: string,
    levelId: string,
    updates: Partial<StrategicLevel>,
  ): Promise<StrategicLevelsBuilder | null> {
    const builder = await this.read(builderId);
    if (!builder) return null;

    const levelIndex = builder.levels.findIndex((l) => l.id === levelId);
    if (levelIndex === -1) return null;

    builder.levels[levelIndex] = {
      ...builder.levels[levelIndex],
      ...updates,
      id: levelId,
    };
    await this.write(builder);
    return builder;
  }

  async removeLevel(
    builderId: string,
    levelId: string,
  ): Promise<StrategicLevelsBuilder | null> {
    const builder = await this.read(builderId);
    if (!builder) return null;

    // Also remove any levels that have this as parent
    builder.levels = builder.levels.filter((l) =>
      l.id !== levelId && l.parentId !== levelId
    );
    await this.write(builder);
    return builder;
  }

  async reorderLevel(
    builderId: string,
    levelId: string,
    newOrder: number,
  ): Promise<StrategicLevelsBuilder | null> {
    const builder = await this.read(builderId);
    if (!builder) return null;

    const levelIndex = builder.levels.findIndex((l) => l.id === levelId);
    if (levelIndex === -1) return null;

    builder.levels[levelIndex].order = newOrder;
    await this.write(builder);
    return builder;
  }
}
