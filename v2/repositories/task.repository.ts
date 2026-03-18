// Task repository — reads task markdown files from disk.
// Discovers board sections dynamically. Uses TaskBuilder for parsing.

import { join } from "@std/path";
import { parseFrontmatter } from "../utils/frontmatter.ts";
import { TaskBuilder } from "../builders/task.builder.ts";
import type { Task } from "../types/task.types.ts";

/**
 * Convert a directory name to a display section name.
 * e.g. "in_progress" → "In Progress", "todo" → "Todo"
 */
function dirToSection(dir: string): string {
  return dir
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export class TaskRepository {
  private boardDir: string;

  constructor(projectDir: string) {
    this.boardDir = join(projectDir, "board");
  }

  /**
   * Discover all section directories under board/.
   */
  private async discoverSections(): Promise<
    { dir: string; section: string }[]
  > {
    const sections: { dir: string; section: string }[] = [];
    try {
      for await (const entry of Deno.readDir(this.boardDir)) {
        if (entry.isDirectory) {
          sections.push({
            dir: entry.name,
            section: dirToSection(entry.name),
          });
        }
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return sections;
  }

  async findAll(): Promise<Task[]> {
    const sections = await this.discoverSections();
    const tasks: Task[] = [];

    for (const { dir, section } of sections) {
      const sectionPath = join(this.boardDir, dir);
      try {
        for await (const entry of Deno.readDir(sectionPath)) {
          if (!entry.isFile || !entry.name.endsWith(".md")) continue;
          const content = await Deno.readTextFile(
            join(sectionPath, entry.name),
          );
          const task = this.parse(content, section);
          if (task) tasks.push(task);
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) throw err;
      }
    }

    return tasks;
  }

  async findById(id: string): Promise<Task | null> {
    const all = await this.findAll();
    return all.find((t) => t.id === id) ?? null;
  }

  private parse(content: string, section: string): Task | null {
    const { frontmatter, body } = parseFrontmatter(content);
    return TaskBuilder.from(frontmatter, body, section).build();
  }
}
