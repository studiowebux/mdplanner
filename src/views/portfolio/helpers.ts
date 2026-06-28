// Portfolio dashboard helpers — pure list transforms (sort/filter, section
// abbreviations) plus the dashboard data builder that aggregates tasks,
// milestones, and GitHub stats per portfolio item. Extracted from routes.tsx so
// the route file stays focused on wiring.

import { log } from "../../singletons/logger.ts";
import {
  getGitHubService,
  getMilestoneService,
  getNoteService,
  getPortfolioService,
  getTaskService,
} from "../../singletons/services.ts";
import { getSectionOrder } from "../../constants/mod.ts";
import { ciEquals, ciIncludes } from "../../utils/string.ts";
import type { PortfolioDashboardItem } from "../../types/portfolio.types.ts";
import type { VcsProvider } from "../../types/github.types.ts";

export function sectionAbbrev(name: string): string {
  return name.split(/\s+/).map((w) => w[0].toUpperCase()).join("");
}

export function buildSectionMap(): { abbrev: string; full: string }[] {
  return getSectionOrder().map((s) => ({ abbrev: sectionAbbrev(s), full: s }));
}

type PortfolioItem = Awaited<
  ReturnType<ReturnType<typeof getPortfolioService>["list"]>
>[number];
type TaskList = Awaited<ReturnType<ReturnType<typeof getTaskService>["list"]>>;
type NoteList = Awaited<ReturnType<ReturnType<typeof getNoteService>["list"]>>;
type MilestoneList = Awaited<
  ReturnType<ReturnType<typeof getMilestoneService>["list"]>
>;
type GitHubSvc = ReturnType<typeof getGitHubService>;

// ---------------------------------------------------------------------------
// Project references — entities that point at a portfolio item by `project`
// name. Read-only link list for the detail page; cheap full-list + filter,
// same pattern as the dashboard task grouping. Archived rows are excluded
// (consistent with global search).
// ---------------------------------------------------------------------------

export type ProjectReference = { id: string; title: string };
export type ProjectReferences = {
  tasks: ProjectReference[];
  notes: ProjectReference[];
};

function projectRefs<
  T extends {
    id: string;
    title: string;
    project?: string | null;
    archived?: boolean;
  },
>(
  rows: T[],
  projectName: string,
): ProjectReference[] {
  return rows
    .filter((r) => !r.archived && ciEquals(r.project ?? "", projectName))
    .map((r) => ({ id: r.id, title: r.title }));
}

/** Gather tasks + notes referencing `projectName` (by their `project` field). */
export function gatherProjectReferences(
  projectName: string,
  tasks: TaskList,
  notes: NoteList,
): ProjectReferences {
  return {
    tasks: projectRefs(tasks, projectName),
    notes: projectRefs(notes, projectName),
  };
}

/** Group entities by their lowercased `project` field. */
function groupByProject<T extends { project?: string | null }>(
  rows: T[],
): Map<string, T[]> {
  const byProject = new Map<string, T[]>();
  for (const row of rows) {
    const key = (row.project ?? "").toLowerCase();
    const arr = byProject.get(key);
    if (arr) arr.push(row);
    else byProject.set(key, [row]);
  }
  return byProject;
}

/** Most recent of: task updates, the item's own update, and status updates. */
function lastActivityOf(
  item: PortfolioItem,
  projectTasks: TaskList,
): string | null {
  let lastActivity: string | null = null;
  const bump = (d?: string | null) => {
    if (d && (!lastActivity || d > lastActivity)) lastActivity = d;
  };
  for (const t of projectTasks) bump(t.updatedAt);
  bump(item.updatedAt);
  for (const su of item.statusUpdates ?? []) bump(su.date);
  return lastActivity;
}

/** Fetch repo + CI stats for a portfolio item; null on missing repo or error. */
async function buildGithubStats(
  svc: GitHubSvc,
  repoName: string,
  provider?: VcsProvider | null,
): Promise<PortfolioDashboardItem["github"]> {
  try {
    const [repo, { runs }] = await Promise.all([
      svc.getRepo(repoName, provider),
      svc.listWorkflowRuns(repoName, { perPage: 10 }, provider),
    ]);
    const completed = runs.filter((r) => r.status === "completed");
    const successes = completed.filter((r) => r.conclusion === "success");
    return {
      lastCommitDate: repo.lastCommitAt,
      openPrs: repo.openPRs,
      openIssues: repo.openIssues,
      ciSuccessRate: completed.length > 0
        ? Math.round((successes.length / completed.length) * 100)
        : null,
    };
  } catch (err) {
    log.warn(`[portfolio] GitHub data fetch failed for ${repoName}:`, err);
    return null;
  }
}

async function buildDashboardItem(
  item: PortfolioItem,
  tasksByProject: Map<string, TaskList>,
  milestonesByProject: Map<string, MilestoneList>,
  sections: readonly string[],
  githubSvc: GitHubSvc,
): Promise<PortfolioDashboardItem> {
  const projectTasks = tasksByProject.get(item.name.toLowerCase()) ?? [];
  const projectMilestones = milestonesByProject.get(item.name.toLowerCase()) ??
    [];

  const tasks: Record<string, number> = {};
  for (const section of sections) {
    tasks[sectionAbbrev(section)] = projectTasks.filter((t) =>
      ciEquals(t.section, section)
    ).length;
  }

  const activeMilestone = projectMilestones.find((m) => m.status === "open");
  const milestone = activeMilestone
    ? {
      name: activeMilestone.name,
      completionPct: activeMilestone.progress ?? 0,
    }
    : null;

  const github = item.githubRepo
    ? await buildGithubStats(githubSvc, item.githubRepo, item.vcsProvider)
    : null;

  return {
    id: item.id,
    name: item.name,
    status: item.status,
    category: item.category,
    githubRepo: item.githubRepo,
    tasks,
    lastActivity: lastActivityOf(item, projectTasks),
    milestone,
    github,
  };
}

export async function fetchDashboardItems(): Promise<PortfolioDashboardItem[]> {
  const [items, allTasks, allMilestones] = await Promise.all([
    getPortfolioService().list(),
    getTaskService().list(),
    getMilestoneService().list(),
  ]);

  const githubSvc = getGitHubService();
  const sections = getSectionOrder();
  const tasksByProject = groupByProject(allTasks);
  const milestonesByProject = groupByProject(allMilestones);

  return Promise.all(
    items.map((item) =>
      buildDashboardItem(
        item,
        tasksByProject,
        milestonesByProject,
        sections,
        githubSvc,
      )
    ),
  );
}

// ---------------------------------------------------------------------------
// Grid grouping — client → category → status-coloured cards. Pure in-memory
// pass over list() (already loaded for list/dashboard). Archived items are
// excluded; clientless items fall into a "No client" bucket sorted last;
// empty categories fall into "Uncategorized". Categories sort alphabetically;
// items within a category sort by name. (Build ticket task_1781387420081_u9yph1)
// ---------------------------------------------------------------------------

export const GRID_NO_CLIENT = "No client";
export const GRID_UNCATEGORIZED = "Uncategorized";

export type GridCategoryGroup = { category: string; items: PortfolioItem[] };
export type GridClientGroup = {
  client: string;
  categories: GridCategoryGroup[];
};

export function groupPortfolioByClient(
  items: PortfolioItem[],
): GridClientGroup[] {
  const byClient = new Map<string, Map<string, PortfolioItem[]>>();
  for (const item of items) {
    if (item.archived) continue;
    const client = item.client?.trim() || GRID_NO_CLIENT;
    const category = item.category?.trim() || GRID_UNCATEGORIZED;
    let categories = byClient.get(client);
    if (!categories) {
      categories = new Map<string, PortfolioItem[]>();
      byClient.set(client, categories);
    }
    const bucket = categories.get(category);
    if (bucket) bucket.push(item);
    else categories.set(category, [item]);
  }

  const clients = [...byClient.keys()].sort((a, b) => {
    // "No client" bucket always last; everything else alphabetical.
    if (a === GRID_NO_CLIENT) return 1;
    if (b === GRID_NO_CLIENT) return -1;
    return a.localeCompare(b);
  });

  return clients.map((client) => {
    const categories = [...byClient.get(client)!.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, list]) => ({
        category,
        items: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      }));
    return { client, categories };
  });
}

// Sort-key → value accessor. Each returns a same-typed comparable for a column.
type SortAccessor = (i: PortfolioDashboardItem) => string | number;
const SORT_ACCESSORS: Record<string, SortAccessor> = {
  name: (i) => i.name,
  status: (i) => i.status,
  activity: (i) => i.lastActivity ?? "",
  milestone: (i) => i.milestone?.name ?? "",
  commit: (i) => i.github?.lastCommitDate ?? "",
  prs: (i) => i.github?.openPrs ?? 0,
  issues: (i) => i.github?.openIssues ?? 0,
  ci: (i) => i.github?.ciSuccessRate ?? -1,
};

/** Resolve the accessor for a sort key, including dynamic `section_<abbrev>`. */
function sortAccessor(sort: string): SortAccessor | null {
  if (sort in SORT_ACCESSORS) return SORT_ACCESSORS[sort];
  if (sort.startsWith("section_")) {
    const abbrev = sort.slice("section_".length);
    return (i) => i.tasks[abbrev] ?? 0;
  }
  return null;
}

export function sortItems(
  items: PortfolioDashboardItem[],
  sort?: string,
  order?: string,
): PortfolioDashboardItem[] {
  if (!sort) return items;
  const accessor = sortAccessor(sort);
  if (!accessor) return [...items];
  const dir = order === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = accessor(a);
    const vb = accessor(b);
    return va < vb ? -dir : va > vb ? dir : 0;
  });
}

export function filterItems(
  items: PortfolioDashboardItem[],
  staleDays: number,
  q?: string,
  filter?: string,
): PortfolioDashboardItem[] {
  let result = items;
  if (q) {
    result = result.filter((i) => ciIncludes(i.name, q));
  }
  if (filter === "stale") {
    const cutoff = Date.now() - staleDays * 86_400_000;
    result = result.filter(
      (i) => !i.lastActivity || new Date(i.lastActivity).getTime() < cutoff,
    );
  } else if (filter) {
    result = result.filter((i) => i.status === filter);
  }
  return result;
}
