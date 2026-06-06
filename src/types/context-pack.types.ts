// Context-pack types — ContextPackQuery (input) + ContextPack (output payload).
// Single-call agent boot: people, active milestone, in-progress + todo tasks,
// most recent progress note, decision/architecture/constraint note stubs, and a
// derived suggested action. Mirrors analytics.types.ts: zod schema for the
// query, plain interfaces for the assembled result.

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export const ContextPackQuerySchema = z.object({
  project: z.string().optional().openapi({
    param: { name: "project", in: "query" },
    description: "Project name to scope all entities (e.g. 'MD Planner')",
  }),
  milestone: z.string().optional().openapi({
    param: { name: "milestone", in: "query" },
    description:
      "Milestone name. Defaults to the most recently created open milestone.",
  }),
}).openapi("ContextPackQuery");

export type ContextPackQuery = z.infer<typeof ContextPackQuerySchema>;

// ---------------------------------------------------------------------------
// Per-section result types
// ---------------------------------------------------------------------------

/** An AI/hybrid agent in the people registry. */
export interface ContextPackAgent {
  id: string;
  name: string;
  agentType: string;
}

/** The human project owner (first non-agent person). */
export interface ContextPackOwner {
  id: string;
  name: string;
}

/** Active milestone with task rollup counts (from the enriched Milestone). */
export interface ContextPackMilestone {
  id: string;
  name: string;
  status: string;
  description?: string;
  target?: string;
  taskCount: number;
  doneCount: number;
}

/** A task currently In Progress — enough to resume without extra reads. */
export interface ContextPackInProgress {
  id: string;
  title: string;
  section: string;
  assignee?: string;
  milestone?: string;
  description: string;
  blockedBy: string[];
  relevantFiles: string[];
}

/** A Todo task (top-10, priority-sorted) with its ready state. */
export interface ContextPackTodo {
  id: string;
  title: string;
  priority?: number;
  tags: string[];
  milestone?: string;
  ready: boolean;
}

/** A note stub — title + id only, fetched in full on demand. */
export interface ContextPackNote {
  id: string;
  title: string;
  updatedAt: string;
}

/** Most recent [progress] note with a content excerpt. */
export interface ContextPackProgress {
  id: string;
  title: string;
  updatedAt: string;
  excerpt: string;
}

/** Counts for a one-glance session overview. */
export interface ContextPackSummary {
  openMilestones: number;
  totalInProgress: number;
  totalTodo: number;
  staleTasks: number;
}

export type SuggestedActionType =
  | "resume"
  | "pick-next"
  | "wait-review"
  | "unblock"
  | "idle";

/** A suggested next milestone clustered from Backlog tags. */
export interface NextMilestoneSuggestion {
  /** Human-readable milestone name for the next sprint. */
  suggestedName: string;
  /** One sentence explaining the clustering rationale. */
  rationale: string;
  /** Top Backlog task IDs (sorted by priority) for the suggested milestone. */
  candidateTaskIds: string[];
}

/** What the agent should do next, derived from board state. */
export interface SuggestedAction {
  /** What the agent should do next. */
  type: SuggestedActionType;
  /** Task to act on (when applicable). */
  taskId?: string;
  taskTitle?: string;
  /** One sentence explaining why this action was chosen. */
  reason: string;
  /** One sentence: exactly what to do right now. */
  nextStep: string;
  /**
   * Present only when type is "wait-review". Suggests a name and candidate
   * tasks for the next milestone based on Backlog clustering.
   */
  nextMilestoneSuggestion?: NextMilestoneSuggestion;
}

// ---------------------------------------------------------------------------
// Top-level payload
// ---------------------------------------------------------------------------

/** Single-call agent boot payload — replaces 8+ sequential MCP reads. */
export interface ContextPack {
  generatedAt: string;
  project: string;
  serverVersion: string;
  people: {
    agents: ContextPackAgent[];
    owner: ContextPackOwner | null;
  };
  milestone: ContextPackMilestone | null;
  inProgress: ContextPackInProgress[];
  todo: ContextPackTodo[];
  recentProgress: ContextPackProgress | null;
  decisions: ContextPackNote[];
  architecture: ContextPackNote[];
  constraints: ContextPackNote[];
  features: ContextPackNote[];
  investigations: ContextPackNote[];
  summary: ContextPackSummary;
  suggestedAction: SuggestedAction;
}
