// MCP task tools — GitHub issue/PR linking:
//   github_link_issue, github_link_pr, github_unlink.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TaskSchema } from "../../../types/task.types.ts";
import {
  LinkIssueInputSchema,
  LinkPRInputSchema,
  UnlinkGitHubInputSchema,
} from "../../../types/github.types.ts";
import { ok } from "../../utils.ts";
import type { TaskToolContext } from "./context.ts";

export function registerTaskGithubTools(
  server: McpServer,
  ctx: TaskToolContext,
): void {
  const { service, requireLiveTask } = ctx;

  server.registerTool(
    "github_link_issue",
    {
      description:
        "Link a GitHub issue to a task. Sets githubIssue, githubRepo, and optionally githubPR on the task.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...LinkIssueInputSchema.shape,
      },
    },
    async ({ id, githubRepo, issueNumber, prNumber }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const updates: Record<string, unknown> = {
        githubRepo,
        githubIssue: issueNumber,
      };
      if (prNumber) updates.githubPR = prNumber;
      await service.update(id, updates);
      return ok({
        id,
        githubRepo,
        githubIssue: issueNumber,
        githubPR: prNumber,
      });
    },
  );

  server.registerTool(
    "github_link_pr",
    {
      description:
        "Link a GitHub PR to a task. Sets githubPR and githubRepo on the task.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...LinkPRInputSchema.shape,
      },
    },
    async ({ id, githubRepo, prNumber }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      await service.update(id, { githubRepo, githubPR: prNumber });
      return ok({ id, githubRepo, githubPR: prNumber });
    },
  );

  server.registerTool(
    "github_unlink",
    {
      description: "Remove GitHub issue and/or PR link from a task.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...UnlinkGitHubInputSchema.shape,
      },
    },
    async ({ id, unlinkIssue, unlinkPR }) => {
      const guard = await requireLiveTask(id);
      if (guard.err) return guard.err;
      const updates: Record<string, unknown> = {};
      if (unlinkIssue !== false) updates.githubIssue = undefined;
      if (unlinkPR !== false) updates.githubPR = undefined;
      await service.update(id, updates);
      return ok({ id, unlinked: true });
    },
  );
}
