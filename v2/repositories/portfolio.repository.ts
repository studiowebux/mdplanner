import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { toKebab } from "../utils/slug.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import { mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import type {
  CreatePortfolioItem,
  PortfolioItem,
  PortfolioStatus,
  PortfolioStatusUpdate,
  UpdatePortfolioItem,
} from "../types/portfolio.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import type { CacheDatabase } from "../database/sqlite/mod.ts";
import { rowToPortfolioItem } from "../domains/portfolio/cache.ts";
import { PORTFOLIO_TABLE } from "../domains/portfolio/constants.ts";

export class PortfolioRepository {
  private dir: string;
  private writer = new SafeWriter();
  private cacheDb: CacheDatabase | null = null;

  constructor(projectDir: string) {
    this.dir = join(projectDir, "portfolio");
  }

  setCacheDb(db: CacheDatabase): void {
    this.cacheDb = db;
  }

  async findAll(): Promise<PortfolioItem[]> {
    if (this.cacheDb) {
      try {
        const count = this.cacheDb.count(PORTFOLIO_TABLE);
        if (count > 0) {
          return this.cacheDb.query<Record<string, unknown>>(
            `SELECT * FROM "${PORTFOLIO_TABLE}" ORDER BY category, name`,
          ).map(rowToPortfolioItem);
        }
      } catch { /* fall through to disk */ }
    }
    return this.findAllFromDisk();
  }

  /** Always read from disk — used by cache sync. */
  async findAllFromDisk(): Promise<PortfolioItem[]> {
    const items: PortfolioItem[] = [];
    try {
      for await (const entry of Deno.readDir(this.dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(join(this.dir, entry.name));
        const item = this.parse(entry.name, content);
        if (item) items.push(item);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return items.sort((a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );
  }

  /** Read a single item from disk, bypassing cache. */
  async findFromDisk(id: string): Promise<PortfolioItem | null> {
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      return this.parse(`${id}.md`, content);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return null;
      throw err;
    }
  }

  async findById(id: string): Promise<PortfolioItem | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${PORTFOLIO_TABLE}" WHERE id = ?`,
          [id],
        );
        if (row) return rowToPortfolioItem(row);
      } catch { /* fall through to disk */ }
    }
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      return this.parse(`${id}.md`, content);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return null;
      throw err;
    }
  }

  async findByName(name: string): Promise<PortfolioItem | null> {
    if (this.cacheDb) {
      try {
        const row = this.cacheDb.queryOne<Record<string, unknown>>(
          `SELECT * FROM "${PORTFOLIO_TABLE}" WHERE LOWER(name) = LOWER(?)`,
          [name],
        );
        if (row) return rowToPortfolioItem(row);
      } catch { /* fall through to disk */ }
    }
    const slug = toKebab(name);
    const fast = await this.findById(slug);
    if (fast) return fast;
    const all = await this.findAllFromDisk();
    return all.find((i) => ciEquals(i.name, name)) ?? null;
  }

  async search(query: string): Promise<PortfolioItem[]> {
    const all = await this.findAll();
    return all.filter((item) => ciIncludes(item.name, query));
  }

  async create(data: CreatePortfolioItem): Promise<PortfolioItem> {
    await Deno.mkdir(this.dir, { recursive: true });
    let id = toKebab(data.name);
    let filePath = join(this.dir, `${id}.md`);
    let counter = 0;
    while (await this.fileExists(filePath)) {
      counter++;
      id = `${toKebab(data.name)}-${counter}`;
      filePath = join(this.dir, `${id}.md`);
    }

    const item: PortfolioItem = {
      ...data,
      id,
      category: data.category ?? "Uncategorized",
      status: data.status ?? "active",
      progress: data.progress ?? 0,
    };

    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  async update(
    id: string,
    data: UpdatePortfolioItem,
  ): Promise<PortfolioItem | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    // Type assertion: spread is safe — required fields (category, status) fall
    // back to existing values when omitted from the update payload.
    const updated = { ...existing, ...data, id: existing.id } as PortfolioItem;
    await this.writeItem(id, updated);
    return updated;
  }

  private async writeItem(id: string, item: PortfolioItem): Promise<void> {
    await this.writer.write(
      id,
      () => atomicWrite(join(this.dir, `${id}.md`), this.serialize(item)),
    );
  }

  async delete(id: string): Promise<boolean> {
    try {
      await Deno.remove(join(this.dir, `${id}.md`));
      return true;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return false;
      throw err;
    }
  }

  async addStatusUpdate(
    id: string,
    message: string,
  ): Promise<PortfolioStatusUpdate | null> {
    const item = await this.findById(id);
    if (!item) return null;
    const update: PortfolioStatusUpdate = {
      id: generateId("statusUpdate"),
      date: new Date().toISOString().slice(0, 10),
      message,
    };
    await this.writeItem(id, {
      ...item,
      statusUpdates: [update, ...(item.statusUpdates ?? [])],
    });
    return update;
  }

  async updateStatusUpdate(
    id: string,
    updateId: string,
    message: string,
  ): Promise<PortfolioStatusUpdate | null> {
    const item = await this.findById(id);
    if (!item) return null;
    const target = (item.statusUpdates ?? []).find((u) => u.id === updateId);
    if (!target) return null;
    target.message = message;
    await this.writeItem(id, { ...item, statusUpdates: item.statusUpdates });
    return target;
  }

  async deleteStatusUpdate(id: string, updateId: string): Promise<boolean> {
    const item = await this.findById(id);
    if (!item) return false;
    const before = item.statusUpdates?.length ?? 0;
    const filtered = (item.statusUpdates ?? []).filter((u) =>
      u.id !== updateId
    );
    if (filtered.length === before) return false;
    await this.writeItem(id, { ...item, statusUpdates: filtered });
    return true;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  private parse(filename: string, content: string): PortfolioItem | null {
    const { frontmatter: fm, body } = parseFrontmatter(content);
    const id = filename.replace(/\.md$/, "");
    const titleMatch = body.match(/^#\s+(.+)/m);
    const name = fm.name ? String(fm.name) : titleMatch?.[1]?.trim() ?? id;

    const lines = body.split("\n");
    const titleIdx = lines.findIndex((l) => /^#\s+/.test(l));
    const desc = titleIdx >= 0
      ? lines.slice(titleIdx + 1).join("\n").trim()
      : undefined;

    return {
      id,
      name,
      category: String(fm.category ?? "Uncategorized"),
      status: String(fm.status ?? "active") as PortfolioStatus,
      description: desc || undefined,
      client: fm.client != null ? String(fm.client) : undefined,
      revenue: typeof fm.revenue === "number" ? fm.revenue : undefined,
      expenses: typeof fm.expenses === "number" ? fm.expenses : undefined,
      progress: typeof fm.progress === "number" ? fm.progress : 0,
      startDate: fm.start_date != null ? String(fm.start_date) : undefined,
      endDate: fm.end_date != null ? String(fm.end_date) : undefined,
      team: Array.isArray(fm.team) ? fm.team.map(String) : undefined,
      techStack: Array.isArray(fm.tech_stack)
        ? fm.tech_stack.map(String)
        : undefined,
      logo: fm.logo != null ? String(fm.logo) : undefined,
      license: fm.license != null ? String(fm.license) : undefined,
      githubRepo: fm.github_repo != null ? String(fm.github_repo) : undefined,
      billingCustomerId: fm.billing_customer_id != null
        ? String(fm.billing_customer_id)
        : undefined,
      brainManaged: typeof fm.brain_managed === "boolean"
        ? fm.brain_managed
        : undefined,
      linkedGoals: Array.isArray(fm.linked_goals)
        ? fm.linked_goals.map(String)
        : undefined,
      kpis: Array.isArray(fm.kpis) ? fm.kpis : undefined,
      urls: Array.isArray(fm.urls) ? fm.urls : undefined,
      statusUpdates: Array.isArray(fm.status_updates)
        ? fm.status_updates
        : undefined,
      createdAt: fm.created_at != null ? String(fm.created_at) : undefined,
      updatedAt: fm.updated_at != null ? String(fm.updated_at) : undefined,
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  private serialize(item: PortfolioItem): string {
    const raw: Record<string, unknown> = {
      name: item.name,
      category: item.category,
      status: item.status,
    };
    if (item.client) raw.client = item.client;
    if (item.revenue != null) raw.revenue = item.revenue;
    if (item.expenses != null) raw.expenses = item.expenses;
    if (item.progress != null) raw.progress = item.progress;
    if (item.startDate) raw.startDate = item.startDate;
    if (item.endDate) raw.endDate = item.endDate;
    if (item.team?.length) raw.team = item.team;
    if (item.techStack?.length) raw.techStack = item.techStack;
    if (item.logo) raw.logo = item.logo;
    if (item.license) raw.license = item.license;
    if (item.githubRepo) raw.githubRepo = item.githubRepo;
    if (item.billingCustomerId) raw.billingCustomerId = item.billingCustomerId;
    if (item.brainManaged != null) raw.brainManaged = item.brainManaged;
    if (item.linkedGoals?.length) raw.linkedGoals = item.linkedGoals;
    if (item.kpis?.length) raw.kpis = item.kpis;
    if (item.urls?.length) raw.urls = item.urls;
    if (item.statusUpdates?.length) raw.statusUpdates = item.statusUpdates;
    if (item.createdAt) raw.createdAt = item.createdAt;
    if (item.updatedAt) raw.updatedAt = item.updatedAt;
    if (item.createdBy) raw.createdBy = item.createdBy;
    if (item.updatedBy) raw.updatedBy = item.updatedBy;

    const fm = mapKeysToFm(raw);
    const body = `# ${item.name}\n\n${item.description ?? ""}`.trimEnd();
    return serializeFrontmatter(fm, body);
  }
}
