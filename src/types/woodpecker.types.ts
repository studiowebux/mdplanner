/**
 * Woodpecker CI REST API types (Woodpecker 3.x).
 * Pattern: Provider pattern — shapes used by WoodpeckerProvider.
 *
 * CI is NOT a VCS: Woodpecker has its own host + token + API, separate from
 * IGitProvider. The API root is `<baseUrl>/api`, auth is `Authorization:
 * Bearer <token>`, and repos are addressed by numeric id (resolved from an
 * owner/repo slug via `/repos/lookup/{owner}/{repo}`).
 */

import { z } from "@hono/zod-openapi";

/** Raw JSON object from the Woodpecker API (loose, mapped defensively). */
export type WpJson = Record<string, unknown>;

/**
 * Woodpecker pipeline status values (Woodpecker 3.x).
 * See server pipeline status constants: blocked/pending/running/success/
 * failure/killed/error/declined/skipped, plus created/started transients.
 */
export const WOODPECKER_PIPELINE_STATUSES = [
  "blocked",
  "pending",
  "running",
  "success",
  "failure",
  "killed",
  "error",
  "declined",
  "skipped",
  "created",
  "started",
] as const;
export type WoodpeckerPipelineStatus =
  typeof WOODPECKER_PIPELINE_STATUSES[number];

/** A Woodpecker repository (subset relevant to CI status). */
export interface WoodpeckerRepo {
  id: number;
  fullName: string;
  name: string;
  forgeUrl: string;
}

/** A Woodpecker pipeline (build) run. */
export interface WoodpeckerPipeline {
  number: number;
  status: WoodpeckerPipelineStatus;
  event: string;
  branch: string;
  message: string;
  author: string;
  commit: string;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  forgeUrl: string;
}

// ---------------------------------------------------------------------------
// Reusable MCP input fields
// ---------------------------------------------------------------------------

export const WoodpeckerRepoInput = z.string().describe(
  "Repository in owner/repo format (resolved to a Woodpecker repo id)",
);

export const WoodpeckerNumberInput = z.union([
  z.number(),
  z.literal("latest"),
]).describe(
  "Pipeline number, or 'latest' for the most recent pipeline",
);

export const WoodpeckerLimitInput = z.number().optional().describe(
  "Max pipelines to return (default: 10)",
);
