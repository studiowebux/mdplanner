// Shared types + helpers for the task route modules (crud/workflow/comments/
// approvals/time/uploads). The single tasksRouter instance is built in
// routes.ts and threaded into each register function.

import type { OpenAPIHono } from "@hono/zod-openapi";
import { invalidState } from "../../../types/api.ts";
import type { AppVariables } from "../../../types/app.ts";

export type TasksRouter = OpenAPIHono<{ Variables: AppVariables }>;

/** Canonical 422 payload for archived-task mutations. */
export const taskArchived = (id: string) =>
  invalidState(`Task ${id} is archived`);

/** Canonical 422 response description shared by every guarded mutation route.
 * Inlined per-route to keep OpenAPIHono's literal-type inference happy —
 * a spread loses the 422 literal across the createRoute boundary. */
export const ARCHIVED_RESPONSE_DESC = "Task is archived";
