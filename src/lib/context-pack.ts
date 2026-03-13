/**
 * Context-pack assembler.
 * Shared logic used by both the HTTP route (GET /context-pack) and the MCP
 * tool (get_context_pack). Aggregates everything an AI agent needs to start a
 * session in a single parallel read — no sequential round-trips.
 */

import type { DirectoryMarkdownParser } from "./parser/directory/parser.ts";
import type { Task } from "./types.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ContextPackAgent {
  id: string;
  name: string;
  agentType: string;
}

export interface ContextPackOwner {
  id: string;
  name: string;
}

export interface ContextPackMilestone {
  id: string;
  name: string;
  status: string;
  description?: string;
  target?: string;
  taskCount: number;
  doneCount: number;
}

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

export interface ContextPackTodo {
  id: string;
  title: string;
  priority?: number;
  tags: string[];
  milestone?: string;
  ready: boolean;
}

export interface ContextPackNote {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ContextPackProgress {
  id: string;
  title: string;
  updatedAt: string;
  excerpt: string;
}

export interface ContextPackSummary {
  openMilestones: number;
  totalInProgress: number;
  totalTodo: number;
  staleTasks: number;
}

export interface ContextPack {
  generatedAt: string;
  project: string;
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
  summary: ContextPackSummary;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const collect = (list: Task[]) => {
    for (const t of list) {
      result.push(t);
      if (t.children) collect(t.children);
    }
  };
  collect(tasks);
  return result;
}

function descriptionExcerpt(
  lines: string[] | undefined,
  maxChars: number,
): string {
  if (!lines || lines.length === 0) return "";
  return lines.join("\n").slice(0, maxChars);
}

/** Collect relevant file paths for a task from two sources (deduped):
 *  1. Explicit `config.files` set by the agent or owner via update_task.
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
  add(task.config.files);
  for (const comment of task.config.comments ?? []) {
    add(
      (comment.metadata as Record<string, unknown> | undefined)?.files_changed,
    );
  }
  return [...seen];
}

function isTaskStale(task: Task, cutoffMs: number): boolean {
  const comments = task.config.comments ?? [];
  if (comments.length === 0) return true;
  const last = comments[comments.length - 1];
  return new Date(last.timestamp).getTime() < cutoffMs;
}

// ---------------------------------------------------------------------------
// Assembler
// ---------------------------------------------------------------------------

export async function assembleContextPack(
  parser: DirectoryMarkdownParser,
  opts: { project?: string; milestone?: string },
): Promise<ContextPack> {
  const { project, milestone: milestoneFilter } = opts;
  const projectLower = project?.toLowerCase();

  // All reads in parallel — no sequential calls.
  const [allTasks, allNotes, allMilestones, allPeople] = await Promise.all([
    parser.readTasks(),
    parser.readNotes(),
    parser.readMilestones(),
    parser.readPeople(),
  ]);

  const flat = flattenTasks(allTasks);
  const taskById = new Map<string, Task>(flat.map((t) => [t.id, t]));

  // Task filtering by project
  const projectTasks = projectLower
    ? flat.filter(
      (t) => (t.config.project || "").toLowerCase() === projectLower,
    )
    : flat;

  const inProgressTasks = projectTasks.filter(
    (t) => t.section === "In Progress",
  );
  const todoTasks = projectTasks.filter((t) => t.section === "Todo");

  // Ready: all blockers are Done or completed
  const isReady = (task: Task): boolean =>
    (task.config.blocked_by ?? []).every((id) => {
      const blocker = taskById.get(id);
      return !blocker || blocker.completed || blocker.section === "Done";
    });

  // Todo: sorted by priority asc, top 10
  const sortedTodo = [...todoTasks]
    .sort((a, b) => (a.config.priority ?? 99) - (b.config.priority ?? 99))
    .slice(0, 10);

  // Milestone filtering: include milestones without a project (global) or matching project
  const projectMilestones = projectLower
    ? allMilestones.filter(
      (m) => !m.project || m.project.toLowerCase() === projectLower,
    )
    : allMilestones;

  const openMilestones = projectMilestones.filter((m) => m.status === "open");

  // Active milestone: explicit param or most recently created open one
  let activeMilestone: (typeof allMilestones)[0] | null = null;
  if (milestoneFilter) {
    activeMilestone = projectMilestones.find((m) =>
      m.name === milestoneFilter
    ) ?? null;
  } else {
    // IDs contain timestamps — sort descending to get the newest
    activeMilestone = [...openMilestones].sort((a, b) =>
      b.id.localeCompare(a.id)
    )[0] ?? null;
  }

  let milestoneInfo: ContextPackMilestone | null = null;
  if (activeMilestone) {
    const linked = flat.filter(
      (t) => t.config.milestone === activeMilestone!.name,
    );
    const doneCount = linked.filter(
      (t) => t.section === "Done" || t.completed,
    ).length;
    milestoneInfo = {
      id: activeMilestone.id,
      name: activeMilestone.name,
      status: activeMilestone.status,
      description: activeMilestone.description,
      target: activeMilestone.target,
      taskCount: linked.length,
      doneCount,
    };
  }

  // Notes scoped to project (exact match — notes without project are excluded)
  const scopedNotes = projectLower
    ? allNotes.filter(
      (n) => (n.project || "").toLowerCase() === projectLower,
    )
    : allNotes;

  const progressNotes = [...scopedNotes]
    .filter((n) => n.title.toLowerCase().startsWith("[progress]"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const newest = progressNotes[0] ?? null;
  const recentProgress: ContextPackProgress | null = newest
    ? {
      id: newest.id,
      title: newest.title,
      updatedAt: newest.updatedAt,
      excerpt: newest.content.slice(0, 500),
    }
    : null;

  const toNoteRef = (
    n: (typeof scopedNotes)[0],
  ): ContextPackNote => ({ id: n.id, title: n.title, updatedAt: n.updatedAt });

  const decisions = scopedNotes
    .filter((n) => n.title.toLowerCase().startsWith("[decision]"))
    .map(toNoteRef);

  const architecture = scopedNotes
    .filter((n) => n.title.toLowerCase().startsWith("[architecture]"))
    .map(toNoteRef);

  const constraints = scopedNotes
    .filter((n) => n.title.toLowerCase().startsWith("[constraint]"))
    .map(toNoteRef);

  // People
  const agents = allPeople
    .filter((p) => p.agentType && p.agentType !== "human")
    .map((p) => ({ id: p.id, name: p.name, agentType: p.agentType! }));
  const ownerPerson =
    allPeople.find((p) => !p.agentType || p.agentType === "human") ?? null;

  // Stale: in-progress with no comment in the last 24 h
  const staleCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const staleTasks =
    inProgressTasks.filter((t) => isTaskStale(t, staleCutoff)).length;

  return {
    generatedAt: new Date().toISOString(),
    project: project ?? "",
    people: {
      agents,
      owner: ownerPerson
        ? { id: ownerPerson.id, name: ownerPerson.name }
        : null,
    },
    milestone: milestoneInfo,
    inProgress: inProgressTasks.map((t) => ({
      id: t.id,
      title: t.title,
      section: t.section,
      assignee: t.config.assignee,
      milestone: t.config.milestone,
      description: descriptionExcerpt(t.description, 300),
      blockedBy: t.config.blocked_by ?? [],
      relevantFiles: extractRelevantFiles(t),
    })),
    todo: sortedTodo.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.config.priority,
      tags: t.config.tags ?? [],
      milestone: t.config.milestone,
      ready: isReady(t),
    })),
    recentProgress,
    decisions,
    architecture,
    constraints,
    summary: {
      openMilestones: openMilestones.length,
      totalInProgress: inProgressTasks.length,
      totalTodo: todoTasks.length,
      staleTasks,
    },
  };
}
