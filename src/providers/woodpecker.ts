/**
 * Woodpecker CI REST API provider (Woodpecker 3.x).
 * Pattern: Provider pattern — HTTP client using a Personal Access Token.
 *
 * Woodpecker is a CI engine, not a VCS — it has its own host + token, separate
 * from the GitHub/Gitea VCS providers. Repos are addressed by numeric id, so a
 * portfolio item's `owner/repo` slug is first resolved via `/repos/lookup`.
 *
 *   - API root: `<baseUrl>/api`, e.g. `https://ci.example.com/api`.
 *   - Auth header: `Authorization: Bearer <token>`.
 *   - Repo lookup: `GET /repos/lookup/{owner}/{repo}` → `{ id, full_name, ... }`.
 *   - Pipelines:   `GET /repos/{id}/pipelines`, `GET /repos/{id}/pipelines/{n}`
 *                  (n may be the literal `latest`).
 */

import { log } from "../singletons/logger.ts";
import type {
  WoodpeckerPipeline,
  WoodpeckerPipelineStatus,
  WoodpeckerRepo,
  WpJson,
} from "../types/woodpecker.types.ts";
import { WOODPECKER_PIPELINE_STATUSES } from "../types/woodpecker.types.ts";

/**
 * Normalize a configured Woodpecker base URL to its `/api` API root.
 * Accepts `https://ci.example.com`, a trailing slash, or an already
 * `/api`-suffixed URL.
 */
export function woodpeckerApiBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

/** Woodpecker CI provider: repos + pipeline (build) status over the REST API. */
export class WoodpeckerProvider {
  private apiBase: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.apiBase = woodpeckerApiBase(baseUrl);
    this.token = token;
  }

  private get headers(): HeadersInit {
    const h: Record<string, string> = { Accept: "application/json" };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  private async wpGet(path: string): Promise<unknown> {
    const res = await fetch(`${this.apiBase}${path}`, {
      headers: this.headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Woodpecker API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Repos
  // ---------------------------------------------------------------------------

  /** Resolve an `owner/repo` slug to a Woodpecker repo (with numeric id). */
  async lookupRepo(slug: string): Promise<WoodpeckerRepo> {
    const data = await this.wpGet(`/repos/lookup/${slug}`) as WpJson;
    return mapRepo(data);
  }

  /** List repos accessible to the authenticated user, optionally name-filtered. */
  async listRepos(query?: string): Promise<WoodpeckerRepo[]> {
    const data = await this.wpGet("/user/repos?all=true") as WpJson[];
    const repos = Array.isArray(data) ? data.map(mapRepo) : [];
    const q = query?.toLowerCase().trim();
    return q
      ? repos.filter((r) => r.fullName.toLowerCase().includes(q))
      : repos;
  }

  // ---------------------------------------------------------------------------
  // Pipelines
  // ---------------------------------------------------------------------------

  /** List recent pipelines for an `owner/repo` slug (newest first). */
  async listPipelines(
    slug: string,
    limit = 10,
  ): Promise<WoodpeckerPipeline[]> {
    const { id } = await this.lookupRepo(slug);
    const data = await this.wpGet(
      `/repos/${id}/pipelines?perPage=${limit}`,
    ) as WpJson[];
    return Array.isArray(data) ? data.map(mapPipeline) : [];
  }

  /** Get a single pipeline by number (or `"latest"`) for an `owner/repo` slug. */
  async getPipeline(
    slug: string,
    number: number | "latest",
  ): Promise<WoodpeckerPipeline> {
    const { id } = await this.lookupRepo(slug);
    const data = await this.wpGet(
      `/repos/${id}/pipelines/${number}`,
    ) as WpJson;
    return mapPipeline(data);
  }

  /** Most recent pipeline for an `owner/repo` slug, or null when there are none. */
  async latestPipeline(slug: string): Promise<WoodpeckerPipeline | null> {
    try {
      return await this.getPipeline(slug, "latest");
    } catch (err) {
      log.warn("[woodpecker] latest pipeline fetch failed:", err);
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapRepo(d: WpJson): WoodpeckerRepo {
  return {
    id: Number(d.id ?? 0),
    fullName: String(d.full_name ?? d.fullName ?? ""),
    name: String(d.name ?? ""),
    forgeUrl: String(d.forge_url ?? d.forgeUrl ?? d.link_url ?? ""),
  };
}

/** Woodpecker timestamps are unix seconds (0 = unset). */
function unixToIso(value: unknown): string | null {
  const n = Number(value ?? 0);
  return n > 0 ? new Date(n * 1000).toISOString() : null;
}

function mapPipeline(d: WpJson): WoodpeckerPipeline {
  const raw = String(d.status ?? "");
  const status: WoodpeckerPipelineStatus =
    (WOODPECKER_PIPELINE_STATUSES as readonly string[]).includes(raw)
      ? raw as WoodpeckerPipelineStatus
      : "pending";
  return {
    number: Number(d.number ?? 0),
    status,
    event: String(d.event ?? ""),
    branch: String(d.branch ?? ""),
    message: String(d.message ?? ""),
    author: String(d.author ?? ""),
    commit: String(d.commit ?? ""),
    createdAt: unixToIso(d.created_at ?? d.created),
    startedAt: unixToIso(d.started_at ?? d.started),
    finishedAt: unixToIso(d.finished_at ?? d.finished),
    forgeUrl: String(d.forge_url ?? d.forgeUrl ?? ""),
  };
}
