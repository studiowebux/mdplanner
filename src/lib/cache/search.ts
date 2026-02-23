/**
 * Full-Text Search Engine
 * Pattern: Strategy pattern - search across multiple entity types
 *
 * Uses SQLite FTS5 for fast full-text search with ranking.
 * Iterates ENTITIES registry for FTS-enabled types — no hardcoded methods.
 */

import { CacheDatabase } from "./database.ts";
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
  | "financial_period";

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

/**
 * Full-text search engine using FTS5.
 */
export class SearchEngine {
  constructor(private db: CacheDatabase) {}

  /**
   * Search across all indexed content.
   */
  search(query: string, options?: SearchOptions): SearchResult[] {
    if (!query.trim()) return [];

    const limit = options?.limit ?? 50;
    const activeTypes = options?.types ??
      FTS_ENTITIES.map((e) => e.fts!.type as SearchResultType);

    const safeQuery = this.escapeQuery(query);
    const results: SearchResult[] = [];

    for (const entity of FTS_ENTITIES) {
      if (!activeTypes.includes(entity.fts!.type as SearchResultType)) continue;
      results.push(...this.searchEntity(entity, safeQuery, limit));
    }

    // Sort by score (lower is better in bm25)
    results.sort((a, b) => a.score - b.score);

    // Apply global limit with offset
    return results.slice(options?.offset ?? 0, (options?.offset ?? 0) + limit);
  }

  /**
   * Search a single FTS-enabled entity.
   */
  private searchEntity(
    entity: EntityDef,
    query: string,
    limit: number,
  ): SearchResult[] {
    const { fts, table } = entity;
    if (!fts) return [];
    const contentColIdx = fts.columns.indexOf(fts.contentCol);
    try {
      const rows = this.db.query<{
        [key: string]: unknown;
      }>(
        `SELECT ${fts.titleCol}, id,
          snippet(${table}_fts, ${contentColIdx}, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(${table}_fts) as score
        FROM ${table}_fts
        WHERE ${table}_fts MATCH ?
        ORDER BY score
        LIMIT ?`,
        [query, limit],
      );
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
      .join(" OR ");
  }
}
