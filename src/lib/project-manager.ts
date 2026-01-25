import { MarkdownParser } from "./markdown-parser.ts";

export interface ProjectMeta {
  filename: string;
  name: string;
  lastUpdated: string;
  taskCount: number;
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

export class ProjectManager {
  private directory: string;
  private activeFile: string;
  private parsers: Map<string, MarkdownParser> = new Map();

  constructor(directory: string = ".") {
    this.directory = directory;
    this.activeFile = "";
  }

  async init(): Promise<void> {
    const projects = await this.scanProjects();
    if (projects.length > 0) {
      // Try to restore last active project from a simple marker file
      const lastActive = await this.getLastActiveProject();
      if (lastActive && projects.some(p => p.filename === lastActive)) {
        this.activeFile = lastActive;
      } else {
        this.activeFile = projects[0].filename;
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
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
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
          });
        } catch (e) {
          console.warn(`Failed to parse ${entry.name}:`, e);
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

  getActiveParser(): MarkdownParser {
    if (!this.activeFile) {
      throw new Error("No active project");
    }

    if (!this.parsers.has(this.activeFile)) {
      const filePath = `${this.directory}/${this.activeFile}`;
      this.parsers.set(this.activeFile, new MarkdownParser(filePath));
    }

    return this.parsers.get(this.activeFile)!;
  }

  async switchProject(filename: string): Promise<boolean> {
    const projects = await this.scanProjects();
    if (!projects.some(p => p.filename === filename)) {
      return false;
    }

    this.activeFile = filename;
    await this.saveLastActiveProject();
    return true;
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
}
