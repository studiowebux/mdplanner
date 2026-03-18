// Task repository — reads task markdown files from disk or SQLite cache.
// Discovers board sections dynamically. Uses TaskBuilder for parsing.

import { join } from "@std/path";
import { parseFrontmatter } from "../utils/frontmatter.ts";
import { TaskBuilder } from "../builders/task.builder.ts";
import type { Task } from "../types/task.types.ts";
import type { CacheDatabase } from "../database/sqlite/mod.ts";
import { rowToTask } from "../domains/task/cache.ts";
import { TASK_TABLE } from "../domains/task/constants.ts";

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
  private cacheDb: CacheDatabase | null = null;

  constructor(projectDir: string) {
    this.boardDir = join(projectDir, "board");
  }

  setCacheDb(db: CacheDatabase): void {
    this.cacheDb = db;
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
    if (this.cacheDb) {
      try {
        const count = this.cacheDb.count(TASK_TABLE);
        if (count > 0) {
          return this.cacheDb.query<Record<string, unknown>>(
            `SELECT * FROM "${TASK_TABLE}"`,
          ).map(rowToTask);
        }
      } catch { /* fall through to disk */ }
    }
    return this.findAllFromDisk();
  }

  /** Always read from disk — used by cache sync. */
  async findAllFromDisk(): Promise<Task[]> {
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
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${TASK_TABLE}" WHERE id = ?`,
          [id],
        );
        if (row) return rowToTask(row);
      } catch { /* fall through to disk */ }
    }
    const all = await this.findAllFromDisk();
    return all.find((t) => t.id === id) ?? null;
  }

  private parse(content: string, section: string): Task | null {
    const { frontmatter, body } = parseFrontmatter(content);
    return TaskBuilder.from(frontmatter, body, section).build();
  }
}
