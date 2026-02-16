import { DirectoryMarkdownParser } from "./parser/directory/parser.ts";
import { CacheDatabase, CacheSync, SearchEngine } from "./cache/index.ts";

/**
 * ProjectManager - Manages a single directory-based project
 * Pattern: Facade pattern for project operations
 *
 * The project path is passed via CLI argument.
 * Directory must contain a project.md file.
 */

export interface ProjectMeta {
  filename: string;
  name: string;
  description?: string;
  status?: string;
  category?: string;
  client?: string;
  revenue?: number;
  expenses?: number;
  lastUpdated: string;
  taskCount: number;
  completedTaskCount?: number;
  progressPercent?: number;
  isDirectory: boolean;
}

export interface ProjectManagerOptions {
  enableCache?: boolean;
  dbPath?: string;
}

export interface CacheLayer {
  db: CacheDatabase;
  sync: CacheSync;
  search: SearchEngine;
}

export class ProjectManager {
  private projectPath: string;
  private parser: DirectoryMarkdownParser;
  private cache: CacheLayer | null = null;

  constructor(projectPath: string, options?: ProjectManagerOptions) {
    this.projectPath = projectPath;
    this.parser = new DirectoryMarkdownParser(projectPath);

    if (options?.enableCache) {
      const dbPath = options.dbPath ?? `${projectPath}/.mdplanner.db`;
      const db = new CacheDatabase(dbPath);
      const sync = new CacheSync(this.parser, db);
      const search = new SearchEngine(db);
      this.cache = { db, sync, search };
    }
  }

  async init(): Promise<void> {
    // Verify the project exists
    const exists = await DirectoryMarkdownParser.isDirectoryProject(this.projectPath);
    if (!exists) {
      throw new Error(`Invalid project directory: ${this.projectPath} (missing project.md)`);
    }

    // Initialize cache if enabled
    if (this.cache) {
      this.cache.sync.init();
      if (this.cache.sync.needsSync()) {
        await this.cache.sync.fullSync();
      }
    }
  }

  /**
   * Get the active parser instance.
   */
  getActiveParser(): DirectoryMarkdownParser {
    return this.parser;
  }

  /**
   * Check if cache is enabled.
   */
  isCacheEnabled(): boolean {
    return this.cache !== null;
  }

  /**
   * Get cache layer (null if not enabled).
   */
  getCache(): CacheLayer | null {
    return this.cache;
  }

  /**
   * Rebuild cache from markdown.
   */
  async rebuildCache(): Promise<{ tables: number; items: number; duration: number; errors: string[] } | null> {
    if (!this.cache) return null;
    return this.cache.sync.rebuild();
  }

  /**
   * Get active project filename (directory name).
   */
  getActiveFile(): string {
    const parts = this.projectPath.split("/");
    return parts[parts.length - 1] || this.projectPath;
  }

  /**
   * Check if active project is directory-based.
   * Always true since we only support directory projects.
   */
  isActiveProjectDirectory(): boolean {
    return true;
  }

  /**
   * Get the active project directory path.
   */
  getActiveProjectDir(): string {
    return this.projectPath;
  }

  /**
   * Scan projects returns the single active project.
   * Kept for API compatibility.
   */
  async scanProjects(): Promise<ProjectMeta[]> {
    try {
      const projectInfo = await this.parser.readProjectInfo();
      const config = await this.parser.readProjectConfig();
      const tasks = await this.parser.readTasks();

      const totalTasks = this.countTasks(tasks);
      const completedTasks = this.countCompletedTasks(tasks);

      return [{
        filename: this.getActiveFile(),
        name: projectInfo.name || this.getActiveFile(),
        description: (projectInfo.description || []).slice(0, 2).join(' ').slice(0, 150) || undefined,
        status: config.status || "active",
        category: config.category,
        client: config.client,
        revenue: config.revenue,
        expenses: config.expenses,
        lastUpdated: config.lastUpdated || "",
        taskCount: totalTasks,
        completedTaskCount: completedTasks,
        progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        isDirectory: true,
      }];
    } catch (e) {
      console.error("Failed to read project:", e);
      return [];
    }
  }

  private countTasks(tasks: any[]): number {
    let count = 0;
    for (const task of tasks) {
      count++;
      if (task.children) {
        count += this.countTasks(task.children);
      }
    }
    return count;
  }

  private countCompletedTasks(tasks: any[]): number {
    let count = 0;
    for (const task of tasks) {
      if (task.completed) {
        count++;
      }
      if (task.children) {
        count += this.countCompletedTasks(task.children);
      }
    }
    return count;
  }
}
