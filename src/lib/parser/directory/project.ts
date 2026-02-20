/**
 * Directory-based parser for Project configuration.
 * Stores project name, description, and config in project.md at root.
 */
import { buildFileContent, parseFrontmatter } from "./base.ts";
import type { ProjectConfig, ProjectLink } from "../../types.ts";

interface ProjectFrontmatter {
  start_date?: string;
  working_days_per_week?: number;
  working_days?: string[];
  assignees?: string[];
  tags?: string[];
  last_updated?: string;
  links?: ProjectLink[];
  status?: string;
  status_comment?: string;
  category?: string;
  client?: string;
  revenue?: number;
  expenses?: number;
  features?: string[];
}

export interface ProjectData {
  name: string;
  description: string[];
  config: ProjectConfig;
}

export class ProjectDirectoryParser {
  protected projectDir: string;
  protected filePath: string;
  protected writeLock: Promise<void> = Promise.resolve();

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.filePath = `${projectDir}/project.md`;
  }

  /**
   * Read project data from project.md.
   */
  async read(): Promise<ProjectData> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      return this.parseFile(content);
    } catch (error) {
      if ((error as Deno.errors.NotFound)?.name === "NotFound") {
        return {
          name: "New Project",
          description: [],
          config: {},
        };
      }
      throw error;
    }
  }

  /**
   * Write project data to project.md.
   */
  async write(data: ProjectData): Promise<void> {
    await Deno.mkdir(this.projectDir, { recursive: true });
    const content = this.serializeProject(data);

    await this.withWriteLock(async () => {
      await this.atomicWriteFile(content);
    });
  }

  /**
   * Update project name.
   */
  async updateName(name: string): Promise<void> {
    const data = await this.read();
    data.name = name;
    await this.write(data);
  }

  /**
   * Update project description.
   */
  async updateDescription(description: string[]): Promise<void> {
    const data = await this.read();
    data.description = description;
    await this.write(data);
  }

  /**
   * Update project config.
   */
  async updateConfig(config: Partial<ProjectConfig>): Promise<void> {
    const data = await this.read();
    data.config = { ...data.config, ...config };
    await this.write(data);
  }

  /**
   * Parse project.md content.
   */
  private parseFile(content: string): ProjectData {
    const { frontmatter, content: body } = parseFrontmatter<ProjectFrontmatter>(
      content,
    );

    // Extract title from first heading
    const lines = body.split("\n");
    let name = "Untitled Project";
    let descriptionStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        name = line.slice(2).trim();
        descriptionStartIndex = i + 1;
        break;
      }
    }

    const description = lines
      .slice(descriptionStartIndex)
      .join("\n")
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    const config: ProjectConfig = {};
    if (frontmatter.start_date) config.startDate = frontmatter.start_date;
    if (frontmatter.working_days_per_week !== undefined) {
      config.workingDaysPerWeek = frontmatter.working_days_per_week;
    }
    if (frontmatter.working_days) config.workingDays = frontmatter.working_days;
    if (frontmatter.assignees) config.assignees = frontmatter.assignees;
    if (frontmatter.tags) config.tags = frontmatter.tags;
    if (frontmatter.last_updated) config.lastUpdated = frontmatter.last_updated;
    if (frontmatter.links) config.links = frontmatter.links;
    if (frontmatter.status) config.status = frontmatter.status;
    if (frontmatter.status_comment) {
      config.statusComment = frontmatter.status_comment;
    }
    if (frontmatter.category) config.category = frontmatter.category;
    if (frontmatter.client) config.client = frontmatter.client;
    if (frontmatter.revenue !== undefined) config.revenue = frontmatter.revenue;
    if (frontmatter.expenses !== undefined) {
      config.expenses = frontmatter.expenses;
    }
    if (frontmatter.features) config.features = frontmatter.features;

    return { name, description, config };
  }

  /**
   * Serialize project data to markdown.
   */
  private serializeProject(data: ProjectData): string {
    const frontmatter: ProjectFrontmatter = {};

    if (data.config.startDate) frontmatter.start_date = data.config.startDate;
    if (data.config.workingDaysPerWeek !== undefined) {
      frontmatter.working_days_per_week = data.config.workingDaysPerWeek;
    }
    if (data.config.workingDays) {
      frontmatter.working_days = data.config.workingDays;
    }
    if (data.config.assignees) frontmatter.assignees = data.config.assignees;
    if (data.config.tags) frontmatter.tags = data.config.tags;
    if (data.config.links) frontmatter.links = data.config.links;
    if (data.config.status) frontmatter.status = data.config.status;
    if (data.config.statusComment) {
      frontmatter.status_comment = data.config.statusComment;
    }
    if (data.config.category) frontmatter.category = data.config.category;
    if (data.config.client) frontmatter.client = data.config.client;
    if (data.config.revenue !== undefined) {
      frontmatter.revenue = data.config.revenue;
    }
    if (data.config.expenses !== undefined) {
      frontmatter.expenses = data.config.expenses;
    }

    if (data.config.features && data.config.features.length > 0) {
      frontmatter.features = data.config.features;
    }

    // Always update last_updated
    frontmatter.last_updated = new Date().toISOString();

    let body = `# ${data.name}\n\n`;
    if (data.description.length > 0) {
      body += data.description.join("\n");
    }

    return buildFileContent(frontmatter, body.trim());
  }

  /**
   * Acquire write lock.
   */
  private async withWriteLock<R>(operation: () => Promise<R>): Promise<R> {
    const previousLock = this.writeLock;
    let releaseLock: () => void;
    this.writeLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    try {
      await previousLock;
      return await operation();
    } finally {
      releaseLock!();
    }
  }

  /**
   * Atomic write using temp file + rename.
   */
  private async atomicWriteFile(content: string): Promise<void> {
    const tempPath = this.filePath + ".tmp";
    await Deno.writeTextFile(tempPath, content);
    await Deno.rename(tempPath, this.filePath);
  }
}
