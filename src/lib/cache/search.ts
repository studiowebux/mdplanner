/**
 * Full-Text Search Engine
 * Pattern: Strategy pattern - search across multiple entity types
 *
 * Uses SQLite FTS5 for fast full-text search with ranking.
 * Iterates ENTITIES registry for FTS-enabled types — no hardcoded methods.
 */

import { type BindValue, CacheDatabase } from "./database.ts";
import { ENTITIES, type EntityDef } from "./entities.ts";

export type SearchResultType =
  | "task"
  | "note"
  | "goal"
  | "idea"
  | "meeting"
  | "person"
  | "swot"
  | "brief"
  | "company"
  | "contact"
  | "retrospective"
  | "portfolio"
  | "moscow"
  | "eisenhower"
  | "onboarding"
  | "onboarding_template"
  | "financial_period"
  | "journal"
  | "dns_domain";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  types?: SearchResultType[];
  offset?: number;
  project?: string;
}

export interface SearchStats {
  tasks: number;
  notes: number;
  goals: number;
  ideas: number;
  meetings: number;
  people: number;
  milestones: number;
  companies: number;
  deals: number;
  total: number;
}

/** FTS-enabled entities, derived from the registry. */
const FTS_ENTITIES = ENTITIES.filter((e) => e.fts !== undefined);

/** Pattern matching entity IDs: prefix_timestamp_random */
const ENTITY_ID_PATTERN = /^[a-z][a-z0-9]*_\d{10,}_[a-z0-9]+$/i;

/** Short alphanumeric suffix that could match the tail of an entity ID. */
const ID_SUFFIX_PATTERN = /^[a-z0-9]{3,8}$/i;

/**
 * Full-text search engine using FTS5.
 */
export class SearchEngine {
  constructor(private db: CacheDatabase) {}

  /**
   * Search across all indexed content.
   * Detects entity ID queries and does a direct lookup before FTS.
   */
  search(query: string, options?: SearchOptions): SearchResult[] {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const limit = options?.limit ?? 50;
    const activeTypes = options?.types ??
      FTS_ENTITIES.map((e) => e.fts!.type as SearchResultType);

    const results: SearchResult[] = [];

    // Direct ID lookup when query looks like an entity ID
    if (ENTITY_ID_PATTERN.test(trimmed)) {
      const idResult = this.searchById(trimmed, activeTypes);
      if (idResult) {
        results.push(idResult);
      }
    } else if (ID_SUFFIX_PATTERN.test(trimmed)) {
      // Partial suffix search: short alphanumeric like "pn5a"
      results.push(...this.searchBySuffix(trimmed, activeTypes));
    }

    const safeQuery = this.escapeQuery(trimmed);

    const project = options?.project;
    for (const entity of FTS_ENTITIES) {
      if (!activeTypes.includes(entity.fts!.type as SearchResultType)) continue;
      results.push(...this.searchEntity(entity, safeQuery, limit, project));
    }

    // Sort by score (lower is better in bm25; ID match uses -Infinity)
    results.sort((a, b) => a.score - b.score);

    // Deduplicate: ID match may also appear in FTS results
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // Apply global limit with offset
    const offset = options?.offset ?? 0;
    return deduped.slice(offset, offset + limit);
  }

  /**
   * Direct lookup by entity ID across all cached tables.
   * Returns the first match as a top-ranked result.
   */
  private searchById(
    id: string,
    _activeTypes: SearchResultType[],
  ): SearchResult | null {
    for (const entity of ENTITIES) {
      const { fts, table } = entity;
      try {
        if (fts) {
          const row = this.db.queryOne<{ [key: string]: unknown }>(
            `SELECT id, ${fts.titleCol} FROM ${table} WHERE id = ?`,
            [id],
          );
          if (row) {
            return {
              id: row.id as string,
              title: (row[fts.titleCol] as string) ?? id,
              snippet: "Exact match by ID",
              score: -Infinity,
              type: fts.type as SearchResultType,
            };
          }
        } else {
          const row = this.db.queryOne<
            { id: string; title?: string; name?: string }
          >(
            `SELECT * FROM ${table} WHERE id = ?`,
            [id],
          );
          if (row) {
            return {
              id: row.id,
              title: (row.title ?? row.name ?? id) as string,
              snippet: "Exact match by ID",
              score: -Infinity,
              type: table as SearchResultType,
            };
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Find entities whose ID ends with the given suffix.
   */
  private searchBySuffix(
    suffix: string,
    _activeTypes: SearchResultType[],
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const pattern = `%_${suffix}`;
    for (const entity of ENTITIES) {
      const { fts, table } = entity;
      try {
        if (fts) {
          const rows = this.db.query<{ [key: string]: unknown }>(
            `SELECT id, ${fts.titleCol} FROM ${table} WHERE id LIKE ? LIMIT 5`,
            [pattern],
          );
          for (const row of rows) {
            results.push({
              id: row.id as string,
              title: (row[fts.titleCol] as string) ?? (row.id as string),
              snippet: "ID suffix match",
              score: -Infinity,
              type: fts.type as SearchResultType,
            });
          }
        } else {
          const rows = this.db.query<
            { id: string; title?: string; name?: string }
          >(
            `SELECT * FROM ${table} WHERE id LIKE ? LIMIT 5`,
            [pattern],
          );
          for (const row of rows) {
            results.push({
              id: row.id,
              title: (row.title ?? row.name ?? row.id) as string,
              snippet: "ID suffix match",
              score: -Infinity,
              type: table as SearchResultType,
            });
          }
        }
      } catch {
        continue;
      }
    }
    return results;
  }

  /**
   * Search a single FTS-enabled entity.
   */
  private searchEntity(
    entity: EntityDef,
    query: string,
    limit: number,
    project?: string,
  ): SearchResult[] {
    const { fts, table } = entity;
    if (!fts) return [];

    // When project filter is active, skip tables that lack a project column
    const hasProjectCol = entity.schema.includes("project TEXT");
    if (project && !hasProjectCol) return [];

    const contentColIdx = fts.columns.indexOf(fts.contentCol);
    try {
      let sql = `SELECT ${fts.titleCol}, id,
          snippet(${table}_fts, ${contentColIdx}, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(${table}_fts) as score
        FROM ${table}_fts
        WHERE ${table}_fts MATCH ?`;
      const params: BindValue[] = [query];

      if (project && hasProjectCol) {
        sql +=
          ` AND id IN (SELECT id FROM ${table} WHERE LOWER(project) = LOWER(?))`;
        params.push(project);
      }

      sql += ` ORDER BY score LIMIT ?`;
      params.push(limit);

      const rows = this.db.query<{ [key: string]: unknown }>(sql, params);
      return rows.map((r) => ({
        id: r.id as string,
        title: r[fts.titleCol] as string,
        snippet: r.snippet as string,
        score: r.score as number,
        type: fts.type as SearchResultType,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get search stats (counts per key entity type + total across all entities).
   */
  getStats(): SearchStats {
    const count = (table: string): number => {
      try {
        return this.db.count(table);
      } catch {
        return 0;
      }
    };

    const tasks = count("tasks");
    const notes = count("notes");
    const goals = count("goals");
    const ideas = count("ideas");
    const meetings = count("meetings");
    const people = count("people");
    const milestones = count("milestones");
    const companies = count("companies");
    const deals = count("deals");

    // Total includes every cached entity
    const total = ENTITIES.reduce((sum, e) => sum + count(e.table), 0);

    return {
      tasks,
      notes,
      goals,
      ideas,
      meetings,
      people,
      milestones,
      companies,
      deals,
      total,
    };
  }

  /**
   * Escape special FTS5 characters.
   */
  private escapeQuery(query: string): string {
    return query
      .replace(/[\\]/g, "\\\\")
      .replace(/["]/g, '""')
      .split(/\s+/)
      .filter((term) => term.length > 0)
      .map((term) => `"${term}"*`)
      .join(" AND ");
  }
}
