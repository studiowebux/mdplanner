// Task repository — reads and writes task markdown files from disk or SQLite cache.
// Discovers board sections dynamically. Uses TaskBuilder for parsing.

import { join } from "@std/path";
import { log } from "../singletons/logger.ts";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import { buildFrontmatter, mergeFields } from "../utils/repo-helpers.ts";
import {
  mapKeysFromFm,
  mapKeysToFm,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
import { TaskBuilder } from "../builders/task.builder.ts";
import type { CreateTask, Task, UpdateTask } from "../types/task.types.ts";
import type { CacheDatabase, QueryResult } from "../database/sqlite/mod.ts";
import { rowToTask } from "../domains/task/cache.ts";
import {
  TASK_BODY_KEYS,
  TASK_FM_OVERRIDES,
  TASK_TABLE,
} from "../domains/task/constants.ts";

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

/** Persists Task entities as markdown with a SQLite cache mirror; standalone (not BaseMarkdownRepository) with disk/cache split reads, soft-delete, and section moves (moveToSection). */
export class TaskRepository {
  private boardDir: string;
  private archiveDir: string;
  private writer = new SafeWriter();
  private cacheDb: CacheDatabase | null = null;
  // Set after archive/restore/hardDelete so the next list read bypasses the
  // (now-stale) cache and falls through to disk. Cleared by `markClean`,
  // wired to `EntityDef.onSyncComplete` in registerTaskEntity. Matches the
  // standalone-repo soft-delete pattern (Portfolio reference).
  private listDirty = false;

  constructor(projectDir: string) {
    this.boardDir = join(projectDir, "board");
    this.archiveDir = join(projectDir, "archive");
  }

  /**
   * Discover all monthly archive directories under archive/ (each holds the
   * board-archived Done tasks swept into that YYYY-MM). Mirror of
   * discoverSections but for the archive tree, which is NOT a board section.
   */
  private async discoverArchiveMonths(): Promise<string[]> {
    const months: string[] = [];
    try {
      for await (const entry of Deno.readDir(this.archiveDir)) {
        if (entry.isDirectory) months.push(entry.name);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return months;
  }

  /**
   * Disk-walk of board-archived tasks (archive/YYYY-MM/*.md). The board
   * section is read from frontmatter (the directory is the month, not the
   * section). These are kept in the cache → search + analytics, but excluded
   * from the active board by findAll.
   */
  async findBoardArchived(): Promise<Task[]> {
    const months = await this.discoverArchiveMonths();
    const tasks: Task[] = [];
    for (const month of months) {
      const monthPath = join(this.archiveDir, month);
      try {
        for await (const entry of Deno.readDir(monthPath)) {
          if (!entry.isFile || !entry.name.endsWith(".md")) continue;
          const content = await Deno.readTextFile(join(monthPath, entry.name));
          const { frontmatter } = parseFrontmatter(content);
          const section = (frontmatter.section as string) ?? "Done";
          const task = this.parse(content, section);
          if (task) {
            task.boardArchived = true;
            task.archivedMonth = (frontmatter.archived_month as string) ??
              month;
            tasks.push(task);
          }
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) throw err;
      }
    }
    return tasks;
  }

  /** Board tasks plus board-archived tasks — the full cache source so archived
   * months stay searchable + counted in analytics. */
  async findAllForCache(): Promise<Task[]> {
    const [board, archived] = await Promise.all([
      this.findAllFromDisk(),
      this.findBoardArchived(),
    ]);
    return [...board, ...archived];
  }

  setCacheDb(db: CacheDatabase): void {
    this.cacheDb = db;
  }

  /** Called by EntityDef.onSyncComplete after fullSync — re-enables list cache. */
  markClean(): void {
    this.listDirty = false;
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
    if (this.cacheDb && !this.listDirty) {
      try {
        const count = this.cacheDb.count(TASK_TABLE);
        if (count > 0) {
          return this.cacheDb.query<QueryResult>(
            `SELECT * FROM "${TASK_TABLE}"
             WHERE (archived IS NULL OR archived = 0)
               AND (board_archived IS NULL OR board_archived = 0)`,
          ).map(rowToTask);
        }
      } catch (err) {
        log.warn("[cache] tasks read failed, falling back to disk:", err);
      }
    }
    return this.findAllFromDisk();
  }

  /** Always read from disk — used by cache sync. Archived tasks are excluded;
   * `findArchived` returns them separately. */
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
          if (task && task.archived !== true) tasks.push(task);
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) throw err;
      }
    }

    return tasks;
  }

  /** Disk-walk of archived tasks only. Mirror of `findAllFromDisk`. */
  async findArchived(): Promise<Task[]> {
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
          if (task && task.archived === true) tasks.push(task);
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
        const row = this.cacheDb.queryOne<QueryResult>(
          `SELECT * FROM "${TASK_TABLE}" WHERE id = ?`,
          [id],
        );
        if (row) return rowToTask(row);
      } catch (err) {
        log.warn("[cache] tasks read failed, falling back to disk:", err);
      }
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
    const fm = mapKeysToFm({
      id,
      completed: false,
      ...stampAuditFields(now),
      revision: 1,
      ...buildFrontmatter(rest as Record<string, unknown>, []),
    });

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
      ...stampAuditFields(now),
      revision: 1,
      section: dirToSection(dir),
      ...rest,
      ...(description?.length ? { description } : {}),
    } as Task;
  }

  async update(id: string, data: UpdateTask): Promise<Task | null> {
    // Resolve + write inside the per-id lock so a concurrent hardDelete cannot
    // remove the file between our read and our write (which would resurrect the
    // deleted task — possibly at a new section path on a section move). Mirrors
    // hardDelete, which already resolves inside its own writer.write.
    return this.writer.write(id, async () => {
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

      const fm = mapKeysToFm(
        buildFrontmatter(updated, TASK_BODY_KEYS),
      );
      const body = this.toBody(updated);
      await atomicWrite(targetFile, serializeFrontmatter(fm, body));
      if (targetFile !== file) {
        try {
          await Deno.remove(file);
        } catch (err) {
          if (!(err instanceof Deno.errors.NotFound)) throw err;
        }
      }

      return updated;
    });
  }

  /** Default delete = soft delete (archive). Hard removal requires an
   * explicit `hardDelete(id)` call. See
   * `[architecture] MD Planner — Soft-delete (archive) pattern`. */
  async delete(id: string): Promise<boolean> {
    return this.archive(id);
  }

  /**
   * Soft-delete: flip `archived` to true and stamp `archived_at` /
   * `archived_by` directly into the file's frontmatter. Bypasses the normal
   * update path so archive state round-trips without touching the body
   * serializer. Mirrors the standalone-repo pattern in PortfolioRepository.
   */
  async archive(id: string, by?: string): Promise<boolean> {
    const ok = await this.writer.write(id, async () => {
      const found = await this.findRawFileById(id);
      if (!found) return false;
      const now = new Date().toISOString();
      const fm = { ...found.frontmatter };
      fm.archived = true;
      fm.archived_at = now;
      if (by !== undefined) fm.archived_by = by;
      fm.updated_at = now;
      await atomicWrite(found.filePath, serializeFrontmatter(fm, found.body));
      return true;
    });
    if (ok) this.invalidate(id);
    return ok;
  }

  /** Restore an archived task: drop the three archive frontmatter fields. */
  async restore(id: string): Promise<boolean> {
    const ok = await this.writer.write(id, async () => {
      const found = await this.findRawFileById(id);
      if (!found) return false;
      const fm = { ...found.frontmatter };
      delete fm.archived;
      delete fm.archived_at;
      delete fm.archived_by;
      fm.updated_at = new Date().toISOString();
      await atomicWrite(found.filePath, serializeFrontmatter(fm, found.body));
      return true;
    });
    if (ok) this.invalidate(id);
    return ok;
  }

  /**
   * Sweep a Done task into the monthly archive: move its file from
   * board/<section>/ to archive/<YYYY-MM>/ and stamp `board_archived` +
   * `archived_month` + the original `section` into frontmatter (the dir is the
   * month, so section must be persisted for restore + parse). Distinct from
   * `archive` (soft-delete): board_archived tasks stay in search + analytics.
   * `month` defaults to the task's completion month.
   */
  async boardArchive(id: string, month?: string): Promise<boolean> {
    const ok = await this.writer.write(id, async () => {
      const found = await this.findRawFileById(id);
      if (!found) return false;
      const fm = { ...found.frontmatter };
      const completedAt = (fm.completed_at as string) ??
        new Date().toISOString();
      const archiveMonth = month ?? completedAt.slice(0, 7);
      // Persist the board section so restore + parse know where it belongs.
      if (fm.section === undefined) fm.section = found.section;
      fm.board_archived = true;
      fm.archived_month = archiveMonth;
      fm.updated_at = new Date().toISOString();
      const monthPath = join(this.archiveDir, archiveMonth);
      await Deno.mkdir(monthPath, { recursive: true });
      const target = join(monthPath, `${id}.md`);
      await atomicWrite(target, serializeFrontmatter(fm, found.body));
      if (target !== found.filePath) {
        try {
          await Deno.remove(found.filePath);
        } catch (err) {
          if (!(err instanceof Deno.errors.NotFound)) throw err;
        }
      }
      return true;
    });
    if (ok) this.invalidate(id);
    return ok;
  }

  /**
   * Restore a board-archived task to the active board: move its file back to
   * board/<section>/ and drop `board_archived` + `archived_month`. Section is
   * read from the persisted frontmatter (falls back to Done).
   */
  async boardRestore(id: string): Promise<boolean> {
    const ok = await this.writer.write(id, async () => {
      const found = await this.findRawFileById(id);
      if (!found) return false;
      const fm = { ...found.frontmatter };
      const section = (fm.section as string) ?? "Done";
      delete fm.board_archived;
      delete fm.archived_month;
      fm.updated_at = new Date().toISOString();
      const sectionPath = join(this.boardDir, sectionToDir(section));
      await Deno.mkdir(sectionPath, { recursive: true });
      const target = join(sectionPath, `${id}.md`);
      await atomicWrite(target, serializeFrontmatter(fm, found.body));
      if (target !== found.filePath) {
        try {
          await Deno.remove(found.filePath);
        } catch (err) {
          if (!(err instanceof Deno.errors.NotFound)) throw err;
        }
      }
      return true;
    });
    if (ok) this.invalidate(id);
    return ok;
  }

  /** Permanent delete — removes the file from disk. No recovery. */
  async hardDelete(id: string): Promise<boolean> {
    const ok = await this.writer.write(id, async () => {
      const { file } = await this.findFileById(id);
      if (!file) return false;
      try {
        await Deno.remove(file);
        return true;
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) return false;
        throw err;
      }
    });
    if (ok) this.invalidate(id);
    return ok;
  }

  /** Evict the row from the cache and mark the list cache stale. Called by
   * archive/restore/hardDelete since those paths skip TaskService's
   * cacheUpsert. */
  private invalidate(id: string): void {
    this.listDirty = true;
    if (!this.cacheDb) return;
    try {
      this.cacheDb.execute(
        `DELETE FROM "${TASK_TABLE}" WHERE id = ?`,
        [id],
      );
    } catch (err) {
      log.error(`[cache] failed to remove task/${id}:`, err);
    }
  }

  /**
   * Scan one directory for the first `.md` file whose parsed content `handle`
   * accepts (returns non-null). Swallows a missing directory (NotFound) and
   * rethrows anything else — the shared inner loop for both id-resolvers.
   */
  private async scanDirForId<T>(
    dirPath: string,
    handle: (filePath: string, content: string) => T | null,
  ): Promise<T | null> {
    try {
      for await (const entry of Deno.readDir(dirPath)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const filePath = join(dirPath, entry.name);
        const content = await Deno.readTextFile(filePath);
        const result = handle(filePath, content);
        if (result !== null) return result;
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return null;
  }

  /**
   * Walk every task file — board sections first, then the monthly archive
   * tree — returning the first match. `onBoard`/`onArchive` receive the file's
   * path + content plus the section/month context for that dir.
   */
  private async walkBoardThenArchive<T>(
    onBoard: (
      filePath: string,
      content: string,
      section: string,
      dir: string,
    ) => T | null,
    onArchive: (filePath: string, content: string, month: string) => T | null,
  ): Promise<T | null> {
    for (const { dir, section } of await this.discoverSections()) {
      const found = await this.scanDirForId(
        join(this.boardDir, dir),
        (filePath, content) => onBoard(filePath, content, section, dir),
      );
      if (found !== null) return found;
    }
    for (const month of await this.discoverArchiveMonths()) {
      const found = await this.scanDirForId(
        join(this.archiveDir, month),
        (filePath, content) => onArchive(filePath, content, month),
      );
      if (found !== null) return found;
    }
    return null;
  }

  /** Read+parse a single task file by path; null when the file is absent. */
  private async readTaskFile(
    filePath: string,
    section: string,
  ): Promise<Task | null> {
    try {
      return this.parse(await Deno.readTextFile(filePath), section);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return null;
      throw err;
    }
  }

  /**
   * Locate a task file by id and return its raw frontmatter + body. Used by
   * `archive`/`restore` so they can mutate frontmatter without rebuilding
   * the body via the normal update path.
   */
  private findRawFileById(
    id: string,
  ): Promise<
    {
      frontmatter: Record<string, unknown>;
      body: string;
      filePath: string;
      section: string;
    } | null
  > {
    const match = (filePath: string, content: string, section: string) => {
      const parsed = parseFrontmatter(content);
      if (parsed.frontmatter.id !== id) return null;
      return { ...parsed, filePath, section };
    };
    return this.walkBoardThenArchive(
      match,
      (filePath, content, month) => {
        const parsed = parseFrontmatter(content);
        const section = (parsed.frontmatter.section as string) ?? "Done";
        return match(filePath, content, section);
      },
    );
  }

  async moveToSection(id: string, newSection: string): Promise<Task | null> {
    return this.update(id, { section: newSection });
  }

  /**
   * Cache fast-path for `findFileById`: the cache knows the task's section, so
   * resolve the file directly (`${id}.md`) instead of scanning every dir.
   * Returns null on any miss/stale row/error so the caller falls through to the
   * full scan — turns the O(N) resolve into O(1) for every update.
   */
  private async resolveFromCache(
    id: string,
  ): Promise<
    { file: string; task: Task; sectionDir: string | null } | null
  > {
    if (!this.cacheDb) return null;
    try {
      const row = this.cacheDb.queryOne<QueryResult>(
        `SELECT * FROM "${TASK_TABLE}" WHERE id = ?`,
        [id],
      );
      if (!row) return null;
      const cached = rowToTask(row);
      // Board-archived tasks live in archive/<month>/, not board/<section>/.
      if (cached.boardArchived && cached.archivedMonth) {
        const filePath = join(
          this.archiveDir,
          cached.archivedMonth,
          `${id}.md`,
        );
        const task = await this.readTaskFile(
          filePath,
          cached.section ?? "Done",
        );
        if (task?.id === id) {
          task.boardArchived = true;
          task.archivedMonth = cached.archivedMonth;
          return { file: filePath, task, sectionDir: null };
        }
      } else if (cached.section) {
        const dir = sectionToDir(cached.section);
        const filePath = join(this.boardDir, dir, `${id}.md`);
        const task = await this.readTaskFile(filePath, cached.section);
        if (task?.id === id) return { file: filePath, task, sectionDir: dir };
      }
    } catch (err) {
      log.warn("[cache] findFileById fast-path failed, scanning:", err);
    }
    return null;
  }

  private async findFileById(
    id: string,
  ): Promise<
    { file: string | null; task: Task | null; sectionDir: string | null }
  > {
    const cached = await this.resolveFromCache(id);
    if (cached) return cached;

    const found = await this.walkBoardThenArchive<
      { file: string; task: Task; sectionDir: string | null }
    >(
      (filePath, content, section, dir) => {
        const task = this.parse(content, section);
        return task?.id === id
          ? { file: filePath, task, sectionDir: dir }
          : null;
      },
      (filePath, content, month) => {
        const { frontmatter } = parseFrontmatter(content);
        const section = (frontmatter.section as string) ?? "Done";
        const task = this.parse(content, section);
        if (task?.id !== id) return null;
        task.boardArchived = true;
        task.archivedMonth = (frontmatter.archived_month as string) ?? month;
        return { file: filePath, task, sectionDir: null };
      },
    );
    return found ?? { file: null, task: null, sectionDir: null };
  }

  private parse(content: string, section: string): Task | null {
    const { frontmatter, body } = parseFrontmatter(content);
    const fm = mapKeysFromFm(frontmatter, TASK_FM_OVERRIDES);
    return TaskBuilder.from(fm, body, section).build();
  }

  async upsertEntity(task: Task): Promise<Task> {
    const dir = sectionToDir(task.section ?? "Todo");
    const sectionPath = join(this.boardDir, dir);
    await Deno.mkdir(sectionPath, { recursive: true });
    const fm = mapKeysToFm(
      buildFrontmatter(task, TASK_BODY_KEYS),
    );
    const body = this.toBody(task);
    const filePath = join(sectionPath, `${task.id}.md`);
    await this.writer.write(
      task.id,
      () => atomicWrite(filePath, serializeFrontmatter(fm, body)),
    );
    return task;
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
