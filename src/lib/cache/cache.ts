/**
 * CachingParser Decorator
 * Pattern: Decorator pattern - wraps DirectoryParser with SQLite cache
 *
 * Reads from cache when available, writes through to both
 * markdown (source of truth) and SQLite (cache).
 */

import { type BindParams, type BindValue, CacheDatabase } from "./database.ts";
import type { DirectoryParser } from "../parser/directory/base.ts";

export interface CacheConfig {
  tableName: string;
  columns: string[];
  serializeRow: (item: unknown) => BindParams;
  deserializeRow: (row: Record<string, unknown>) => unknown;
}

/**
 * Generic caching wrapper for any DirectoryParser.
 */
export class CachingParser<T extends { id: string }> {
  private populated = false;

  constructor(
    private source: DirectoryParser<T>,
    private db: CacheDatabase,
    private config: CacheConfig,
  ) {}

  /**
   * Read all items. Uses cache if populated, otherwise reads from
   * markdown and populates cache.
   */
  async readAll(): Promise<T[]> {
    if (this.populated && this.hasCache()) {
      return this.readFromCache();
    }

    const items = await this.source.readAll();
    await this.populateCache(items);
    this.populated = true;
    return items;
  }

  /**
   * Read single item by ID.
   */
  async read(id: string): Promise<T | null> {
    if (this.populated) {
      const cached = this.readOneFromCache(id);
      if (cached) return cached;
    }
    return this.source.read(id);
  }

  /**
   * Write item to both markdown and cache.
   */
  async write(item: T): Promise<void> {
    await this.source.write(item);
    this.upsertCache(item);
  }

  /**
   * Delete item from both markdown and cache.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.source.delete(id);
    if (result) {
      this.deleteFromCache(id);
    }
    return result;
  }

  /**
   * Save all items (bulk replace).
   */
  async saveAll(items: T[]): Promise<void> {
    await this.source.saveAll(items);
    this.rebuildCache(items);
  }

  /**
   * Generate unique ID (delegated to source).
   */
  generateId(prefix?: string): string {
    return this.source.generateId(prefix);
  }

  /**
   * Invalidate cache (force reload from markdown on next read).
   */
  invalidate(): void {
    this.populated = false;
    this.clearCache();
  }

  /**
   * Force rebuild cache from markdown.
   */
  async rebuild(): Promise<number> {
    const items = await this.source.readAll();
    this.rebuildCache(items);
    this.populated = true;
    return items.length;
  }

  // Cache operations

  private hasCache(): boolean {
    const count = this.db.count(this.config.tableName);
    return count > 0;
  }

  private readFromCache(): T[] {
    const rows = this.db.query<Record<string, unknown>>(
      `SELECT * FROM ${this.config.tableName}`,
    );
    return rows.map((row) => this.config.deserializeRow(row) as T);
  }

  private readOneFromCache(id: string): T | null {
    const row = this.db.queryOne<Record<string, unknown>>(
      `SELECT * FROM ${this.config.tableName} WHERE id = ?`,
      [id],
    );
    if (!row) return null;
    return this.config.deserializeRow(row) as T;
  }

  private populateCache(items: T[]): void {
    this.clearCache();
    const placeholders = this.config.columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${this.config.tableName} (${
      this.config.columns.join(", ")
    }) VALUES (${placeholders})`;

    this.db.transaction(() => {
      for (const item of items) {
        const params = this.config.serializeRow(item);
        this.db.execute(sql, params);
      }
    });
  }

  private upsertCache(item: T): void {
    const placeholders = this.config.columns.map(() => "?").join(", ");
    const sql = `INSERT OR REPLACE INTO ${this.config.tableName} (${
      this.config.columns.join(", ")
    }) VALUES (${placeholders})`;
    const params = this.config.serializeRow(item);
    this.db.execute(sql, params);
  }

  private deleteFromCache(id: string): void {
    this.db.execute(`DELETE FROM ${this.config.tableName} WHERE id = ?`, [id]);
  }

  private clearCache(): void {
    this.db.truncate(this.config.tableName);
  }

  private rebuildCache(items: T[]): void {
    this.clearCache();
    this.populateCache(items);
    this.populated = true;
  }
}

/**
 * Factory functions for common entity cache configs.
 */
export const CacheConfigs = {
  tasks: (): CacheConfig => ({
    tableName: "tasks",
    columns: [
      "id",
      "title",
      "completed",
      "section",
      "description",
      "tags",
      "due_date",
      "assignee",
      "priority",
      "effort",
      "milestone",
      "blocked_by",
      "planned_start",
      "planned_end",
      "parent_id",
      "config",
    ],
    serializeRow: (item: unknown): BindParams => {
      const t = item as Record<string, unknown>;
      const config = t.config as Record<string, unknown> | undefined;
      return [
        t.id as BindValue,
        t.title as BindValue,
        t.completed ? 1 : 0,
        t.section as BindValue,
        Array.isArray(t.description)
          ? t.description.join("\n")
          : (t.description as BindValue),
        JSON.stringify(config?.tag ?? []),
        (config?.due_date as BindValue) ?? null,
        (config?.assignee as BindValue) ?? null,
        (config?.priority as BindValue) ?? null,
        (config?.effort as BindValue) ?? null,
        (config?.milestone as BindValue) ?? null,
        JSON.stringify(config?.blocked_by ?? []),
        (config?.planned_start as BindValue) ?? null,
        (config?.planned_end as BindValue) ?? null,
        (t.parentId as BindValue) ?? null,
        JSON.stringify(config ?? {}),
      ];
    },
    deserializeRow: (row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      completed: row.completed === 1,
      section: row.section,
      description: row.description ? String(row.description).split("\n") : [],
      parentId: row.parent_id ?? undefined,
      config: row.config ? JSON.parse(String(row.config)) : {},
    }),
  }),

  notes: (): CacheConfig => ({
    tableName: "notes",
    columns: [
      "id",
      "title",
      "content",
      "mode",
      "paragraphs",
      "custom_sections",
      "revision",
      "created_at",
      "updated_at",
    ],
    serializeRow: (item: unknown): BindParams => {
      const n = item as Record<string, unknown>;
      return [
        n.id as BindValue,
        n.title as BindValue,
        n.content as BindValue,
        (n.mode as BindValue) ?? "simple",
        JSON.stringify(n.paragraphs ?? []),
        JSON.stringify(n.customSections ?? []),
        (n.revision as BindValue) ?? 1,
        n.createdAt as BindValue,
        n.updatedAt as BindValue,
      ];
    },
    deserializeRow: (row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      content: row.content ?? "",
      mode: row.mode ?? "simple",
      paragraphs: row.paragraphs ? JSON.parse(String(row.paragraphs)) : [],
      customSections: row.custom_sections
        ? JSON.parse(String(row.custom_sections))
        : [],
      revision: Number(row.revision) || 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  }),

  goals: (): CacheConfig => ({
    tableName: "goals",
    columns: [
      "id",
      "title",
      "description",
      "type",
      "kpi",
      "start_date",
      "end_date",
      "status",
    ],
    serializeRow: (item: unknown): BindParams => {
      const g = item as Record<string, unknown>;
      return [
        g.id as BindValue,
        g.title as BindValue,
        g.description as BindValue,
        g.type as BindValue,
        g.kpi as BindValue,
        g.startDate as BindValue,
        g.endDate as BindValue,
        g.status as BindValue,
      ];
    },
    deserializeRow: (row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      type: row.type,
      kpi: row.kpi ?? "",
      startDate: row.start_date ?? "",
      endDate: row.end_date ?? "",
      status: row.status ?? "planning",
    }),
  }),

  milestones: (): CacheConfig => ({
    tableName: "milestones",
    columns: ["id", "name", "target", "status", "description"],
    serializeRow: (item: unknown): BindParams => {
      const m = item as Record<string, unknown>;
      return [
        m.id as BindValue,
        m.name as BindValue,
        m.target as BindValue,
        m.status as BindValue,
        m.description as BindValue,
      ];
    },
    deserializeRow: (row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      target: row.target,
      status: row.status ?? "open",
      description: row.description,
    }),
  }),

  ideas: (): CacheConfig => ({
    tableName: "ideas",
    columns: [
      "id",
      "title",
      "status",
      "category",
      "description",
      "links",
      "created",
    ],
    serializeRow: (item: unknown): BindParams => {
      const i = item as Record<string, unknown>;
      return [
        i.id as BindValue,
        i.title as BindValue,
        i.status as BindValue,
        i.category as BindValue,
        i.description as BindValue,
        JSON.stringify(i.links ?? []),
        i.created as BindValue,
      ];
    },
    deserializeRow: (row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      status: row.status ?? "new",
      category: row.category,
      description: row.description,
      links: row.links ? JSON.parse(String(row.links)) : [],
      created: row.created,
    }),
  }),
};
