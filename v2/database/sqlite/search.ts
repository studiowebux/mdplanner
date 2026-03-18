/**
 * Full-Text Search Engine
 * Pattern: Strategy pattern — search across multiple entity types
 *
 * Uses SQLite FTS5 for fast full-text search with ranking.
 * Iterates ENTITIES registry for FTS-enabled types — no hardcoded methods.
 */

import { type BindValue, type CacheDatabase } from "./database.ts";
import { ENTITIES, type EntityDef } from "./entities.ts";

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  types?: string[];
  offset?: number;
  project?: string;
}

function getFtsEntities() {
  return ENTITIES.filter((e) => e.fts !== undefined);
}

/** Pattern matching entity IDs: prefix_timestamp_random */
const ENTITY_ID_PATTERN = /^[a-z][a-z0-9]*_\d{10,}_[a-z0-9]+$/i;

/** Short alphanumeric suffix that could match the tail of an entity ID. */
const ID_SUFFIX_PATTERN = /^[a-z0-9]{3,8}$/i;

export class SearchEngine {
  constructor(private db: CacheDatabase) {}

  search(query: string, options?: SearchOptions): SearchResult[] {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const limit = options?.limit ?? 50;
    const activeTypes = options?.types ??
      getFtsEntities().map((e) => e.fts!.type);

    const results: SearchResult[] = [];

    if (ENTITY_ID_PATTERN.test(trimmed)) {
      const idResult = this.searchById(trimmed);
      if (idResult) results.push(idResult);
    } else if (ID_SUFFIX_PATTERN.test(trimmed)) {
      results.push(...this.searchBySuffix(trimmed));
    }

    const safeQuery = this.escapeQuery(trimmed);
    const project = options?.project;

    for (const entity of getFtsEntities()) {
      if (!activeTypes.includes(entity.fts!.type)) continue;
      results.push(...this.searchEntity(entity, safeQuery, limit, project));
    }

    results.sort((a, b) => a.score - b.score);

    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const offset = options?.offset ?? 0;
    return deduped.slice(offset, offset + limit);
  }

  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    let total = 0;
    for (const entity of ENTITIES) {
      try {
        const count = this.db.count(entity.table);
        stats[entity.table] = count;
        total += count;
      } catch {
        stats[entity.table] = 0;
      }
    }
    stats.total = total;
    return stats;
  }

  private searchById(id: string): SearchResult | null {
    for (const entity of ENTITIES) {
      const { fts, table } = entity;
      try {
        if (fts) {
          const row = this.db.queryOne<Record<string, unknown>>(
            `SELECT id, "${fts.titleCol}" FROM "${table}" WHERE id = ?`,
            [id],
          );
          if (row) {
            return {
              id: row.id as string,
              title: (row[fts.titleCol] as string) ?? id,
              snippet: "Exact match by ID",
              score: -Infinity,
              type: fts.type,
            };
          }
        } else {
          const row = this.db.queryOne<Record<string, unknown>>(
            `SELECT * FROM "${table}" WHERE id = ?`,
            [id],
          );
          if (row) {
            return {
              id: row.id as string,
              title: ((row.title ?? row.name ?? id) as string),
              snippet: "Exact match by ID",
              score: -Infinity,
              type: table,
            };
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  private searchBySuffix(suffix: string): SearchResult[] {
    const results: SearchResult[] = [];
    const pattern = `%_${suffix}`;
    for (const entity of ENTITIES) {
      const { fts, table } = entity;
      try {
        if (fts) {
          const rows = this.db.query<Record<string, unknown>>(
            `SELECT id, "${fts.titleCol}" FROM "${table}" WHERE id LIKE ? LIMIT 5`,
            [pattern],
          );
          for (const row of rows) {
            results.push({
              id: row.id as string,
              title: (row[fts.titleCol] as string) ?? (row.id as string),
              snippet: "ID suffix match",
              score: -Infinity,
              type: fts.type,
            });
          }
        } else {
          const rows = this.db.query<Record<string, unknown>>(
            `SELECT * FROM "${table}" WHERE id LIKE ? LIMIT 5`,
            [pattern],
          );
          for (const row of rows) {
            results.push({
              id: row.id as string,
              title: ((row.title ?? row.name ?? row.id) as string),
              snippet: "ID suffix match",
              score: -Infinity,
              type: table,
            });
          }
        }
      } catch {
        continue;
      }
    }
    return results;
  }

  private searchEntity(
    entity: EntityDef,
    query: string,
    limit: number,
    project?: string,
  ): SearchResult[] {
    const { fts, table } = entity;
    if (!fts) return [];

    const hasProjectCol = entity.schema.includes("project TEXT");
    if (project && !hasProjectCol) return [];

    const contentColIdx = fts.columns.indexOf(fts.contentCol);
    try {
      let sql = `SELECT "${fts.titleCol}", id,
         snippet(${table}_fts, ${contentColIdx}, '<mark>', '</mark>', '...', 32) as snippet,
         bm25(${table}_fts) as score
       FROM ${table}_fts
       WHERE ${table}_fts MATCH ?`;
      const params: BindValue[] = [query];

      if (project && hasProjectCol) {
        sql +=
          ` AND id IN (SELECT id FROM "${table}" WHERE LOWER(project) = LOWER(?))`;
        params.push(project);
      }

      sql += ` ORDER BY score LIMIT ?`;
      params.push(limit);

      const rows = this.db.query<Record<string, unknown>>(sql, params);
      return rows.map((r) => ({
        id: r.id as string,
        title: r[fts.titleCol] as string,
        snippet: r.snippet as string,
        score: r.score as number,
        type: fts.type,
      }));
    } catch {
      return [];
    }
  }

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
