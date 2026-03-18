import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { toKebab } from "../utils/slug.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import type {
  PortfolioItem,
  PortfolioStatusUpdate,
} from "../types/portfolio.types.ts";

export class PortfolioRepository {
  private dir: string;
  private writer = new SafeWriter();

  constructor(projectDir: string) {
    this.dir = join(projectDir, "portfolio");
  }

  async findAll(): Promise<PortfolioItem[]> {
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

  async findById(id: string): Promise<PortfolioItem | null> {
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      return this.parse(`${id}.md`, content);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return null;
      throw err;
    }
  }

  async findByName(name: string): Promise<PortfolioItem | null> {
    const slug = toKebab(name);
    const fast = await this.findById(slug);
    if (fast) return fast;
    const all = await this.findAll();
    return all.find((i) => i.name.toLowerCase() === name.toLowerCase()) ?? null;
  }

  async search(query: string): Promise<PortfolioItem[]> {
    const all = await this.findAll();
    const q = query.toLowerCase();
    return all.filter((item) => item.name.toLowerCase().includes(q));
  }

  async create(
    data: Partial<PortfolioItem> & { name: string },
  ): Promise<PortfolioItem> {
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
      id,
      name: data.name,
      category: data.category ?? "Uncategorized",
      status: data.status ?? "active",
      description: data.description,
      client: data.client,
      revenue: data.revenue,
      expenses: data.expenses,
      progress: data.progress ?? 0,
      startDate: data.startDate,
      endDate: data.endDate,
      team: data.team,
      techStack: data.techStack,
      logo: data.logo,
      license: data.license,
      githubRepo: data.githubRepo,
      billingCustomerId: data.billingCustomerId,
      brainManaged: data.brainManaged,
      linkedGoals: data.linkedGoals,
      kpis: data.kpis,
      urls: data.urls,
      statusUpdates: data.statusUpdates,
    };

    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  async update(
    id: string,
    data: Partial<PortfolioItem>,
  ): Promise<PortfolioItem | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated: PortfolioItem = { ...existing, ...data, id: existing.id };
    await this.writer.write(
      id,
      () => atomicWrite(join(this.dir, `${id}.md`), this.serialize(updated)),
    );
    return updated;
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
    const updates = [update, ...(item.statusUpdates ?? [])];
    await this.update(id, { statusUpdates: updates });
    return update;
  }

  async deleteStatusUpdate(id: string, updateId: string): Promise<boolean> {
    const item = await this.findById(id);
    if (!item) return false;
    const before = item.statusUpdates?.length ?? 0;
    const filtered = (item.statusUpdates ?? []).filter((u) =>
      u.id !== updateId
    );
    if (filtered.length === before) return false;
    await this.update(id, { statusUpdates: filtered });
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
      status: String(fm.status ?? "active"),
      description: desc || undefined,
      client: fm.client != null ? String(fm.client) : undefined,
      revenue: typeof fm.revenue === "number" ? fm.revenue : undefined,
      expenses: typeof fm.expenses === "number" ? fm.expenses : undefined,
      progress: typeof fm.progress === "number" ? fm.progress : 0,
      startDate: fm.startDate != null ? String(fm.startDate) : undefined,
      endDate: fm.endDate != null ? String(fm.endDate) : undefined,
      team: Array.isArray(fm.team) ? fm.team.map(String) : undefined,
      techStack: Array.isArray(fm.techStack)
        ? fm.techStack.map(String)
        : undefined,
      logo: fm.logo != null ? String(fm.logo) : undefined,
      license: fm.license != null ? String(fm.license) : undefined,
      githubRepo: fm.githubRepo != null ? String(fm.githubRepo) : undefined,
      billingCustomerId: fm.billingCustomerId != null
        ? String(fm.billingCustomerId)
        : undefined,
      brainManaged: typeof fm.brainManaged === "boolean"
        ? fm.brainManaged
        : undefined,
      linkedGoals: Array.isArray(fm.linkedGoals)
        ? fm.linkedGoals.map(String)
        : undefined,
      kpis: Array.isArray(fm.kpis) ? fm.kpis : undefined,
      urls: Array.isArray(fm.urls) ? fm.urls : undefined,
      statusUpdates: Array.isArray(fm.statusUpdates)
        ? fm.statusUpdates
        : undefined,
    };
  }

  private serialize(item: PortfolioItem): string {
    const fm: Record<string, unknown> = {
      name: item.name,
      category: item.category,
      status: item.status,
    };
    if (item.client) fm.client = item.client;
    if (item.revenue != null) fm.revenue = item.revenue;
    if (item.expenses != null) fm.expenses = item.expenses;
    if (item.progress != null) fm.progress = item.progress;
    if (item.startDate) fm.startDate = item.startDate;
    if (item.endDate) fm.endDate = item.endDate;
    if (item.team?.length) fm.team = item.team;
    if (item.techStack?.length) fm.techStack = item.techStack;
    if (item.logo) fm.logo = item.logo;
    if (item.license) fm.license = item.license;
    if (item.githubRepo) fm.githubRepo = item.githubRepo;
    if (item.billingCustomerId) fm.billingCustomerId = item.billingCustomerId;
    if (item.brainManaged != null) fm.brainManaged = item.brainManaged;
    if (item.linkedGoals?.length) fm.linkedGoals = item.linkedGoals;
    if (item.kpis?.length) fm.kpis = item.kpis;
    if (item.urls?.length) fm.urls = item.urls;
    if (item.statusUpdates?.length) fm.statusUpdates = item.statusUpdates;

    const body = `# ${item.name}\n\n${item.description ?? ""}`.trimEnd();
    return serializeFrontmatter(fm, body);
  }
}
