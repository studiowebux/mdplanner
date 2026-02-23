/**
 * Directory-based parser for Portfolio items.
 * Reads portfolio project files from portfolio/ directory.
 */
import { parseFrontmatter } from "./base.ts";

export interface PortfolioKPI {
  name: string;
  value: string | number;
  target?: string | number;
  unit?: string;
}

export interface PortfolioItem {
  id: string;
  name: string;
  category: string;
  status: string;
  client?: string;
  revenue?: number;
  expenses?: number;
  progress?: number;
  description?: string;
  startDate?: string;
  endDate?: string;
  team?: string[];
  kpis?: PortfolioKPI[];
}

interface PortfolioFrontmatter {
  name?: string;
  category?: string;
  status?: string;
  client?: string;
  revenue?: number;
  expenses?: number;
  progress?: number;
  startDate?: string;
  endDate?: string;
  team?: string[];
  kpis?: PortfolioKPI[];
}

export class PortfolioDirectoryParser {
  private portfolioDir: string;

  constructor(projectDir: string) {
    this.portfolioDir = `${projectDir}/portfolio`;
  }

  /**
   * Check if portfolio directory exists.
   */
  async exists(): Promise<boolean> {
    try {
      const stat = await Deno.stat(this.portfolioDir);
      return stat.isDirectory;
    } catch {
      return false;
    }
  }

  /**
   * Read all portfolio items.
   */
  async readAll(): Promise<PortfolioItem[]> {
    const items: PortfolioItem[] = [];

    try {
      for await (const entry of Deno.readDir(this.portfolioDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const item = await this.readFile(entry.name);
          if (item) {
            items.push(item);
          }
        }
      }
    } catch (error) {
      if ((error as Deno.errors.NotFound)?.name !== "NotFound") {
        console.warn("Error reading portfolio directory:", error);
      }
    }

    // Sort by category then name
    items.sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category);
      if (catCompare !== 0) return catCompare;
      return a.name.localeCompare(b.name);
    });

    return items;
  }

  /**
   * Read a single portfolio file.
   */
  private async readFile(filename: string): Promise<PortfolioItem | null> {
    try {
      const filePath = `${this.portfolioDir}/${filename}`;
      const content = await Deno.readTextFile(filePath);
      return this.parseFile(filename, content);
    } catch (error) {
      console.warn(`Error reading portfolio file ${filename}:`, error);
      return null;
    }
  }

  /**
   * Parse portfolio file content.
   */
  private parseFile(filename: string, content: string): PortfolioItem {
    const { frontmatter, content: body } = parseFrontmatter<
      PortfolioFrontmatter
    >(content);

    // Extract description from body (first paragraph after title)
    const lines = body.split("\n");
    let description = "";
    let foundTitle = false;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        foundTitle = true;
        continue;
      }
      if (foundTitle && line.trim() && !line.startsWith("#")) {
        description = line.trim();
        break;
      }
    }

    const id = filename.replace(".md", "");

    return {
      id,
      name: frontmatter.name || id,
      category: frontmatter.category || "Uncategorized",
      status: frontmatter.status || "active",
      client: frontmatter.client,
      revenue: frontmatter.revenue,
      expenses: frontmatter.expenses,
      progress: frontmatter.progress,
      description: description || undefined,
      startDate: frontmatter.startDate,
      endDate: frontmatter.endDate,
      team: frontmatter.team,
      kpis: frontmatter.kpis,
    };
  }

  /**
   * Read a single portfolio item by ID.
   */
  async read(id: string): Promise<PortfolioItem | null> {
    try {
      const filePath = `${this.portfolioDir}/${id}.md`;
      const content = await Deno.readTextFile(filePath);
      return this.parseFile(`${id}.md`, content);
    } catch {
      return null;
    }
  }

  /**
   * Serialize a portfolio item to markdown file content.
   */
  private serialize(item: PortfolioItem): string {
    const frontmatter: PortfolioFrontmatter = {
      name: item.name,
      category: item.category,
      status: item.status,
      client: item.client,
      revenue: item.revenue,
      expenses: item.expenses,
      progress: item.progress,
      startDate: item.startDate,
      endDate: item.endDate,
      team: item.team,
      kpis: item.kpis,
    };

    for (
      const key of Object.keys(frontmatter) as Array<keyof PortfolioFrontmatter>
    ) {
      if (frontmatter[key] === undefined) {
        delete frontmatter[key];
      }
    }

    const yamlLines = ["---"];
    for (const [key, value] of Object.entries(frontmatter)) {
      if (Array.isArray(value)) {
        if (key === "kpis") {
          yamlLines.push(`${key}:`);
          for (const kpi of value as PortfolioKPI[]) {
            yamlLines.push(`  - name: "${kpi.name}"`);
            yamlLines.push(
              `    value: ${
                typeof kpi.value === "string" ? `"${kpi.value}"` : kpi.value
              }`,
            );
            if (kpi.target !== undefined) {
              yamlLines.push(
                `    target: ${
                  typeof kpi.target === "string"
                    ? `"${kpi.target}"`
                    : kpi.target
                }`,
              );
            }
            if (kpi.unit) {
              yamlLines.push(`    unit: "${kpi.unit}"`);
            }
          }
        } else {
          yamlLines.push(`${key}:`);
          for (const v of value) {
            yamlLines.push(`  - ${v}`);
          }
        }
      } else {
        yamlLines.push(`${key}: ${typeof value === "string" ? value : value}`);
      }
    }
    yamlLines.push("---");
    yamlLines.push("");
    yamlLines.push(`# ${item.name}`);
    yamlLines.push("");
    if (item.description) {
      yamlLines.push(item.description);
      yamlLines.push("");
    }

    return yamlLines.join("\n");
  }

  /**
   * Update a portfolio item.
   */
  async update(
    id: string,
    updates: Partial<PortfolioItem>,
  ): Promise<PortfolioItem | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    const filePath = `${this.portfolioDir}/${id}.md`;
    await Deno.writeTextFile(filePath, this.serialize(updated));
    return updated;
  }

  /**
   * Create a new portfolio item.
   */
  async create(
    data: Omit<PortfolioItem, "id">,
  ): Promise<PortfolioItem> {
    // Ensure portfolio directory exists
    try {
      await Deno.stat(this.portfolioDir);
    } catch {
      await Deno.mkdir(this.portfolioDir, { recursive: true });
    }

    // Generate ID from name
    const id = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for ID collision
    let finalId = id;
    let counter = 1;
    while (true) {
      try {
        await Deno.stat(`${this.portfolioDir}/${finalId}.md`);
        finalId = `${id}-${counter}`;
        counter++;
      } catch {
        break;
      }
    }

    const item: PortfolioItem = {
      id: finalId,
      name: data.name,
      category: data.category || "Uncategorized",
      status: data.status || "active",
      client: data.client,
      revenue: data.revenue,
      expenses: data.expenses,
      progress: data.progress || 0,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      team: data.team,
      kpis: data.kpis,
    };

    // Write the file directly (update() reads the existing file first,
    // which does not exist yet on create — so we write it here directly)
    const filePath = `${this.portfolioDir}/${finalId}.md`;
    await Deno.writeTextFile(filePath, this.serialize(item));

    return item;
  }

  /**
   * Delete a portfolio item.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.portfolioDir}/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get portfolio summary.
   */
  async getSummary(): Promise<PortfolioSummary> {
    const items = await this.readAll();

    const byStatus: Record<string, number> = {
      planning: 0,
      active: 0,
      "on-hold": 0,
      completed: 0,
    };

    const byCategory: Record<string, number> = {};

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalProgress = 0;

    for (const item of items) {
      // Count by status
      const status = item.status || "active";
      if (byStatus[status] !== undefined) {
        byStatus[status]++;
      } else {
        byStatus[status] = 1;
      }

      // Count by category
      const category = item.category || "Uncategorized";
      byCategory[category] = (byCategory[category] || 0) + 1;

      // Sum financials
      totalRevenue += item.revenue || 0;
      totalExpenses += item.expenses || 0;
      totalProgress += item.progress || 0;
    }

    const avgProgress = items.length > 0
      ? Math.round(totalProgress / items.length)
      : 0;

    return {
      total: items.length,
      byStatus,
      byCategory,
      avgProgress,
      totalRevenue,
      totalExpenses,
    };
  }
}

export interface PortfolioSummary {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  avgProgress: number;
  totalRevenue: number;
  totalExpenses: number;
}
