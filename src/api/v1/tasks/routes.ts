// Task CRUD + workflow routes — OpenAPIHono router consumed by api/mod.ts.
//
// The route definitions are grouped by concern into ./*.routes.ts modules and
// registered here. tasksRouter is the only export (mounted at /tasks). The
// crud module is registered FIRST so its static paths (/next,
// /sweep-stale-claims, /batch) precede /{id} for correct Hono matching.

import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppVariables } from "../../../types/app.ts";
import { registerTaskCrudRoutes } from "./crud.routes.ts";
import { registerTaskWorkflowRoutes } from "./workflow.routes.ts";
import { registerTaskCommentRoutes } from "./comments.routes.ts";
import { registerTaskApprovalRoutes } from "./approvals.routes.ts";
import { registerTaskTimeRoutes } from "./time.routes.ts";
import { registerTaskUploadRoutes } from "./uploads.routes.ts";

export const tasksRouter = new OpenAPIHono<{ Variables: AppVariables }>();

registerTaskCrudRoutes(tasksRouter); // list/next/sweep/batch/get/create/update/delete
registerTaskWorkflowRoutes(tasksRouter); // claim/move/reorder/attachments
registerTaskCommentRoutes(tasksRouter); // comment add/update/delete
registerTaskApprovalRoutes(tasksRouter); // request-approval/approve/reject
registerTaskTimeRoutes(tasksRouter); // time entries
registerTaskUploadRoutes(tasksRouter); // file upload/download/delete
