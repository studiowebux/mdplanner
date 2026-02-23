/**
 * Full-Text Search Engine
 * Pattern: Strategy pattern - search across multiple entity types
 *
 * Uses SQLite FTS5 for fast full-text search with ranking.
 */

import { CacheDatabase } from "./database.ts";

export interface SearchResult {
  type: "task" | "note" | "goal" | "idea" | "meeting" | "person";
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  types?: ("task" | "note" | "goal" | "idea" | "meeting" | "person")[];
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
    const types = options?.types ??
      ["task", "note", "goal", "idea", "meeting", "person"];
    const results: SearchResult[] = [];

    // Escape special FTS5 characters
    const safeQuery = this.escapeQuery(query);

    if (types.includes("task")) {
      results.push(...this.searchTasks(safeQuery, limit));
    }
    if (types.includes("note")) {
      results.push(...this.searchNotes(safeQuery, limit));
    }
    if (types.includes("goal")) {
      results.push(...this.searchGoals(safeQuery, limit));
    }
    if (types.includes("idea")) {
      results.push(...this.searchIdeas(safeQuery, limit));
    }
    if (types.includes("meeting")) {
      results.push(...this.searchMeetings(safeQuery, limit));
    }
    if (types.includes("person")) {
      results.push(...this.searchPeople(safeQuery, limit));
    }

    // Sort by score (lower is better in bm25)
    results.sort((a, b) => a.score - b.score);

    // Apply global limit
    return results.slice(options?.offset ?? 0, (options?.offset ?? 0) + limit);
  }

  /**
   * Search tasks.
   */
  private searchTasks(query: string, limit: number): SearchResult[] {
    try {
      const rows = this.db.query<{
        id: string;
        title: string;
        snippet: string;
        score: number;
      }>(
        `SELECT
          id,
          title,
          snippet(tasks_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(tasks_fts) as score
        FROM tasks_fts
        WHERE tasks_fts MATCH ?
        ORDER BY score
        LIMIT ?`,
        [query, limit],
      );
      return rows.map((r) => ({ ...r, type: "task" as const }));
    } catch {
      return [];
    }
  }

  /**
   * Search notes.
   */
  private searchNotes(query: string, limit: number): SearchResult[] {
    try {
      const rows = this.db.query<{
        id: string;
        title: string;
        snippet: string;
        score: number;
      }>(
        `SELECT
          id,
          title,
          snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(notes_fts) as score
        FROM notes_fts
        WHERE notes_fts MATCH ?
        ORDER BY score
        LIMIT ?`,
        [query, limit],
      );
      return rows.map((r) => ({ ...r, type: "note" as const }));
    } catch {
      return [];
    }
  }

  /**
   * Search goals.
   */
  private searchGoals(query: string, limit: number): SearchResult[] {
    try {
      const rows = this.db.query<{
        id: string;
        title: string;
        snippet: string;
        score: number;
      }>(
        `SELECT
          id,
          title,
          snippet(goals_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(goals_fts) as score
        FROM goals_fts
        WHERE goals_fts MATCH ?
        ORDER BY score
        LIMIT ?`,
        [query, limit],
      );
      return rows.map((r) => ({ ...r, type: "goal" as const }));
    } catch {
      return [];
    }
  }

  /**
   * Search ideas.
   */
  private searchIdeas(query: string, limit: number): SearchResult[] {
    try {
      const rows = this.db.query<{
        id: string;
        title: string;
        snippet: string;
        score: number;
      }>(
        `SELECT
          id,
          title,
          snippet(ideas_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(ideas_fts) as score
        FROM ideas_fts
        WHERE ideas_fts MATCH ?
        ORDER BY score
        LIMIT ?`,
        [query, limit],
      );
      return rows.map((r) => ({ ...r, type: "idea" as const }));
    } catch {
      return [];
    }
  }

  /**
   * Search meetings.
   */
  private searchMeetings(query: string, limit: number): SearchResult[] {
    try {
      const rows = this.db.query<{
        id: string;
        title: string;
        snippet: string;
        score: number;
      }>(
        `SELECT
          id,
          title,
          snippet(meetings_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(meetings_fts) as score
        FROM meetings_fts
        WHERE meetings_fts MATCH ?
        ORDER BY score
        LIMIT ?`,
        [query, limit],
      );
      return rows.map((r) => ({ ...r, type: "meeting" as const }));
    } catch {
      return [];
    }
  }

  /**
   * Search people.
   */
  private searchPeople(query: string, limit: number): SearchResult[] {
    try {
      const rows = this.db.query<{
        id: string;
        name: string;
        snippet: string;
        score: number;
      }>(
        `SELECT
          id,
          name,
          snippet(people_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(people_fts) as score
        FROM people_fts
        WHERE people_fts MATCH ?
        ORDER BY score
        LIMIT ?`,
        [query, limit],
      );
      return rows.map((r) => ({
        id: r.id,
        title: r.name,
        snippet: r.snippet,
        score: r.score,
        type: "person" as const,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get search stats (counts).
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
      total: tasks + notes + goals + ideas + meetings + people + milestones +
        companies + deals,
    };
  }

  /**
   * Escape special FTS5 characters.
   */
  private escapeQuery(query: string): string {
    // FTS5 uses double quotes for phrase search
    // Escape special characters: ^ $ * + ? . ( ) [ ] { } | \
    return query
      .replace(/[\\]/g, "\\\\")
      .replace(/["]/g, '""')
      .split(/\s+/)
      .filter((term) => term.length > 0)
      .map((term) => `"${term}"*`)
      .join(" OR ");
  }
}
