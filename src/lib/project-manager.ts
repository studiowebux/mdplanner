import { MarkdownParser } from "./markdown-parser.ts";
import { DirectoryMarkdownParser } from "./parser/directory/parser.ts";
import { Parser } from "./parser-interface.ts";

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
  isDirectory?: boolean;
}

export interface PortfolioSummary {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  overallProgress: number;
  totalTasks: number;
  completedTasks: number;
  totalRevenue: number;
  totalExpenses: number;
}

const EXCLUDED_FILES = [
  "README.md",
  "TODO.md",
  "CHANGELOG.md",
  "LICENSE.md",
];

const EXCLUDED_PATTERNS = [
  /^PLAN.*\.md$/i,
  /^backup/i,
];

const EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  ".vscode",
  "backup",
  "__trash",
];

export class ProjectManager {
  private directory: string;
  private activeFile: string;
  private activeIsDirectory: boolean = false;
  private parsers: Map<string, Parser> = new Map();

  constructor(directory: string = ".") {
    this.directory = directory;
    this.activeFile = "";
  }

  async init(): Promise<void> {
    const projects = await this.scanProjects();
    if (projects.length > 0) {
      // Try to restore last active project from a simple marker file
      const lastActive = await this.getLastActiveProject();
      const lastActiveProject = projects.find(p => p.filename === lastActive);
      if (lastActiveProject) {
        this.activeFile = lastActiveProject.filename;
        this.activeIsDirectory = lastActiveProject.isDirectory || false;
      } else {
        this.activeFile = projects[0].filename;
        this.activeIsDirectory = projects[0].isDirectory || false;
      }
    }
  }

  private async getLastActiveProject(): Promise<string | null> {
    try {
      const content = await Deno.readTextFile(`${this.directory}/.mdplanner_active`);
      return content.trim();
    } catch {
      return null;
    }
  }

  private async saveLastActiveProject(): Promise<void> {
    try {
      await Deno.writeTextFile(`${this.directory}/.mdplanner_active`, this.activeFile);
    } catch {
      // Ignore errors
    }
  }

  async scanProjects(): Promise<ProjectMeta[]> {
    const projects: ProjectMeta[] = [];

    try {
      for await (const entry of Deno.readDir(this.directory)) {
        // Handle single-file markdown projects
        if (entry.isFile && entry.name.endsWith(".md")) {
          if (EXCLUDED_FILES.includes(entry.name)) continue;
          if (EXCLUDED_PATTERNS.some(p => p.test(entry.name))) continue;

          const filePath = `${this.directory}/${entry.name}`;

          try {
            const parser = new MarkdownParser(filePath);
            const projectInfo = await parser.readProjectInfo();
            const config = await parser.readProjectConfig();
            const tasks = await parser.readTasks();

            projects.push({
              filename: entry.name,
              name: projectInfo.name || entry.name.replace(".md", ""),
              lastUpdated: config.lastUpdated || "",
              taskCount: this.countTasks(tasks),
              isDirectory: false,
            });
          } catch (e) {
            console.warn(`Failed to parse ${entry.name}:`, e);
          }
        }

        // Handle directory-based projects
        if (entry.isDirectory) {
          if (EXCLUDED_DIRS.includes(entry.name)) continue;

          const dirPath = `${this.directory}/${entry.name}`;

          // Check if it's a directory project (has project.md)
          if (await DirectoryMarkdownParser.isDirectoryProject(dirPath)) {
            try {
              const parser = new DirectoryMarkdownParser(dirPath);
              const projectInfo = await parser.readProjectInfo();
              const config = await parser.readProjectConfig();
              const tasks = await parser.readTasks();

              projects.push({
                filename: entry.name,
                name: projectInfo.name || entry.name,
                lastUpdated: config.lastUpdated || "",
                taskCount: this.countTasks(tasks),
                isDirectory: true,
              });
            } catch (e) {
              console.warn(`Failed to parse directory project ${entry.name}:`, e);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to scan directory:", e);
    }

    // Sort by lastUpdated descending
    projects.sort((a, b) => {
      if (!a.lastUpdated) return 1;
      if (!b.lastUpdated) return -1;
      return b.lastUpdated.localeCompare(a.lastUpdated);
    });

    return projects;
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

  /**
   * Scan projects with enriched metadata for portfolio view.
   * Includes description, status, progress metrics.
   */
  async scanProjectsEnriched(): Promise<ProjectMeta[]> {
    const projects: ProjectMeta[] = [];

    try {
      for await (const entry of Deno.readDir(this.directory)) {
        // Handle single-file markdown projects
        if (entry.isFile && entry.name.endsWith(".md")) {
          if (EXCLUDED_FILES.includes(entry.name)) continue;
          if (EXCLUDED_PATTERNS.some(p => p.test(entry.name))) continue;

          const filePath = `${this.directory}/${entry.name}`;

          try {
            const parser = new MarkdownParser(filePath);
            const projectInfo = await parser.readProjectInfo();
            const config = await parser.readProjectConfig();
            const tasks = await parser.readTasks();

            const totalTasks = this.countTasks(tasks);
            const completedTasks = this.countCompletedTasks(tasks);
            const progressPercent = totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0;

            // Get description (first 2 lines max, truncated to 150 chars)
            const descriptionLines = projectInfo.description || [];
            const description = descriptionLines.slice(0, 2).join(' ').slice(0, 150);

            projects.push({
              filename: entry.name,
              name: projectInfo.name || entry.name.replace(".md", ""),
              description: description || undefined,
              status: config.status || "active",
              category: config.category,
              client: config.client,
              revenue: config.revenue,
              expenses: config.expenses,
              lastUpdated: config.lastUpdated || "",
              taskCount: totalTasks,
              completedTaskCount: completedTasks,
              progressPercent,
              isDirectory: false,
            });
          } catch (e) {
            console.warn(`Failed to parse ${entry.name}:`, e);
          }
        }

        // Handle directory-based projects
        if (entry.isDirectory) {
          if (EXCLUDED_DIRS.includes(entry.name)) continue;

          const dirPath = `${this.directory}/${entry.name}`;

          // Check if it's a directory project (has project.md)
          if (await DirectoryMarkdownParser.isDirectoryProject(dirPath)) {
            try {
              const parser = new DirectoryMarkdownParser(dirPath);
              const projectInfo = await parser.readProjectInfo();
              const config = await parser.readProjectConfig();
              const tasks = await parser.readTasks();

              const totalTasks = this.countTasks(tasks);
              const completedTasks = this.countCompletedTasks(tasks);
              const progressPercent = totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0;

              // Get description (first 2 lines max, truncated to 150 chars)
              const descriptionLines = projectInfo.description || [];
              const description = descriptionLines.slice(0, 2).join(' ').slice(0, 150);

              projects.push({
                filename: entry.name,
                name: projectInfo.name || entry.name,
                description: description || undefined,
                status: config.status || "active",
                category: config.category,
                client: config.client,
                revenue: config.revenue,
                expenses: config.expenses,
                lastUpdated: config.lastUpdated || "",
                taskCount: totalTasks,
                completedTaskCount: completedTasks,
                progressPercent,
                isDirectory: true,
              });
            } catch (e) {
              console.warn(`Failed to parse directory project ${entry.name}:`, e);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to scan directory:", e);
    }

    // Sort by lastUpdated descending
    projects.sort((a, b) => {
      if (!a.lastUpdated) return 1;
      if (!b.lastUpdated) return -1;
      return b.lastUpdated.localeCompare(a.lastUpdated);
    });

    return projects;
  }

  /**
   * Get portfolio summary with aggregate metrics.
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const projects = await this.scanProjectsEnriched();

    const byStatus: Record<string, number> = {
      planning: 0,
      active: 0,
      "on-hold": 0,
      completed: 0,
    };

    const byCategory: Record<string, number> = {};

    let totalTasks = 0;
    let completedTasks = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const project of projects) {
      const status = project.status || "active";
      if (byStatus[status] !== undefined) {
        byStatus[status]++;
      } else {
        byStatus[status] = 1;
      }

      // Count by category
      const category = project.category || "Uncategorized";
      byCategory[category] = (byCategory[category] || 0) + 1;

      totalTasks += project.taskCount || 0;
      completedTasks += project.completedTaskCount || 0;
      totalRevenue += project.revenue || 0;
      totalExpenses += project.expenses || 0;
    }

    const overallProgress = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return {
      total: projects.length,
      byStatus,
      byCategory,
      overallProgress,
      totalTasks,
      completedTasks,
      totalRevenue,
      totalExpenses,
    };
  }

  getActiveParser(): Parser {
    if (!this.activeFile) {
      throw new Error("No active project");
    }

    if (!this.parsers.has(this.activeFile)) {
      if (this.activeIsDirectory) {
        const dirPath = `${this.directory}/${this.activeFile}`;
        this.parsers.set(this.activeFile, new DirectoryMarkdownParser(dirPath));
      } else {
        const filePath = `${this.directory}/${this.activeFile}`;
        this.parsers.set(this.activeFile, new MarkdownParser(filePath));
      }
    }

    return this.parsers.get(this.activeFile)!;
  }

  async switchProject(filename: string): Promise<boolean> {
    const projects = await this.scanProjects();
    const project = projects.find(p => p.filename === filename);
    if (!project) {
      return false;
    }

    this.activeFile = filename;
    this.activeIsDirectory = project.isDirectory || false;
    await this.saveLastActiveProject();
    return true;
  }

  isActiveProjectDirectory(): boolean {
    return this.activeIsDirectory;
  }

  async createProject(name: string): Promise<string> {
    // Sanitize filename
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let filename = `${safeName}.md`;

    // Check for existing file
    let counter = 1;
    while (true) {
      try {
        await Deno.stat(`${this.directory}/${filename}`);
        filename = `${safeName}-${counter}.md`;
        counter++;
      } catch {
        break;
      }
    }

    const template = `# ${name}

Project description here.

<!-- Configurations -->
# Configurations

Start Date: ${new Date().toISOString().split("T")[0]}
Last Updated: ${new Date().toISOString()}

Assignees:

Tags:

<!-- Notes -->
# Notes

<!-- Goals -->
# Goals

<!-- Canvas -->
# Canvas

<!-- Mindmap -->
# Mindmap

<!-- C4 Architecture -->
# C4 Architecture

<!-- Board -->
# Board

## Backlog

## Todo

## In Progress

## Done

`;

    await Deno.writeTextFile(`${this.directory}/${filename}`, template);
    this.activeFile = filename;
    await this.saveLastActiveProject();

    return filename;
  }

  getActiveFile(): string {
    return this.activeFile;
  }

  /**
   * Create a directory-based project.
   */
  async createDirectoryProject(name: string): Promise<string> {
    // Sanitize directory name
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let dirname = safeName;

    // Check for existing directory
    let counter = 1;
    while (true) {
      try {
        await Deno.stat(`${this.directory}/${dirname}`);
        dirname = `${safeName}-${counter}`;
        counter++;
      } catch {
        break;
      }
    }

    const dirPath = `${this.directory}/${dirname}`;
    const parser = new DirectoryMarkdownParser(dirPath);
    await parser.initialize(name);

    this.activeFile = dirname;
    this.activeIsDirectory = true;
    await this.saveLastActiveProject();

    return dirname;
  }
}
