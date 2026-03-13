/**
 * MCP Prompts — slash commands for session workflow.
 * Registered via server.registerPrompt(). Surfaces as /slash-commands in Claude Code.
 *
 * Dynamic prompts (/daily, /next) fetch live task data at render time.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../lib/project-manager.ts";
import { Task } from "../lib/types.ts";

export function registerPrompts(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  // ---------------------------------------------------------------------------
  // /session-start [project]
  // Phase 1 boot sequence pre-filled with project context.
  // ---------------------------------------------------------------------------
  server.registerPrompt(
    "session-start",
    {
      description:
        "Run the full Phase 1 boot sequence. Reads local-dev.md, loads context pack, checks git state.",
      argsSchema: {
        project: z.string().optional().describe(
          "MCP project name to scope context (e.g. 'MD Planner')",
        ),
      },
    },
    async ({ project }) => {
      const projectClause = project
        ? `The project is **${project}**.`
        : "Determine the project name from local-dev.md.";
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Run Phase 1 — Boot now.

${projectClause}

Steps:
1. Read \`local-dev.md\` — extract mcp-project, codebase path, owner ID, Claude ID, active milestone.
2. Call \`get_context_pack\` scoped to the project.
3. If \`inProgress\` tasks exist, resume them. If \`recentProgress\` is insufficient, call \`get_note\` for the full entry.
4. Run git state check from the codebase directory: \`git branch\`, \`git log --oneline -5\`, \`gh pr list --state open\`.
5. Report current branch, open PRs, active milestone, and next task to work on.`,
          },
        }],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // /end-session
  // Write progress note + HANDOFF.md + move completed tasks to Pending Review.
  // ---------------------------------------------------------------------------
  server.registerPrompt(
    "end-session",
    {
      description:
        "Close the session: write a progress note, create HANDOFF.md, and move completed in-progress tasks to Pending Review.",
      argsSchema: {},
    },
    async () => {
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Run Phase 3 + Phase 4 — Session Close now.

1. Write a \`[progress]\` note to MDPlanner summarising what was accomplished this session (title format: \`[progress] <project> — YYYY-MM-DD <summary>\`).
2. For each task that was completed this session: move it to Pending Review, assign to owner, add a comment with commit hash and summary.
3. Write \`HANDOFF.md\` in the brain directory with: current branch, in-progress task IDs + next step, and key facts needed to resume without calling get_context_pack.
4. Report what was written.`,
          },
        }],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // /daily [project]
  // Live summary of tasks completed, in-progress, and blocked since yesterday.
  // ---------------------------------------------------------------------------
  server.registerPrompt(
    "daily",
    {
      description:
        "Daily standup summary: tasks done, in-progress, and blocked for the project.",
      argsSchema: {
        project: z.string().optional().describe("Project name to scope the summary"),
      },
    },
    async ({ project }) => {
      const allTasks = await parser.readTasks();
      const flat = flattenTasks(allTasks);
      const projectLower = project?.toLowerCase();

      const scoped = projectLower
        ? flat.filter((t) =>
          (t.config?.project ?? "").toLowerCase() === projectLower
        )
        : flat;

      const yesterday = new Date(Date.now() - 86_400_000).toISOString();

      const done = scoped.filter(
        (t) =>
          (t.section === "Done" || t.section === "Pending Review") &&
          (t.updatedAt ?? "") >= yesterday,
      );
      const inProgress = scoped.filter((t) => t.section === "In Progress");
      const blocked = scoped.filter(
        (t) =>
          t.section === "Todo" && (t.config?.blocked_by ?? []).length > 0,
      );

      const fmt = (tasks: typeof flat) =>
        tasks.length === 0
          ? "  none"
          : tasks.map((t) => `  - [${t.id}] ${t.title}`).join("\n");

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Daily standup${project ? ` for **${project}**` : ""}:

**Done / Pending Review (last 24h):**
${fmt(done)}

**In Progress:**
${fmt(inProgress)}

**Blocked:**
${fmt(blocked)}

Summarise this for a standup. Flag anything that needs attention.`,
          },
        }],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // /approve [task-id]
  // Approve a Pending Review task and move it to Done.
  // ---------------------------------------------------------------------------
  server.registerPrompt(
    "approve",
    {
      description: "Approve a task in Pending Review and move it to Done.",
      argsSchema: {
        task_id: z.string().describe("ID of the task to approve"),
        feedback: z.string().optional().describe("Optional approval note"),
      },
    },
    async ({ task_id, feedback }) => {
      const feedbackClause = feedback
        ? `Leave this feedback: "${feedback}".`
        : "";
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Approve task \`${task_id}\`.

Call \`approve_task\` with id="${task_id}"${feedback ? ` and feedback="${feedback}"` : ""}. ${feedbackClause}
Then confirm the task is now in Done and report its title.`,
          },
        }],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // /next [project]
  // Return the highest-priority ready task — what to work on right now.
  // ---------------------------------------------------------------------------
  server.registerPrompt(
    "next",
    {
      description:
        "Return the highest-priority ready task for the project — what to work on right now.",
      argsSchema: {
        project: z.string().optional().describe("Project name to scope the search"),
      },
    },
    async ({ project }) => {
      const allTasks = await parser.readTasks();
      const flat = flattenTasks(allTasks);
      const projectLower = project?.toLowerCase();

      const todo = flat.filter((t) => {
        if (t.section !== "Todo") return false;
        if (projectLower) {
          if ((t.config?.project ?? "").toLowerCase() !== projectLower) {
            return false;
          }
        }
        const blockers = t.config?.blocked_by ?? [];
        const allResolved = blockers.every((bid: string) => {
          const blocker = flat.find((b) => b.id === bid);
          return !blocker || blocker.completed ||
            blocker.section.toLowerCase() === "done";
        });
        return allResolved;
      });

      todo.sort((a, b) =>
        (a.config?.priority ?? 5) - (b.config?.priority ?? 5)
      );

      const next = todo[0];
      const nextLine = next
        ? `The next task is **[${next.id}] ${next.title}** (priority ${
          next.config?.priority ?? "none"
        }, milestone: ${next.config?.milestone ?? "none"}).`
        : "No ready tasks found in Todo.";

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `${nextLine}

${
              next
                ? `Pick it up: move to In Progress, assign yourself, and start implementation.`
                : `Check the Backlog or ask the owner to move tasks into Todo.`
            }`,
          },
        }],
      };
    },
  );
}

function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  for (const t of tasks) {
    result.push(t);
    if (t.children?.length) result.push(...flattenTasks(t.children));
  }
  return result;
}
