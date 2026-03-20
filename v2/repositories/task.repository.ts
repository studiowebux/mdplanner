// Task repository — reads and writes task markdown files from disk or SQLite cache.
// Discovers board sections dynamically. Uses TaskBuilder for parsing.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import { buildFrontmatter, mergeFields } from "../utils/repo-helpers.ts";
import { TaskBuilder } from "../builders/task.builder.ts";
import type { CreateTask, Task, UpdateTask } from "../types/task.types.ts";
import type { CacheDatabase } from "../database/sqlite/mod.ts";
import { rowToTask } from "../domains/task/cache.ts";
import { TASK_BODY_KEYS, TASK_TABLE } from "../domains/task/constants.ts";

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

/**
 * Convert a display section name to a directory name.
 * e.g. "In Progress" → "in_progress", "Todo" → "todo"
 */
function sectionToDir(section: string): string {
  return section.toLowerCase().replace(/\s+/g, "_");
}

export class TaskRepository {
  private boardDir: string;
  private writer = new SafeWriter();
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
    const { task } = await this.findFileById(id);
    return task;
  }

  async create(data: CreateTask): Promise<Task> {
    const section = data.section ?? "Todo";
    const dir = sectionToDir(section);
    const sectionPath = join(this.boardDir, dir);
    await Deno.mkdir(sectionPath, { recursive: true });

    const id = generateId("task");
    const now = new Date().toISOString();

    const { title, section: _sec, description, ...rest } = data;
    const fm = {
      id,
      completed: false,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      ...buildFrontmatter(rest as Record<string, unknown>, []),
    };

    const descBody = description?.join("\n") ?? "";
    const body = `# ${title}\n\n${descBody}`.trimEnd();
    const filePath = join(sectionPath, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, serializeFrontmatter(fm, body)),
    );

    return {
      id,
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      section: dirToSection(dir),
      ...rest,
      ...(description?.length ? { description } : {}),
    } as Task;
  }

  async update(id: string, data: UpdateTask): Promise<Task | null> {
    const { file, task } = await this.findFileById(id);
    if (!file || !task) return null;

    const now = new Date().toISOString();

    // Extract special-case fields before generic merge
    const { completed, section, ...simpleFields } = data;

    const updated: Task = mergeFields(
      { ...task, updatedAt: now, revision: (task.revision ?? 1) + 1 },
      simpleFields as Record<string, unknown>,
    );

    // Special case: completed triggers completedAt
    if (completed !== undefined) {
      updated.completed = completed;
      if (completed && !task.completed) {
        updated.completedAt = now;
      } else if (!completed) {
        updated.completedAt = undefined;
      }
    }

    // Special case: section change triggers file move
    let targetFile = file;
    if (section !== undefined && section !== task.section) {
      updated.section = section;
      const newDir = sectionToDir(section);
      const newSectionPath = join(this.boardDir, newDir);
      await Deno.mkdir(newSectionPath, { recursive: true });
      targetFile = join(newSectionPath, `${id}.md`);
    }

    const fm = buildFrontmatter(
      updated as unknown as Record<string, unknown>,
      TASK_BODY_KEYS,
    );
    const body = this.toBody(updated);
    await this.writer.write(
      id,
      async () => {
        await atomicWrite(targetFile, serializeFrontmatter(fm, body));
        if (targetFile !== file) {
          try {
            await Deno.remove(file);
          } catch (err) {
            if (!(err instanceof Deno.errors.NotFound)) throw err;
          }
        }
      },
    );

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { file } = await this.findFileById(id);
    if (!file) return false;
    await Deno.remove(file);
    return true;
  }

  async moveToSection(id: string, newSection: string): Promise<Task | null> {
    return this.update(id, { section: newSection });
  }

  private async findFileById(
    id: string,
  ): Promise<{ file: string | null; task: Task | null; sectionDir: string | null }> {
    const sections = await this.discoverSections();
    for (const { dir, section } of sections) {
      const sectionPath = join(this.boardDir, dir);
      try {
        for await (const entry of Deno.readDir(sectionPath)) {
          if (!entry.isFile || !entry.name.endsWith(".md")) continue;
          const filePath = join(sectionPath, entry.name);
          const content = await Deno.readTextFile(filePath);
          const task = this.parse(content, section);
          if (task?.id === id) return { file: filePath, task, sectionDir: dir };
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) throw err;
      }
    }
    return { file: null, task: null, sectionDir: null };
  }

  private parse(content: string, section: string): Task | null {
    const { frontmatter, body } = parseFrontmatter(content);
    return TaskBuilder.from(frontmatter, body, section).build();
  }

  private toBody(t: Task): string {
    const parts: string[] = [`# ${t.title}`];
    if (t.description?.length) {
      parts.push("", t.description.join("\n"));
    }
    if (t.children?.length) {
      parts.push("", "## Subtasks");
      for (const child of t.children) {
        const check = child.completed ? "x" : " ";
        parts.push(`- [${check}] (${child.id}) ${child.title}`);
      }
    }
    return parts.join("\n").trimEnd();
  }
}
