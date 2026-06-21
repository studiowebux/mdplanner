/**
 * Full-Text Search Engine
 * Pattern: Strategy pattern — search across multiple entity types
 *
 * Uses SQLite FTS5 for fast full-text search with ranking.
 * Iterates ENTITIES registry for FTS-enabled types — no hardcoded methods.
 */

import { log } from "../../singletons/logger.ts";
import {
  type BindValue,
  type CacheDatabase,
  type QueryResult,
} from "./database.ts";
import { ENTITIES, type EntityDef } from "./entities.ts";
import type { SearchOptions, SearchResult } from "../../types/search.types.ts";
import { foldIncludes } from "../../utils/string.ts";

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
      getFtsEntities().map((e) => e.fts?.type).filter((t): t is string => !!t);

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
      if (!entity.fts || !activeTypes.includes(entity.fts.type)) continue;
      results.push(...this.searchEntity(entity, safeQuery, limit, project));
    }

    // Type-name search: "person" → all people, "tasks" → all tasks
    results.push(...this.searchByTypeName(trimmed, limit, project));

    // Boost results whose title contains the raw query — surfaces exact-title
    // matches above content-only BM25 hits regardless of document length.
    const titleBoost = (r: SearchResult) =>
      foldIncludes(r.title, trimmed) ? -1000 : 0;
    results.sort((a, b) =>
      (a.score + titleBoost(a)) - (b.score + titleBoost(b))
    );

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
      } catch (err) {
        log.warn(`[search] count failed for ${entity.table}:`, err);
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
          const row = this.db.queryOne<QueryResult>(
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
          const row = this.db.queryOne<QueryResult>(
            `SELECT * FROM "${table}" WHERE id = ?`,
            [id],
          );
          if (row) {
            return {
              id: row.id as string,
              title: (row.title ?? row.name ?? id) as string,
              snippet: "Exact match by ID",
              score: -Infinity,
              type: table,
            };
          }
        }
      } catch (err) {
        log.warn(`[search] ID lookup failed for ${table}:`, err);
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
          const rows = this.db.query<QueryResult>(
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
          const rows = this.db.query<QueryResult>(
            `SELECT * FROM "${table}" WHERE id LIKE ? LIMIT 5`,
            [pattern],
          );
          for (const row of rows) {
            results.push({
              id: row.id as string,
              title: (row.title ?? row.name ?? row.id) as string,
              snippet: "ID suffix match",
              score: -Infinity,
              type: table,
            });
          }
        }
      } catch (err) {
        log.warn(`[search] suffix lookup failed for ${table}:`, err);
        continue;
      }
    }
    return results;
  }

  private searchByTypeName(
    query: string,
    limit: number,
    project?: string,
  ): SearchResult[] {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const entity of ENTITIES) {
      const { fts, table } = entity;
      const type = fts?.type ?? table;
      const typeLower = type.toLowerCase();

      // Match exact type or simple plural (e.g. "tasks" → "task")
      if (typeLower !== q && `${typeLower}s` !== q) continue;

      const titleCol = fts?.titleCol ?? "name";
      const hasProjectCol = entity.schema.includes("project TEXT");
      const hasArchivedCol = entity.schema.includes("archived INTEGER");
      if (project && !hasProjectCol) continue;

      try {
        let sql = `SELECT id, "${titleCol}" as _title FROM "${table}"`;
        const params: BindValue[] = [];
        const where: string[] = [];

        if (project && hasProjectCol) {
          where.push(`LOWER(project) = LOWER(?)`);
          params.push(project);
        }
        if (hasArchivedCol) {
          where.push(`(archived IS NULL OR archived = 0)`);
        }
        if (where.length > 0) sql += ` WHERE ${where.join(" AND ")}`;

        sql += ` LIMIT ?`;
        params.push(limit);

        const rows = this.db.query<QueryResult>(sql, params);
        for (const row of rows) {
          results.push({
            id: row.id as string,
            title: (row._title as string) ?? (row.id as string),
            snippet: `All ${type}s`,
            score: 0,
            type,
          });
        }
      } catch (err) {
        log.warn(`[search] type-name lookup failed for ${type}:`, err);
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
    // All-punctuation queries reduce to an empty MATCH expression after
    // escapeQuery strips non-indexable tokens — FTS5 errors on `MATCH ""`.
    if (!query) return [];

    const hasProjectCol = entity.schema.includes("project TEXT");
    const hasArchivedCol = entity.schema.includes("archived INTEGER");
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
      // Soft-delete: archived rows are excluded from keyword search so they
      // mirror `findAll` semantics. Cross-domain ID lookups (`searchById`/
      // `searchBySuffix`) intentionally still resolve archived items.
      if (hasArchivedCol) {
        sql +=
          ` AND id IN (SELECT id FROM "${table}" WHERE archived IS NULL OR archived = 0)`;
      }

      sql += ` ORDER BY score LIMIT ?`;
      params.push(limit);

      const rows = this.db.query<QueryResult>(sql, params);
      return rows.map((r) => ({
        id: r.id as string,
        title: r[fts.titleCol] as string,
        snippet: r.snippet as string,
        score: r.score as number,
        type: fts.type,
      }));
    } catch (err) {
      log.warn(`[search] FTS query failed for ${table}:`, err);
      return [];
    }
  }

  private escapeQuery(query: string): string {
    return query
      .replace(/[\\]/g, "\\\\")
      .replace(/["]/g, '""')
      .split(/\s+/)
      // Drop punctuation-only tokens (e.g. "&", lone "-"). The FTS5 tokenizer
      // strips them to nothing, but as mandatory AND prefix terms they match
      // zero rows and zero out the whole query — so "API & Webhooks" returns
      // no results. Keep only tokens carrying an indexable letter or digit.
      .filter((term) => /[\p{L}\p{N}]/u.test(term))
      .map((term) => `"${term}"*`)
      .join(" AND ");
  }
}
