import { join } from "@std/path";
import { log } from "../singletons/logger.ts";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { toKebab } from "../utils/slug.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import { mapKeysToFm, parseAuditFields } from "../utils/frontmatter-mapper.ts";
import type {
  CreatePortfolioItem,
  PortfolioItem,
  PortfolioStatus,
  PortfolioStatusUpdate,
  TeamMember,
  UpdatePortfolioItem,
} from "../types/portfolio.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import type { CacheDatabase, QueryResult } from "../database/sqlite/mod.ts";
import { rowToPortfolioItem } from "../domains/portfolio/cache.ts";
import { PORTFOLIO_TABLE } from "../domains/portfolio/constants.ts";

export class PortfolioRepository {
  private dir: string;
  private writer = new SafeWriter();
  private cacheDb: CacheDatabase | null = null;
  // Set after archive/restore/hardDelete so the next list read bypasses the
  // (now-stale) cache and falls through to disk. Cleared by `markClean`,
  // wired to `EntityDef.onSyncComplete` in registerPortfolioEntity. Matches
  // the canonical CachedMarkdownRepository pattern.
  private listDirty = false;

  constructor(projectDir: string) {
    this.dir = join(projectDir, "portfolio");
  }

  setCacheDb(db: CacheDatabase): void {
    this.cacheDb = db;
  }

  /** Called by EntityDef.onSyncComplete after fullSync — re-enables list cache. */
  markClean(): void {
    this.listDirty = false;
  }

  async findAll(): Promise<PortfolioItem[]> {
    if (this.cacheDb && !this.listDirty) {
      try {
        const count = this.cacheDb.count(PORTFOLIO_TABLE);
        if (count > 0) {
          return this.cacheDb.query<QueryResult>(
            `SELECT * FROM "${PORTFOLIO_TABLE}"
             WHERE archived IS NULL OR archived = 0
             ORDER BY category, name`,
          ).map(rowToPortfolioItem);
        }
      } catch (err) {
        log.warn("[cache] portfolio read failed, falling back to disk:", err);
      }
    }
    return this.findAllFromDisk();
  }

  /** Always read from disk — used by cache sync. Archived items are excluded;
   * cache sync receives the full set via `findArchived` separately when
   * needed. Matches the canonical pattern: `findAll` is the default view. */
  async findAllFromDisk(): Promise<PortfolioItem[]> {
    const items: PortfolioItem[] = [];
    try {
      for await (const entry of Deno.readDir(this.dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(join(this.dir, entry.name));
        const item = this.parse(entry.name, content);
        if (item && item.archived !== true) items.push(item);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return items.sort((a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );
  }

  /** Disk-only list of archived items. Mirror of `findAllFromDisk` for the
   * archived-view route and `BaseService.listArchived`. */
  async findArchived(): Promise<PortfolioItem[]> {
    const items: PortfolioItem[] = [];
    try {
      for await (const entry of Deno.readDir(this.dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(join(this.dir, entry.name));
        const item = this.parse(entry.name, content);
        if (item && item.archived === true) items.push(item);
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
        const row = this.cacheDb.queryOne<QueryResult>(
          `SELECT * FROM "${PORTFOLIO_TABLE}" WHERE id = ?`,
          [id],
        );
        if (row) return rowToPortfolioItem(row);
      } catch (err) {
        log.warn("[cache] portfolio read failed, falling back to disk:", err);
      }
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
        const row = this.cacheDb.queryOne<QueryResult>(
          `SELECT * FROM "${PORTFOLIO_TABLE}" WHERE LOWER(name) = LOWER(?)`,
          [name],
        );
        if (row) return rowToPortfolioItem(row);
      } catch (err) {
        log.warn("[cache] portfolio read failed, falling back to disk:", err);
      }
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

  /** Default delete = soft delete (archive). Hard removal requires an
   * explicit `hardDelete(id)` call. See
   * `[architecture] MD Planner — Soft-delete (archive) pattern`. */
  async delete(id: string): Promise<boolean> {
    return this.archive(id);
  }

  /**
   * Soft-delete: flip `archived` to true and stamp `archived_at` /
   * `archived_by` directly into the file's frontmatter. Bypasses
   * `serialize()` on purpose — direct frontmatter mutation guarantees
   * archive flags round-trip even when serialize() rebuilds the body from
   * description. Mirrors `BaseMarkdownRepository.archive`. Idempotent.
   */
  async archive(id: string, by?: string): Promise<boolean> {
    const ok = await this.writer.write(id, async () => {
      const found = await this.findRawFile(id);
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

  /** Restore an archived item: drop the three archive frontmatter fields. */
  async restore(id: string): Promise<boolean> {
    const ok = await this.writer.write(id, async () => {
      const found = await this.findRawFile(id);
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

  /** Permanent delete — removes the file from disk. No recovery. Cascades
   * to embedded status updates (they live inside the same file). */
  async hardDelete(id: string): Promise<boolean> {
    const ok = await this.writer.write(id, async () => {
      try {
        await Deno.remove(join(this.dir, `${id}.md`));
        return true;
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) return false;
        throw err;
      }
    });
    if (ok) this.invalidate(id);
    return ok;
  }

  /** Evict the row from the cache and mark the list cache stale. Called
   * by archive/restore/hardDelete since those paths skip `PortfolioService`'s
   * cacheUpsert. */
  private invalidate(id: string): void {
    this.listDirty = true;
    if (!this.cacheDb) return;
    try {
      this.cacheDb.execute(
        `DELETE FROM "${PORTFOLIO_TABLE}" WHERE id = ?`,
        [id],
      );
    } catch (err) {
      log.error(`[cache] failed to remove portfolio/${id}:`, err);
    }
  }

  /**
   * Locate a file by id and return its raw frontmatter + body. Used by
   * `archive`/`restore` so they can mutate frontmatter without going
   * through `serialize()` (which rebuilds the body from description).
   */
  private async findRawFile(
    id: string,
  ): Promise<
    {
      frontmatter: Record<string, unknown>;
      body: string;
      filePath: string;
    } | null
  > {
    const filePath = join(this.dir, `${id}.md`);
    try {
      const content = await Deno.readTextFile(filePath);
      const parsed = parseFrontmatter(content);
      return { ...parsed, filePath };
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return null;
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
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return false;
      throw err;
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
      endDate: (fm.end_date ?? fm.endDate) != null
        ? String(fm.end_date ?? fm.endDate)
        : undefined,
      team: Array.isArray(fm.team)
        ? fm.team.map((m): TeamMember =>
          typeof m === "string" ? { personId: m } : {
            personId: String((m as Record<string, unknown>).personId ?? ""),
            role: (m as Record<string, unknown>).role != null
              ? String((m as Record<string, unknown>).role)
              : undefined,
          }
        )
        : undefined,
      techStack: Array.isArray(fm.tech_stack ?? fm.techStack)
        ? ((fm.tech_stack ?? fm.techStack) as unknown[]).map(String)
        : undefined,
      logo: fm.logo != null ? String(fm.logo) : undefined,
      license: fm.license != null ? String(fm.license) : undefined,
      githubRepo: (fm.github_repo ?? fm.githubRepo) != null
        ? String(fm.github_repo ?? fm.githubRepo)
        : undefined,
      billingCustomerId:
        (fm.billing_customer_id ?? fm.billingCustomerId) != null
          ? String(fm.billing_customer_id ?? fm.billingCustomerId)
          : undefined,
      brainManaged: typeof (fm.brain_managed ?? fm.brainManaged) === "boolean"
        ? (fm.brain_managed ?? fm.brainManaged) as boolean
        : undefined,
      linkedGoals: Array.isArray(fm.linked_goals ?? fm.linkedGoals)
        ? ((fm.linked_goals ?? fm.linkedGoals) as unknown[]).map(String)
        : undefined,
      kpis: Array.isArray(fm.kpis) ? fm.kpis : undefined,
      urls: Array.isArray(fm.urls) ? fm.urls : undefined,
      statusUpdates: Array.isArray(fm.status_updates ?? fm.statusUpdates)
        ? ((fm.status_updates ?? fm.statusUpdates) as PortfolioStatusUpdate[])
        : undefined,
      ...parseAuditFields(fm),
      archived: fm.archived === true ? true : undefined,
      archivedAt: fm.archived_at != null ? String(fm.archived_at) : undefined,
      archivedBy: fm.archived_by != null ? String(fm.archived_by) : undefined,
    };
  }

  async upsertEntity(item: PortfolioItem): Promise<PortfolioItem> {
    await Deno.mkdir(this.dir, { recursive: true });
    const filePath = join(this.dir, `${item.id}.md`);
    await this.writer.write(
      item.id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
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
    if (item.archived) raw.archived = item.archived;
    if (item.archivedAt) raw.archivedAt = item.archivedAt;
    if (item.archivedBy) raw.archivedBy = item.archivedBy;

    const fm = mapKeysToFm(raw);
    const body = `# ${item.name}\n\n${item.description ?? ""}`.trimEnd();
    return serializeFrontmatter(fm, body);
  }
}
