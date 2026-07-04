// MCP tools for task operations — thin wrappers over TaskService.
// All Zod schemas derived from types/task.types.ts — single source of truth.
//
// The tool registrations are grouped by concern into ./tasks/*.ts modules and
// orchestrated here. registerTaskTools is the only public entry point (used by
// mcp/server.ts + the MCP archive-flow tests). The registration ORDER below is
// preserved exactly from the original flat file.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { createTaskToolContext } from "./tasks/context.ts";
import { registerTaskCrudTools } from "./tasks/crud.ts";
import { registerTaskWorkflowTools } from "./tasks/workflow.ts";
import { registerTaskCommentTools } from "./tasks/comments.ts";
import { registerTaskQueueTools } from "./tasks/queue.ts";
import { registerTaskApprovalTools } from "./tasks/approvals.ts";
import { registerTaskTimeTools } from "./tasks/time.ts";
import { registerTaskGithubTools } from "./tasks/github.ts";

export function registerTaskTools(server: McpServer): void {
  const ctx = createTaskToolContext();
  registerTaskCrudTools(server, ctx); // list/get/create/update/delete
  registerTaskWorkflowTools(server, ctx); // claim/move/batch
  registerTaskCommentTools(server, ctx); // comment/attachments
  registerTaskQueueTools(server, ctx); // get_next_task/sweep_stale_claims
  registerTaskApprovalTools(server, ctx); // request/approve/reject/list-pending
  registerTaskTimeTools(server, ctx); // time entries
  registerTaskGithubTools(server, ctx); // github issue/PR linking
}

export const taskModule = defineMcpModule({
  feature: "task",
  register: registerTaskTools,
});
