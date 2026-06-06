// Context-pack assembler — reads from domain services, stores nothing of its
// own (mirrors analytics.service.ts). Fans the section/ready/project filtering
// out to TaskService, the task rollups to MilestoneService, and the
// project/title filtering to NoteService — no filter logic is re-implemented
// here. Section names and tunables come from constants/mod.ts; note `[type]`
// classification reuses the shared `noteType` helper; the stale window reads
// the project's configurable `staleDays`. Only the cross-cutting derivations no
// service owns live locally: progress excerpt, stale detection, relevant-file
// extraction, and the next-action suggestion.
//
// v2 note: operates on the top-level task list returned by TaskService (like
// get_next_task and the analytics collectors). v1 flattened subtasks into the
// pool, but v2 subtasks are embedded `children` without section/milestone/
// priority fields, so they are not board-level work items.

import {
  getMilestoneService,
  getNoteService,
  getPeopleService,
  getProjectService,
  getTaskService,
} from "../singletons/services.ts";
import {
  APP_VERSION,
  BACKLOG_SECTION,
  CONTEXT_PACK_CHECKPOINT_EXCERPT_CHARS,
  CONTEXT_PACK_DESCRIPTION_EXCERPT_CHARS,
  CONTEXT_PACK_NEXT_MILESTONE_CANDIDATES,
  CONTEXT_PACK_PROGRESS_EXCERPT_CHARS,
  CONTEXT_PACK_TODO_LIMIT,
  DEFAULT_STALE_DAYS,
  IN_PROGRESS_SECTION,
  MS_PER_DAY,
  PENDING_REVIEW_SECTION,
  TODO_SECTION,
} from "../constants/mod.ts";
import { noteType } from "../utils/note-type.ts";
import type { Task } from "../types/task.types.ts";
import type { Milestone } from "../types/milestone.types.ts";
import type { Note } from "../types/note.types.ts";
import type {
  ContextPack,
  ContextPackMilestone,
  ContextPackNote,
  ContextPackProgress,
  ContextPackQuery,
  NextMilestoneSuggestion,
  SuggestedAction,
} from "../types/context-pack.types.ts";

// ---------------------------------------------------------------------------
// Helpers — derivations not owned by any single service
// ---------------------------------------------------------------------------

function descriptionExcerpt(
  lines: string[] | undefined,
  maxChars: number,
): string {
  if (!lines || lines.length === 0) return "";
  return lines.join("\n").slice(0, maxChars);
}

/** Collect relevant file paths for a task from two sources (deduped):
 *  1. Explicit `files` set by the agent or owner via update_task.
 *  2. `metadata.files_changed` arrays on task comments (written by git hooks).
 */
function extractRelevantFiles(task: Task): string[] {
  const seen = new Set<string>();
  const add = (paths: unknown) => {
    if (Array.isArray(paths)) {
      for (const p of paths) {
        if (typeof p === "string" && p) seen.add(p);
      }
    }
  };
  add(task.files);
  for (const comment of task.comments ?? []) {
    add(
      (comment.metadata as Record<string, unknown> | undefined)?.files_changed,
    );
  }
  return [...seen];
}

/** A task is stale when its newest comment is older than the cutoff (or it has
 * no comments at all). */
function isTaskStale(task: Task, cutoffMs: number): boolean {
  const comments = task.comments ?? [];
  if (comments.length === 0) return true;
  const last = comments[comments.length - 1];
  return new Date(last.timestamp).getTime() < cutoffMs;
}

/**
 * Cluster Backlog tasks by their first tag and return a milestone suggestion.
 * Picks the largest tag cluster (by task count). Falls back to untagged tasks.
 * Returns undefined when the Backlog is empty.
 */
function computeNextMilestoneSuggestion(
  backlogTasks: Task[],
): NextMilestoneSuggestion | undefined {
  if (backlogTasks.length === 0) return undefined;

  const tagGroups = new Map<string, Task[]>();
  const untagged: Task[] = [];

  for (const task of backlogTasks) {
    const tags = task.tags ?? [];
    if (tags.length === 0) {
      untagged.push(task);
    } else {
      const key = tags[0].toLowerCase();
      const group = tagGroups.get(key) ?? [];
      group.push(task);
      tagGroups.set(key, group);
    }
  }

  // Find the tag group with the most tasks; fall back to untagged
  let bestTag: string | null = null;
  let bestGroup: Task[] = untagged;
  for (const [tag, tasks] of tagGroups) {
    if (tasks.length > bestGroup.length) {
      bestTag = tag;
      bestGroup = tasks;
    }
  }

  if (bestGroup.length === 0) return undefined;

  const sorted = [...bestGroup].sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99),
  );
  const candidateTaskIds = sorted
    .slice(0, CONTEXT_PACK_NEXT_MILESTONE_CANDIDATES)
    .map((t) => t.id);
  const label = bestTag
    ? bestTag.charAt(0).toUpperCase() + bestTag.slice(1)
    : "General";
  const suggestedName = `Next: ${label}`;
  const rationale = bestTag
    ? `${bestGroup.length} Backlog task(s) share the "${bestTag}" tag — largest cluster by count.`
    : `${bestGroup.length} untagged Backlog task(s) form the largest group.`;

  return { suggestedName, rationale, candidateTaskIds };
}

/**
 * Decide the single next action from board state. Reuses TaskService's `ready`
 * determination (passed in via `readyTodo` / `readyTodoIds`, already
 * blocker-resolved) rather than re-deriving blocker state here.
 */
function computeSuggestedAction(
  inProgressTasks: Task[],
  todoTasks: Task[],
  readyTodo: Task[],
  readyTodoIds: Set<string>,
  pendingReviewTasks: Task[],
  backlogTasks: Task[],
): SuggestedAction {
  // 1. Resume an in-progress task
  if (inProgressTasks.length > 0) {
    const task = inProgressTasks[0];
    const comments = task.comments ?? [];
    const lastComment = comments[comments.length - 1];
    const state = lastComment
      ? lastComment.body.split("\n")[0].slice(
        0,
        CONTEXT_PACK_CHECKPOINT_EXCERPT_CHARS,
      )
      : descriptionExcerpt(
        task.description,
        CONTEXT_PACK_CHECKPOINT_EXCERPT_CHARS,
      );
    return {
      type: "resume",
      taskId: task.id,
      taskTitle: task.title,
      reason: `Task "${task.title}" is already in progress.`,
      nextStep: state
        ? `Continue from last checkpoint: ${state}`
        : `Continue implementing "${task.title}".`,
    };
  }

  // 2. A previously-blocked task whose blockers are now resolved — unblock first
  const unblockable = todoTasks.find(
    (t) => (t.blocked_by?.length ?? 0) > 0 && readyTodoIds.has(t.id),
  );
  if (unblockable) {
    return {
      type: "unblock",
      taskId: unblockable.id,
      taskTitle: unblockable.title,
      reason:
        `"${unblockable.title}" was blocked but all its blockers are now done.`,
      nextStep: `Pick up "${unblockable.title}" — blockers resolved.`,
    };
  }

  // 3. Pick the highest-priority ready todo task
  const readyTasks = [...readyTodo].sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99),
  );
  if (readyTasks.length > 0) {
    const task = readyTasks[0];
    return {
      type: "pick-next",
      taskId: task.id,
      taskTitle: task.title,
      reason: `"${task.title}" is the highest-priority ready task.`,
      nextStep: `Claim and start "${task.title}".`,
    };
  }

  // 4. Everything is in review — wait for owner
  if (pendingReviewTasks.length > 0) {
    return {
      type: "wait-review",
      reason:
        `${pendingReviewTasks.length} task(s) are awaiting owner review and no Todo tasks remain.`,
      nextStep: "Wait for the owner to approve or reject the pending tasks.",
      nextMilestoneSuggestion: computeNextMilestoneSuggestion(backlogTasks),
    };
  }

  // 5. No actionable work — owner needs to queue tasks
  return {
    type: "idle",
    reason: "No tasks are in Todo, In Progress, or Pending Review.",
    nextStep: "Ask the owner to move Backlog items to Todo.",
  };
}

function toMilestoneInfo(m: Milestone): ContextPackMilestone {
  return {
    id: m.id,
    name: m.name,
    status: m.status,
    description: m.description ?? undefined,
    target: m.target ?? undefined,
    taskCount: m.taskCount,
    doneCount: m.completedCount,
  };
}

function toNoteStub(n: Note): ContextPackNote {
  return { id: n.id, title: n.title, updatedAt: n.updatedAt };
}

// ---------------------------------------------------------------------------
// Assembler
// ---------------------------------------------------------------------------

/**
 * Assemble the single-call agent boot payload. All section/ready/project
 * filtering is delegated to the domain services; this orchestrator only joins
 * their results and computes the suggested next action.
 */
export async function assembleContextPack(
  opts: ContextPackQuery = {},
): Promise<ContextPack> {
  const { project, milestone: milestoneFilter } = opts;
  const taskSvc = getTaskService();

  const [
    inProgressTasks,
    todoTasks,
    readyTodo,
    pendingReviewTasks,
    backlogTasks,
    openMilestones,
    notes,
    people,
    config,
  ] = await Promise.all([
    taskSvc.list({ project, section: IN_PROGRESS_SECTION }),
    taskSvc.list({ project, section: TODO_SECTION }),
    taskSvc.list({ project, section: TODO_SECTION, ready: true }),
    taskSvc.list({ project, section: PENDING_REVIEW_SECTION }),
    taskSvc.list({ project, section: BACKLOG_SECTION }),
    getMilestoneService().list({ project, status: "open" }),
    getNoteService().list({ project }),
    getPeopleService().list(),
    getProjectService().getConfig(),
  ]);

  const readyTodoIds = new Set(readyTodo.map((t) => t.id));

  // Active milestone: explicit name (any status) or newest open one. IDs embed
  // timestamps, so descending id order surfaces the most recent.
  let activeMilestone: Milestone | null = null;
  if (milestoneFilter) {
    activeMilestone = await getMilestoneService().getByName(milestoneFilter);
  } else {
    activeMilestone = [...openMilestones].sort((a, b) =>
      b.id.localeCompare(a.id)
    )[0] ?? null;
  }

  // Notes grouped once by their `[type]` title prefix (shared classifier).
  const notesByType = new Map<string, Note[]>();
  for (const n of notes) {
    const type = noteType(n.title);
    const group = notesByType.get(type) ?? [];
    group.push(n);
    notesByType.set(type, group);
  }
  const stubs = (type: string): ContextPackNote[] =>
    (notesByType.get(type) ?? []).map(toNoteStub);

  const newestProgress = [...(notesByType.get("progress") ?? [])]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  const recentProgress: ContextPackProgress | null = newestProgress
    ? {
      id: newestProgress.id,
      title: newestProgress.title,
      updatedAt: newestProgress.updatedAt,
      excerpt: newestProgress.content.slice(
        0,
        CONTEXT_PACK_PROGRESS_EXCERPT_CHARS,
      ),
    }
    : null;

  // People: agents are AI/hybrid; the owner is the first human (or untyped).
  const agents = people
    .filter((p) => p.agentType && p.agentType !== "human")
    .map((p) => ({ id: p.id, name: p.name, agentType: p.agentType! }));
  const ownerPerson =
    people.find((p) => !p.agentType || p.agentType === "human") ?? null;

  // Stale: in-progress with no comment within the project's stale window.
  const staleDays = config.staleDays ?? DEFAULT_STALE_DAYS;
  const staleCutoff = Date.now() - staleDays * MS_PER_DAY;
  const staleTasks =
    inProgressTasks.filter((t) => isTaskStale(t, staleCutoff)).length;

  const todo = [...todoTasks]
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .slice(0, CONTEXT_PACK_TODO_LIMIT)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      tags: t.tags ?? [],
      milestone: t.milestone,
      ready: readyTodoIds.has(t.id),
    }));

  return {
    generatedAt: new Date().toISOString(),
    project: project ?? "",
    serverVersion: APP_VERSION,
    people: {
      agents,
      owner: ownerPerson
        ? { id: ownerPerson.id, name: ownerPerson.name }
        : null,
    },
    milestone: activeMilestone ? toMilestoneInfo(activeMilestone) : null,
    inProgress: inProgressTasks.map((t) => ({
      id: t.id,
      title: t.title,
      section: t.section,
      assignee: t.assignee,
      milestone: t.milestone,
      description: descriptionExcerpt(
        t.description,
        CONTEXT_PACK_DESCRIPTION_EXCERPT_CHARS,
      ),
      blockedBy: t.blocked_by ?? [],
      relevantFiles: extractRelevantFiles(t),
    })),
    todo,
    recentProgress,
    decisions: stubs("decision"),
    architecture: stubs("architecture"),
    constraints: stubs("constraint"),
    features: stubs("feature"),
    investigations: stubs("investigation"),
    summary: {
      openMilestones: openMilestones.length,
      totalInProgress: inProgressTasks.length,
      totalTodo: todoTasks.length,
      staleTasks,
    },
    suggestedAction: computeSuggestedAction(
      inProgressTasks,
      todoTasks,
      readyTodo,
      readyTodoIds,
      pendingReviewTasks,
      backlogTasks,
    ),
  };
}
