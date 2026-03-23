// MCP tools for task operations — thin wrappers over TaskService.
// All Zod schemas derived from types/task.types.ts — single source of truth.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPeopleService, getTaskService } from "../../singletons/services.ts";
import {
  LinkIssueInputSchema,
  LinkPRInputSchema,
  UnlinkGitHubInputSchema,
} from "../../types/github.types.ts";
import {
  AddAttachmentsInputSchema,
  AddCommentInputSchema,
  ApproveTaskInputSchema,
  BatchUpdateItemSchema,
  ClaimTaskInputSchema,
  CreateTaskSchema,
  ListTaskOptionsSchema,
  MoveTaskInputSchema,
  RejectTaskInputSchema,
  RequestApprovalInputSchema,
  SweepStaleClaimsInputSchema,
  TaskSchema,
  UpdateTaskSchema,
} from "../../types/task.types.ts";
import {
  ClaimConflictError,
  ClaimGuardError,
  RevisionConflictError,
} from "../../services/task.service.ts";
import { err, ok } from "../utils.ts";

export function registerTaskTools(server: McpServer): void {
  const service = getTaskService();

  // ── list_tasks ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_tasks",
    {
      description:
        "List all tasks in the project. Filter by section, project, or milestone.",
      inputSchema: {
        ...ListTaskOptionsSchema.shape,
        priority: z.number().int().min(1).max(5).optional().describe(
          "Filter by priority level (1 = highest, 5 = lowest)",
        ),
        completed: z.boolean().optional().describe(
          "Filter by completion state (false = open only, true = completed only)",
        ),
      },
    },
    async ({ priority, completed, ...options }) => {
      let tasks = await service.list(options);
      if (priority !== undefined) {
        tasks = tasks.filter((t) => t.priority === priority);
      }
      if (completed !== undefined) {
        tasks = tasks.filter((t) => t.completed === completed);
      }
      return ok(tasks);
    },
  );

  // ── get_task ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_task",
    {
      description: "Get a single task by its ID.",
      inputSchema: { id: TaskSchema.shape.id.describe("Task ID") },
    },
    async ({ id }) => {
      const task = await service.getById(id);
      if (!task) return err(`Task '${id}' not found`);
      return ok(task);
    },
  );

  // ── get_task_by_name ────────────────────────────────────────────────────
  server.registerTool(
    "get_task_by_name",
    {
      description:
        "Get a task by its title (case-insensitive). Prefer this over list_tasks when the exact title is known.",
      inputSchema: {
        name: z.string().describe("Task title"),
      },
    },
    async ({ name }) => {
      const task = await service.getByName(name);
      if (!task) return err(`Task '${name}' not found`);
      return ok(task);
    },
  );

  // ── get_task_slim ───────────────────────────────────────────────────────
  server.registerTool(
    "get_task_slim",
    {
      description:
        "Get a minimal view of a task by ID. Returns only id, title, description, section, milestone, blockedBy, and the last N comments. " +
        "Omits config fields, timestamps, revision, assignee, effort, dates, and files. " +
        "Use instead of get_task to reduce token usage when full task details are not needed.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        last_comments: z.number().int().min(0).max(20).optional().describe(
          "Number of most-recent comments to include (default: 5, max: 20)",
        ),
      },
    },
    async ({ id, last_comments }) => {
      const task = await service.getById(id);
      if (!task) return err(`Task '${id}' not found`);
      const n = last_comments ?? 5;
      const comments = task.comments ?? [];
      return ok({
        id: task.id,
        title: task.title,
        description: task.description?.join("\n"),
        section: task.section,
        milestone: task.milestone,
        blockedBy: task.blocked_by,
        comments: comments.slice(-n),
      });
    },
  );

  // ── create_task ─────────────────────────────────────────────────────────
  server.registerTool(
    "create_task",
    {
      description: "Create a new task in the project.",
      inputSchema: {
        ...CreateTaskSchema.shape,
        description: z.string().optional().describe(
          "Task description (markdown)",
        ),
        withResult: z.boolean().optional().describe(
          "Return the full created task (default: false — returns only { id })",
        ),
        claim: z.boolean().optional().describe(
          "Atomic create-and-claim. Sets section to 'In Progress', " +
            "records claimedBy/claimedAt. Requires assignee.",
        ),
      },
    },
    async ({ description, withResult, claim, ...fields }) => {
      if (claim && !fields.assignee) {
        return err("claim requires assignee to be set");
      }

      const data = {
        ...fields,
        ...(description ? { description: description.split("\n") } : {}),
        ...(claim
          ? {
            section: "In Progress",
            claimedBy: fields.assignee,
            claimedAt: new Date().toISOString(),
          }
          : {}),
      };

      const task = await service.create(data);
      return ok(withResult ? task : { id: task.id });
    },
  );

  // ── update_task ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_task",
    {
      description: "Update an existing task's fields.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...UpdateTaskSchema.shape,
        description: z.string().optional().describe(
          "Full replacement description (markdown)",
        ),
        expected_revision: z.number().int().optional().describe(
          "If provided, reject with REVISION_CONFLICT when the task's current revision does not match. Use for optimistic locking in multi-agent scenarios.",
        ),
        agent_id: z.string().optional().describe(
          "Person ID of the calling agent. When provided, In Progress tasks claimed by a different agent are rejected with CLAIM_GUARD error.",
        ),
        withResult: z.boolean().optional().describe(
          "Return the full updated task (default: false — returns only { id, success })",
        ),
      },
    },
    async (
      { id, description, expected_revision, agent_id, withResult, ...fields },
    ) => {
      try {
        const data = {
          ...fields,
          ...(description !== undefined
            ? { description: description.split("\n") }
            : {}),
        };
        const task = await service.update(
          id,
          data,
          expected_revision,
          agent_id,
        );
        if (!task) return err(`Task '${id}' not found`);
        return ok(
          withResult ? { id, success: true, task } : { id, success: true },
        );
      } catch (e) {
        if (
          e instanceof RevisionConflictError ||
          e instanceof ClaimGuardError
        ) {
          return err(`${e.code}: ${e.message}`);
        }
        throw e;
      }
    },
  );

  // ── delete_task ─────────────────────────────────────────────────────────
  server.registerTool(
    "delete_task",
    {
      description: "Delete a task by its ID.",
      inputSchema: { id: TaskSchema.shape.id.describe("Task ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── claim_task ──────────────────────────────────────────────────────────
  server.registerTool(
    "claim_task",
    {
      description:
        "Atomically claim a task: move it to 'In Progress' and assign it. " +
        "Fails with CLAIM_CONFLICT if the task is not in the expected section " +
        "(default: 'Todo'). Use this instead of update_task when multiple " +
        "agents may compete for the same task.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...ClaimTaskInputSchema.shape,
        expected_revision: z.number().int().optional().describe(
          "If provided, reject with REVISION_CONFLICT when the task's current revision does not match.",
        ),
        withResult: z.boolean().optional().describe(
          "Return the full claimed task (default: false — returns only { id, success })",
        ),
      },
    },
    async (
      { id, assignee, expectedSection, expected_revision, withResult },
    ) => {
      try {
        if (expected_revision !== undefined) {
          const current = await service.getById(id);
          if (!current) return err(`Task '${id}' not found`);
          if (current.revision !== expected_revision) {
            return err(
              `REVISION_CONFLICT: expected revision ${expected_revision} but task is at revision ${current.revision}`,
            );
          }
        }
        const task = await service.claimTask(id, assignee, expectedSection);
        if (!task) return err(`Task '${id}' not found`);
        return ok(
          withResult ? { id, success: true, task } : { id, success: true },
        );
      } catch (e) {
        if (e instanceof ClaimConflictError) return err(e.message);
        throw e;
      }
    },
  );

  // ── move_task ───────────────────────────────────────────────────────────
  server.registerTool(
    "move_task",
    {
      description: "Move a task to a different section (column).",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...MoveTaskInputSchema.shape,
      },
    },
    async ({ id, section }) => {
      const task = await service.moveTask(id, section);
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── batch_update_tasks ──────────────────────────────────────────────────
  server.registerTool(
    "batch_update_tasks",
    {
      description:
        "Update multiple tasks in a single call. Each entry follows the " +
        "same fields as update_task. Returns per-task success/error results. " +
        "Use this to move a batch to In Progress, add comments to several " +
        "tasks, or move a batch to Done in one round-trip.",
      inputSchema: {
        updates: z.array(BatchUpdateItemSchema).min(1).max(50).describe(
          "Array of task updates (1-50). Each entry needs at least an id.",
        ),
      },
    },
    async ({ updates }) => {
      const result = await service.batchUpdate(updates);
      return ok({
        updated: result.succeeded.length,
        total: updates.length,
        results: [
          ...result.succeeded.map((s) => ({ id: s.id, success: true })),
          ...result.failed.map((f) => ({
            id: f.id,
            success: false,
            error: f.error,
          })),
        ],
      });
    },
  );

  // ── add_task_comment ────────────────────────────────────────────────────
  server.registerTool(
    "add_task_comment",
    {
      description:
        "Add a comment to a task's comment thread. Use this to track progress, note what was done, or record a commit hash. Comments are stored separately from the task description.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        comment: z.string().describe(
          "Comment text. E.g. '[v0.7.1] Fixed by commit abc1234 — ...'",
        ),
        author: AddCommentInputSchema.shape.author,
        metadata: AddCommentInputSchema.shape.metadata,
      },
    },
    async ({ id, comment, author, metadata }) => {
      const result = await service.addComment(
        id,
        comment,
        author ?? "Claude",
        metadata,
      );
      if (!result) return err(`Task '${id}' not found`);
      return ok({ success: true, commentId: result.id });
    },
  );

  // ── add_task_attachments ────────────────────────────────────────────────
  server.registerTool(
    "add_task_attachments",
    {
      description: "Add file attachment paths to a task's attachments field.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        paths: AddAttachmentsInputSchema.shape.paths,
      },
    },
    async ({ id, paths }) => {
      const task = await service.addAttachments(id, paths);
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── get_next_task ───────────────────────────────────────────────────────
  server.registerTool(
    "get_next_task",
    {
      description:
        "Find the highest-priority ready task matching an agent's skills. " +
        "Cross-references task tags with the agent's skills, " +
        "sorted by priority. Falls back to any ready task. " +
        "Returns one task or null.",
      inputSchema: {
        agent_id: z.string().describe("Person ID of the agent"),
        project: z.string().optional().describe(
          "Filter by project name (matches task project)",
        ),
      },
    },
    async ({ agent_id, project }) => {
      const person = await getPeopleService().getById(agent_id);
      const skills = person?.skills ?? [];

      const task = await service.getNextTask(agent_id, skills);
      if (!task) return ok(null);
      if (
        project && (task.project ?? "").toLowerCase() !== project.toLowerCase()
      ) {
        return ok(null);
      }
      return ok(task);
    },
  );

  // ── sweep_stale_claims ──────────────────────────────────────────────────
  server.registerTool(
    "sweep_stale_claims",
    {
      description:
        "Release tasks whose claim has expired. Scans In Progress tasks " +
        "where claimedAt + TTL has passed, moves them back to Todo, clears " +
        "claimedBy/claimedAt. Returns the list of released task IDs.",
      inputSchema: {
        ttl_minutes: SweepStaleClaimsInputSchema.shape.ttlMinutes.describe(
          "Claim TTL in minutes (default: 60). Tasks claimed longer ago are released.",
        ),
      },
    },
    async ({ ttl_minutes }) => {
      const released = await service.sweepStaleClaims(ttl_minutes ?? 60);
      return ok({ released, count: released.length });
    },
  );

  // ── request_approval ────────────────────────────────────────────────────
  server.registerTool(
    "request_approval",
    {
      description:
        "Submit a task for human review. Attaches a structured summary and moves the task to " +
        "'Pending Review'. At the next boot session the verdict will appear in inProgress " +
        "tasks (if rejected) or the task will be in Done (if approved).",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...RequestApprovalInputSchema.shape,
      },
    },
    async ({ id, requestedBy, summary, commitHash, artifactUrls }) => {
      const task = await service.requestApproval(
        id,
        requestedBy,
        summary,
        commitHash,
        artifactUrls,
      );
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true, taskId: id, section: "Pending Review" });
    },
  );

  // ── approve_task ────────────────────────────────────────────────────────
  server.registerTool(
    "approve_task",
    {
      description: "Approve a task in 'Pending Review'. Moves it to Done. " +
        "Typically called by the human owner or a delegated reviewer.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...ApproveTaskInputSchema.shape,
      },
    },
    async ({ id, decidedBy, feedback }) => {
      const task = await service.approveTask(id, decidedBy, feedback);
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true, taskId: id, section: "Done" });
    },
  );

  // ── reject_task ─────────────────────────────────────────────────────────
  server.registerTool(
    "reject_task",
    {
      description:
        "Reject a task in 'Pending Review'. Moves it back to In Progress. " +
        "Structured rejection type allows the agent to route without parsing prose feedback.",
      inputSchema: {
        id: TaskSchema.shape.id.describe("Task ID"),
        ...RejectTaskInputSchema.shape,
      },
    },
    async ({ id, decidedBy, feedback, rejectionType }) => {
      const task = await service.rejectTask(
        id,
        decidedBy,
        feedback,
        rejectionType,
      );
      if (!task) return err(`Task '${id}' not found`);
      return ok({ success: true, taskId: id, section: "In Progress" });
    },
  );

  // ── list_pending_approvals ──────────────────────────────────────────────
  server.registerTool(
    "list_pending_approvals",
    {
      description:
        "List all tasks in 'Pending Review' — the human owner's review queue. " +
        "Returns stubs: id, title, requestedBy, requestedAt, summary excerpt, commit hash.",
      inputSchema: {
        project: z.string().optional().describe(
          "Filter by project name (case-insensitive)",
        ),
      },
    },
    async ({ project }) => {
      const tasks = await service.list({
        section: "Pending Review",
        ...(project ? { project } : {}),
      });
      const stubs = tasks.map((t) => {
        const ar = t.approvalRequest;
        return {
          id: t.id,
          title: t.title,
          project: t.project,
          requestedBy: ar?.requestedBy,
          requestedAt: ar?.requestedAt,
          commitHash: ar?.commitHash,
          summaryExcerpt: ar?.summary?.slice(0, 200),
        };
      });
      return ok(stubs);
    },
  );

  // -- GitHub linking tools --

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
      const task = await service.getById(id);
      if (!task) return err(`Task '${id}' not found`);
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
      const task = await service.getById(id);
      if (!task) return err(`Task '${id}' not found`);
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
      const task = await service.getById(id);
      if (!task) return err(`Task '${id}' not found`);
      const updates: Record<string, unknown> = {};
      if (unlinkIssue !== false) updates.githubIssue = undefined;
      if (unlinkPR !== false) updates.githubPR = undefined;
      await service.update(id, updates);
      return ok({ id, unlinked: true });
    },
  );
}
