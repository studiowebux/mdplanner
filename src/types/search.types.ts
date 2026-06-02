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
