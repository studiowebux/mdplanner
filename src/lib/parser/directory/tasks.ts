/**
 * Directory-based parser for Tasks.
 * Tasks are organized by section: board/{section_name}/{task_id}.md
 * Subtasks are stored inline in the parent task file.
 */
import { buildFileContent, parseFrontmatter } from "./base.ts";
import { eventBus } from "../../event-bus.ts";
import type { Task, TaskComment, TaskConfig, TimeEntry } from "../../types.ts";

interface TaskFrontmatter {
  id: string;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  revision?: number;
  order?: number;
  tags?: string[];
  due_date?: string;
  assignee?: string;
  priority?: number;
  effort?: number;
  blocked_by?: string[];
  milestone?: string;
  planned_start?: string;
  planned_end?: string;
  time_entries?: TimeEntry[];
  attachments?: string[];
  project?: string;
  githubIssue?: number;
  githubRepo?: string;
  githubPR?: number;
  comments?: TaskComment[];
  claimedBy?: string;
  claimedAt?: string;
}

export class TasksDirectoryParser {
  protected projectDir: string;
  protected boardDir: string;
  protected writeLocks: Map<string, Promise<void>> = new Map();

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.boardDir = `${projectDir}/board`;
  }

  /**
   * Ensure the board directory and section subdirectories exist.
   */
  async ensureDir(section?: string): Promise<void> {
    if (section) {
      await Deno.mkdir(
        `${this.boardDir}/${this.sanitizeSectionName(section)}`,
        { recursive: true },
      );
    } else {
      await Deno.mkdir(this.boardDir, { recursive: true });
    }
  }

  /**
   * Sanitize section name for filesystem.
   */
  private sanitizeSectionName(section: string): string {
    return section.toLowerCase().replace(/\s+/g, "_").replace(
      /[^a-z0-9_-]/g,
      "",
    );
  }

  /**
   * Get all section directories, respecting persisted order from board/.order.
   */
  async listSections(): Promise<string[]> {
    // Read persisted order if available
    let orderedSections: string[] = [];
    try {
      const content = await Deno.readTextFile(`${this.boardDir}/.order`);
      orderedSections = content.split("\n").map((s) => s.trim()).filter(
        Boolean,
      );
    } catch {
      // No order file — fall back to filesystem enumeration
    }

    // Get all actual section directories on disk
    const allDirs = new Set<string>();
    try {
      for await (const entry of Deno.readDir(this.boardDir)) {
        if (entry.isDirectory) {
          const displayName = entry.name
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          allDirs.add(displayName);
        }
      }
    } catch (error) {
      if ((error as Deno.errors.NotFound)?.name !== "NotFound") {
        throw error;
      }
    }

    if (orderedSections.length === 0) {
      return insertPendingReview(Array.from(allDirs));
    }

    // Return ordered sections that exist, then any extras not in the order file
    const result = orderedSections.filter((s) => allDirs.has(s));
    for (const dir of allDirs) {
      if (!orderedSections.includes(dir)) {
        // "Pending Review" belongs between "In Progress" and "Done"
        if (dir === "Pending Review") {
          const doneIdx = result.indexOf("Done");
          if (doneIdx !== -1) {
            result.splice(doneIdx, 0, dir);
          } else {
            result.push(dir);
          }
        } else {
          result.push(dir);
        }
      }
    }
    return result;
  }

  /**
   * Get all task files in a section.
   */
  private async listTaskFiles(section: string): Promise<string[]> {
    const files: string[] = [];
    const sectionDir = `${this.boardDir}/${this.sanitizeSectionName(section)}`;

    try {
      for await (const entry of Deno.readDir(sectionDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          files.push(`${sectionDir}/${entry.name}`);
        }
      }
    } catch (error) {
      if ((error as Deno.errors.NotFound)?.name !== "NotFound") {
        throw error;
      }
    }
    return files.sort();
  }

  /**
   * Read all tasks from all sections.
   * Returns tasks sorted by section, then by order within each section.
   */
  async readAll(): Promise<Task[]> {
    const sections = await this.listSections();
    const tasks: Task[] = [];

    for (const section of sections) {
      const files = await this.listTaskFiles(section);
      for (const filePath of files) {
        try {
          const content = await Deno.readTextFile(filePath);
          const task = this.parseFile(content, section);
          if (task) {
            tasks.push(task);
          }
        } catch (error) {
          console.warn(`Failed to parse ${filePath}:`, error);
        }
      }
    }

    // Sort by order within each section
    return tasks.sort((a, b) => {
      const orderA = a.config.order ?? Infinity;
      const orderB = b.config.order ?? Infinity;
      return orderA - orderB;
    });
  }

  /**
   * Read tasks from a specific section, sorted by order.
   */
  async readBySection(section: string): Promise<Task[]> {
    const files = await this.listTaskFiles(section);
    const tasks: Task[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const task = this.parseFile(content, section);
        if (task) {
          tasks.push(task);
        }
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    // Sort by order (undefined orders go to end)
    return tasks.sort((a, b) => {
      const orderA = a.config.order ?? Infinity;
      const orderB = b.config.order ?? Infinity;
      return orderA - orderB;
    });
  }

  /**
   * Read a single task by ID.
   * Scans all task files to find the one with matching ID in frontmatter.
   */
  async read(id: string): Promise<Task | null> {
    const sections = await this.listSections();

    for (const section of sections) {
      // First try direct file lookup by ID
      const filePath = this.getFilePath(id, section);
      try {
        const content = await Deno.readTextFile(filePath);
        const task = this.parseFile(content, section);
        if (task && task.id === id) {
          return task;
        }
      } catch {
        // File not found, continue
      }

      // Fallback: scan all files in section to find by frontmatter ID
      const files = await this.listTaskFiles(section);
      for (const file of files) {
        try {
          const content = await Deno.readTextFile(file);
          const task = this.parseFile(content, section);
          if (task && task.id === id) {
            return task;
          }
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Write a task. Creates section directory if needed.
   * Cleans up old file if filename differs from expected (e.g., title-based vs ID-based naming).
   */
  async write(task: Task): Promise<void> {
    await this.ensureDir(task.section);
    const expectedPath = this.getFilePath(task.id, task.section);

    // Find actual current file path (may differ from expected if using old naming convention)
    const actualPath = await this.findTaskFilePath(task.id, task.section);

    const content = this.serializeTask(task);

    await this.withWriteLock(task.id, async () => {
      await this.atomicWriteFile(expectedPath, content);

      // Clean up old file if it has a different name
      if (actualPath && actualPath !== expectedPath) {
        try {
          await Deno.remove(actualPath);
        } catch {
          // Ignore - file may already be removed
        }
      }
    });
    eventBus.emit({ entity: "tasks", action: "updated", id: task.id });
  }

  /**
   * Delete a task by ID.
   * Scans files to find the one with matching ID in frontmatter.
   */
  async delete(id: string): Promise<boolean> {
    const sections = await this.listSections();

    for (const section of sections) {
      // First try direct file path
      const directPath = this.getFilePath(id, section);
      try {
        await Deno.remove(directPath);
        eventBus.emit({ entity: "tasks", action: "deleted", id });
        return true;
      } catch {
        // File not found at direct path
      }

      // Fallback: scan files to find by frontmatter ID
      const files = await this.listTaskFiles(section);
      for (const file of files) {
        try {
          const content = await Deno.readTextFile(file);
          const task = this.parseFile(content, section);
          if (task && task.id === id) {
            await Deno.remove(file);
            eventBus.emit({ entity: "tasks", action: "deleted", id });
            return true;
          }
        } catch {
          continue;
        }
      }
    }

    return false;
  }

  /**
   * Move task to a different section.
   * Finds the actual file path by scanning for the task ID in frontmatter.
   */
  async moveToSection(id: string, newSection: string): Promise<boolean> {
    // Find the task and its actual file path
    const oldSection = await this.findTaskSection(id);
    if (!oldSection) return false;

    const task = await this.read(id);
    if (!task) return false;

    const oldFilePath = await this.findTaskFilePath(id, oldSection);

    // Update section and write to new location
    task.section = newSection;
    await this.write(task);

    // Remove from old location
    if (oldFilePath) {
      try {
        await Deno.remove(oldFilePath);
      } catch {
        // Ignore if already removed
      }
    }

    return true;
  }

  /**
   * Reorder a task within or across sections.
   * Updates order field for all affected tasks.
   */
  async reorder(
    taskId: string,
    targetSection: string,
    position: number,
  ): Promise<boolean> {
    const task = await this.read(taskId);
    if (!task) return false;

    const sourceSection = task.section;
    const isSameSection = sourceSection === targetSection;

    // For cross-section moves: find and remember the old file path BEFORE modifications
    // The write() function handles same-section filename cleanup
    const oldFilePath = !isSameSection
      ? await this.findTaskFilePath(taskId, sourceSection)
      : null;

    // Get tasks in target section (excluding the moved task if same section)
    let targetTasks = await this.readBySection(targetSection);
    if (isSameSection) {
      targetTasks = targetTasks.filter((t) => t.id !== taskId);
    }

    // Insert task at new position
    const clampedPosition = Math.max(0, Math.min(position, targetTasks.length));
    targetTasks.splice(clampedPosition, 0, task);

    // Update order and section for all tasks, then write
    // The write() function handles cleanup of mismatched filenames
    for (let i = 0; i < targetTasks.length; i++) {
      targetTasks[i].config.order = i;
      targetTasks[i].section = targetSection;
      await this.write(targetTasks[i]);
    }

    // Cross-section move: delete old file from source section
    if (!isSameSection && oldFilePath) {
      try {
        await Deno.remove(oldFilePath);
      } catch {
        // Ignore - file may already be deleted
      }

      // Reorder remaining tasks in source section
      const sourceTasks = await this.readBySection(sourceSection);
      for (let i = 0; i < sourceTasks.length; i++) {
        if (sourceTasks[i].config.order !== i) {
          sourceTasks[i].config.order = i;
          await this.write(sourceTasks[i]);
        }
      }
    }

    return true;
  }

  /**
   * Find which section a task is in.
   */
  private async findTaskSection(id: string): Promise<string | null> {
    const sections = await this.listSections();
    for (const section of sections) {
      const files = await this.listTaskFiles(section);
      for (const file of files) {
        try {
          const content = await Deno.readTextFile(file);
          const task = this.parseFile(content, section);
          if (task && task.id === id) {
            return section;
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  /**
   * Find the actual file path for a task by its ID.
   */
  private async findTaskFilePath(
    id: string,
    section: string,
  ): Promise<string | null> {
    // First try direct path
    const directPath = this.getFilePath(id, section);
    try {
      await Deno.stat(directPath);
      return directPath;
    } catch {
      // Not found at direct path
    }

    // Scan files to find by frontmatter ID
    const files = await this.listTaskFiles(section);
    for (const file of files) {
      try {
        const content = await Deno.readTextFile(file);
        const task = this.parseFile(content, section);
        if (task && task.id === id) {
          return file;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Generate a unique task ID.
   */
  generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    return `task_${timestamp}_${random}`;
  }

  /**
   * Get file path for a task.
   */
  private getFilePath(id: string, section: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${this.boardDir}/${this.sanitizeSectionName(section)}/${safeId}.md`;
  }

  /**
   * Parse task file content.
   */
  private parseFile(content: string, section: string): Task | null {
    const { frontmatter, content: body } = parseFrontmatter<TaskFrontmatter>(
      content,
    );

    if (!frontmatter.id) {
      return null;
    }

    // Extract title from first heading
    const lines = body.split("\n");
    let title = "Untitled Task";
    let contentStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        contentStartIndex = i + 1;
        break;
      }
    }

    // Parse description and subtasks
    const description: string[] = [];
    const children: Task[] = [];
    let inSubtasks = false;

    for (let i = contentStartIndex; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("## Subtasks")) {
        inSubtasks = true;
        continue;
      }

      if (inSubtasks) {
        const subtaskMatch = line.match(/^- \[([ x])\] \(([^)]+)\) (.+)$/);
        if (subtaskMatch) {
          const [_, completed, childId, childTitle] = subtaskMatch;
          children.push({
            id: childId,
            title: childTitle.trim(),
            completed: completed === "x",
            section,
            config: {},
            revision: 1,
            parentId: frontmatter.id,
          });
        }
      } else if (line.trim() && !line.startsWith("## ")) {
        description.push(line);
      }
    }

    const config: TaskConfig = {};
    if (frontmatter.tags) config.tags = frontmatter.tags;
    if (frontmatter.due_date) config.due_date = frontmatter.due_date;
    if (frontmatter.assignee) config.assignee = frontmatter.assignee;
    if (frontmatter.priority !== undefined) {
      config.priority = frontmatter.priority;
    }
    if (frontmatter.effort !== undefined) config.effort = frontmatter.effort;
    if (frontmatter.blocked_by) config.blocked_by = frontmatter.blocked_by;
    if (frontmatter.milestone) config.milestone = frontmatter.milestone;
    if (frontmatter.planned_start) {
      config.planned_start = frontmatter.planned_start;
    }
    if (frontmatter.planned_end) config.planned_end = frontmatter.planned_end;
    if (frontmatter.time_entries) {
      config.time_entries = frontmatter.time_entries;
    }
    if (frontmatter.order !== undefined) config.order = frontmatter.order;
    if (frontmatter.attachments?.length) {
      config.attachments = frontmatter.attachments;
    }
    if (frontmatter.project) config.project = frontmatter.project;
    if (frontmatter.githubIssue !== undefined) {
      config.githubIssue = frontmatter.githubIssue;
    }
    if (frontmatter.githubRepo) config.githubRepo = frontmatter.githubRepo;
    if (frontmatter.githubPR !== undefined) {
      config.githubPR = frontmatter.githubPR;
    }
    if (frontmatter.comments?.length) {
      config.comments = frontmatter.comments;
    }
    if (frontmatter.claimedBy) config.claimedBy = frontmatter.claimedBy;
    if (frontmatter.claimedAt) config.claimedAt = frontmatter.claimedAt;

    return {
      id: frontmatter.id,
      title,
      completed: frontmatter.completed || false,
      ...(frontmatter.completedAt && { completedAt: frontmatter.completedAt }),
      ...(frontmatter.createdAt && { createdAt: frontmatter.createdAt }),
      ...(frontmatter.updatedAt && { updatedAt: frontmatter.updatedAt }),
      revision: frontmatter.revision || 1,
      section,
      config,
      description: description.length > 0 ? description : undefined,
      children: children.length > 0 ? children : undefined,
    };
  }

  /**
   * Serialize task to markdown file content.
   */
  private serializeTask(task: Task): string {
    const frontmatter: TaskFrontmatter = {
      id: task.id,
      completed: task.completed,
      ...(task.completedAt && { completedAt: task.completedAt }),
      ...(task.createdAt && { createdAt: task.createdAt }),
      ...(task.updatedAt && { updatedAt: task.updatedAt }),
      revision: task.revision,
    };

    // Add config fields
    if (task.config.tags?.length) frontmatter.tags = task.config.tags;
    if (task.config.due_date) frontmatter.due_date = task.config.due_date;
    if (task.config.assignee) frontmatter.assignee = task.config.assignee;
    if (task.config.priority !== undefined) {
      frontmatter.priority = task.config.priority;
    }
    if (task.config.effort !== undefined) {
      frontmatter.effort = task.config.effort;
    }
    if (task.config.blocked_by?.length) {
      frontmatter.blocked_by = task.config.blocked_by;
    }
    if (task.config.milestone) frontmatter.milestone = task.config.milestone;
    if (task.config.planned_start) {
      frontmatter.planned_start = task.config.planned_start;
    }
    if (task.config.planned_end) {
      frontmatter.planned_end = task.config.planned_end;
    }
    if (task.config.time_entries?.length) {
      frontmatter.time_entries = task.config.time_entries;
    }
    if (task.config.order !== undefined) frontmatter.order = task.config.order;
    if (task.config.attachments?.length) {
      frontmatter.attachments = task.config.attachments;
    }
    if (task.config.project) frontmatter.project = task.config.project;
    if (task.config.githubIssue !== undefined) {
      frontmatter.githubIssue = task.config.githubIssue;
    }
    if (task.config.githubRepo) frontmatter.githubRepo = task.config.githubRepo;
    if (task.config.githubPR !== undefined) {
      frontmatter.githubPR = task.config.githubPR;
    }
    if (task.config.comments?.length) {
      frontmatter.comments = task.config.comments;
    }
    if (task.config.claimedBy) frontmatter.claimedBy = task.config.claimedBy;
    if (task.config.claimedAt) frontmatter.claimedAt = task.config.claimedAt;

    let body = `# ${task.title}\n\n`;

    // Description
    if (task.description?.length) {
      body += task.description.join("\n") + "\n\n";
    }

    // Subtasks
    if (task.children?.length) {
      body += "## Subtasks\n\n";
      for (const child of task.children) {
        const checkbox = child.completed ? "[x]" : "[ ]";
        body += `- ${checkbox} (${child.id}) ${child.title}\n`;
      }
    }

    return buildFileContent(frontmatter, body.trim());
  }

  /**
   * Acquire write lock for a specific task.
   */
  private async withWriteLock<R>(
    id: string,
    operation: () => Promise<R>,
  ): Promise<R> {
    const previousLock = this.writeLocks.get(id) || Promise.resolve();
    let releaseLock: () => void;
    const newLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.writeLocks.set(id, newLock);

    try {
      await previousLock;
      return await operation();
    } finally {
      releaseLock!();
      if (this.writeLocks.get(id) === newLock) {
        this.writeLocks.delete(id);
      }
    }
  }

  /**
   * Atomic write using temp file + rename, with OS-level advisory lock.
   * Uses a dedicated .lock file and Deno 2.x file.lock() API so external
   * processes (WebDAV clients, git hooks, sync daemons) that use the same
   * convention are blocked during the write.
   */
  private async atomicWriteFile(
    filePath: string,
    content: string,
  ): Promise<void> {
    const lockPath = `${filePath}.lock`;
    const lockFile = await Deno.open(lockPath, { write: true, create: true });
    await lockFile.lock(true);
    try {
      const tempPath = `${filePath}.tmp`;
      await Deno.writeTextFile(tempPath, content);
      await Deno.rename(tempPath, filePath);
    } finally {
      await lockFile.unlock();
      lockFile.close();
      try {
        await Deno.remove(lockPath);
      } catch {
        // Lock file cleanup is best-effort; stale .lock files are harmless
      }
    }
  }

  /**
   * Add a new task.
   */
  async add(task: Omit<Task, "id" | "revision">): Promise<Task> {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      config: task.config ?? {}, // ensure config always exists
      id: this.generateId(),
      createdAt: task.createdAt ?? now,
      updatedAt: now,
      revision: 1,
    };
    await this.write(newTask);
    return newTask;
  }

  /**
   * Add a comment to a task. Returns the new comment or null if task not found.
   */
  async addComment(
    id: string,
    body: string,
    author?: string,
    metadata?: Record<string, unknown>,
  ): Promise<TaskComment | null> {
    const task = await this.read(id);
    if (!task) return null;

    const comment: TaskComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      body: body.replace(/\n/g, " ").trim(),
      ...(author && { author }),
      ...(metadata && Object.keys(metadata).length > 0 && { metadata }),
    };

    const existing = task.config.comments ?? [];
    const updated: Task = {
      ...task,
      config: { ...task.config, comments: [...existing, comment] },
    };
    await this.write(updated);
    return comment;
  }

  /**
   * Delete a comment from a task. Returns true if deleted, false if task/comment not found.
   */
  async deleteComment(id: string, commentId: string): Promise<boolean> {
    const task = await this.read(id);
    if (!task) return false;

    const existing = task.config.comments ?? [];
    const filtered = existing.filter((c) => c.id !== commentId);
    if (filtered.length === existing.length) return false; // not found

    const updated: Task = {
      ...task,
      config: { ...task.config, comments: filtered },
    };
    await this.write(updated);
    return true;
  }

  /**
   * Update the body of an existing comment. Returns the updated comment or null if not found.
   */
  async updateComment(
    id: string,
    commentId: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<TaskComment | null> {
    const task = await this.read(id);
    if (!task) return null;

    const existing = task.config.comments ?? [];
    const idx = existing.findIndex((c) => c.id === commentId);
    if (idx === -1) return null;

    const updated_comment: TaskComment = {
      ...existing[idx],
      body: body.replace(/\n/g, " ").trim(),
      ...(metadata !== undefined && {
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      }),
    };
    const updatedComments = [
      ...existing.slice(0, idx),
      updated_comment,
      ...existing.slice(idx + 1),
    ];
    const updated: Task = {
      ...task,
      config: { ...task.config, comments: updatedComments },
    };
    await this.write(updated);
    return updated_comment;
  }

  /**
   * Update an existing task.
   * The write() function handles file path cleanup automatically.
   */
  async update(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const oldSection = existing.section;
    const newSection = updates.section || oldSection;

    const updated: Task = {
      ...existing,
      ...updates,
      // Deep merge config so callers can send partial config without
      // clobbering time_entries, blocked_by, order, attachments, etc.
      config: { ...existing.config, ...(updates.config ?? {}) },
      id: existing.id, // Prevent ID change
      updatedAt: new Date().toISOString(),
      revision: existing.revision + 1,
    };

    // Auto-manage completedAt when completion state changes
    if (
      updates.completed !== undefined &&
      updates.completed !== existing.completed
    ) {
      if (updates.completed) {
        updated.completedAt = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      } else {
        delete updated.completedAt;
      }
    }

    // If section changed, move file: write to new section dir then remove old file.
    // Do NOT call moveToSection() here — it re-reads the task from disk and would
    // discard all other field updates (assignee, priority, etc.) in `updated`.
    if (newSection !== oldSection) {
      const oldFilePath = await this.findTaskFilePath(id, oldSection);
      await this.write(updated);
      if (oldFilePath) {
        try {
          await Deno.remove(oldFilePath);
        } catch {
          // Ignore — file may already be removed
        }
      }
    } else {
      // write() handles cleanup of mismatched filenames
      await this.write(updated);
    }

    return updated;
  }

  /**
   * Atomically claim a task: move to "In Progress" and assign to claimant.
   * Fails if task is not in the expected section (default: "Todo").
   * Prevents race conditions in multi-agent scenarios.
   */
  async claim(
    id: string,
    assignee: string,
    expectedSection = "Todo",
  ): Promise<Task | null> {
    return await this.withWriteLock(id, async () => {
      const task = await this.read(id);
      if (!task) return null;

      if (task.section !== expectedSection) {
        throw new Error(
          `CLAIM_CONFLICT: task '${id}' is in '${task.section}', expected '${expectedSection}'`,
        );
      }

      const oldFilePath = await this.findTaskFilePath(id, task.section);
      const now = new Date().toISOString();
      const claimed: Task = {
        ...task,
        section: "In Progress",
        config: {
          ...task.config,
          assignee,
          claimedBy: assignee,
          claimedAt: now,
        },
        updatedAt: now,
        revision: task.revision + 1,
      };
      await this.write(claimed);

      if (oldFilePath) {
        try {
          await Deno.remove(oldFilePath);
        } catch {
          // Ignore — file may already be removed
        }
      }

      return claimed;
    });
  }

  /**
   * List sections synchronously (cached from last call or default).
   * Used for compatibility with getSectionsFromBoard.
   */
  listSectionsSync(): string[] {
    // Default sections - the actual sections are determined by directory structure
    // This is a fallback for sync access
    return ["Backlog", "Todo", "In Progress", "Pending Review", "Done"];
  }

  /**
   * Save all tasks (bulk replace).
   * Handles tasks organized by section.
   */
  async saveAll(tasks: Task[], extraSections?: string[]): Promise<void> {
    // Group tasks by section
    const tasksBySection = new Map<string, Task[]>();
    for (const task of tasks) {
      const section = task.section || "Todo";
      if (!tasksBySection.has(section)) {
        tasksBySection.set(section, []);
      }
      tasksBySection.get(section)!.push(task);
    }

    // Get existing sections and tasks
    const existingSections = await this.listSections();
    const existingTasks = await this.readAll();
    const existingTaskIds = new Set(existingTasks.map((t) => t.id));
    const newTaskIds = new Set(tasks.map((t) => t.id));

    // Delete tasks that are no longer present
    for (const task of existingTasks) {
      if (!newTaskIds.has(task.id)) {
        await this.delete(task.id);
      }
    }

    // Ensure all required sections exist (including empty extra sections)
    for (const section of tasksBySection.keys()) {
      await this.ensureDir(section);
    }
    if (extraSections) {
      for (const section of extraSections) {
        await this.ensureDir(section);
      }
      // Persist section order so listSections() returns them in the same order
      await Deno.writeTextFile(
        `${this.boardDir}/.order`,
        extraSections.join("\n"),
      );
    }

    // Write all tasks
    for (const task of tasks) {
      await this.write(task);
    }
  }
}

/**
 * Insert "Pending Review" between "In Progress" and "Done" in a section list.
 * Used when the section appears on disk but is not yet in the .order file.
 */
function insertPendingReview(sections: string[]): string[] {
  if (!sections.includes("Pending Review")) return sections;
  const result = sections.filter((s) => s !== "Pending Review");
  const doneIdx = result.indexOf("Done");
  if (doneIdx !== -1) {
    result.splice(doneIdx, 0, "Pending Review");
  } else {
    result.push("Pending Review");
  }
  return result;
}
