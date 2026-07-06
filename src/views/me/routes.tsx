import { Hono } from "hono";
import {
  getGitHubService,
  getGoalService,
  getHabitService,
  getJournalService,
  getMeetingService,
  getPortfolioService,
  getProjectService,
  getTaskService,
  getWoodpeckerService,
} from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";
import type { VcsProvider } from "../../types/github.types.ts";
import { MeDashboard } from "../me.tsx";
import { GitHubError } from "../github.tsx";
import {
  MyGitCard,
  type MyGitCi,
  type MyGitIssue,
  type MyGitPR,
} from "../components/my-git-list.tsx";
import { resolveUserScope } from "../../utils/actor.ts";
import { DEFAULT_TASKS_PER_SECTION } from "../../domains/task/constants.tsx";
import { toHtml } from "../../utils/html.ts";
import {
  MY_ACTIVE_SECTIONS,
  MyTasksChunk,
  sortMyTasks,
} from "../components/my-tasks-list.tsx";

/** Latest-pipeline statuses that warrant attention on My Work. */
const CI_ATTENTION_STATUSES = new Set([
  "failure",
  "error",
  "killed",
  "running",
  "pending",
  "started",
]);

export const meRouter = new Hono<{ Variables: AppVariables }>();

meRouter.get("/", async (c) => {
  const person = c.get("activePerson") ?? null;

  if (!person) {
    return c.html(
      <MeDashboard
        {...viewProps(c, "/me")}
        person={null}
        tasks={[]}
        goals={[]}
        habits={[]}
        todayJournal={null}
        timeRows={[]}
        meetings={[]}
        pageSize={DEFAULT_TASKS_PER_SECTION}
      />,
    );
  }

  const today = new Date().toLocaleDateString("en-CA");
  const weekStart = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.toLocaleDateString("en-CA");
  })();
  const sevenDaysOut = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toLocaleDateString("en-CA");
  })();

  const scope = await resolveUserScope(c);
  const [allTasks, allGoals, allHabits, allJournal, allMeetings] = await Promise
    .all([
      getTaskService().list({ assignee: person.id }),
      getGoalService().list(),
      getHabitService().listForUser({}, scope),
      getJournalService().list(),
      getMeetingService().list(),
    ]);

  const config = await getProjectService().getConfig();
  const pageSize = config.tasksPerSection ?? DEFAULT_TASKS_PER_SECTION;

  const tasks = sortMyTasks(
    allTasks.filter((t) =>
      (MY_ACTIVE_SECTIONS as string[]).includes(t.section)
    ),
  );

  const goals = allGoals.filter(
    (g) => g.owner === person.name,
  );

  const habits = allHabits;

  const todayJournal = allJournal.find((e) => e.date === today) ?? null;

  const timeRows = allTasks
    .flatMap((t) =>
      (t.time_entries ?? [])
        .filter((e) => e.person === person.id && e.date >= weekStart)
        .map((e) => ({
          taskId: t.id,
          taskTitle: t.title,
          hours: e.hours,
          date: e.date,
          description: e.description,
        }))
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const meetings = allMeetings
    .filter(
      (m) =>
        m.date >= today &&
        m.date <= sevenDaysOut &&
        (m.attendees ?? []).some((a) => a === person.id || a === person.name),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  return c.html(
    <MeDashboard
      {...viewProps(c, "/me")}
      person={person}
      tasks={tasks}
      goals={goals}
      habits={habits}
      todayJournal={todayJournal}
      timeRows={timeRows}
      meetings={meetings}
      pageSize={pageSize}
    />,
  );
});

// GET /tasks/more — pagination fragment for the My Tasks card. Rebuilds the same
// person-scoped, sorted task list as `/` and returns the next page (offset → +
// pageSize) of items plus a fresh load-more control while more remain.
meRouter.get("/tasks/more", async (c) => {
  const person = c.get("activePerson") ?? null;
  if (!person) return c.body(null, 204);

  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0", 10) || 0);
  const allTasks = await getTaskService().list({ assignee: person.id });
  const tasks = sortMyTasks(
    allTasks.filter((t) =>
      (MY_ACTIVE_SECTIONS as string[]).includes(t.section)
    ),
  );

  const config = await getProjectService().getConfig();
  const pageSize = config.tasksPerSection ?? DEFAULT_TASKS_PER_SECTION;

  return c.html(
    toHtml(<MyTasksChunk tasks={tasks} offset={offset} pageSize={pageSize} />),
  );
});

// GET /git — lazy-loaded "Git" card fragment. Aggregates, across every
// portfolio item with a repo (GitHub + Gitea via the provider pattern) plus
// Woodpecker CI: my open PRs, PRs requesting my review, issues assigned to me,
// and CI pipelines needing attention. "Me" = each provider's authenticated
// token user. Per-repo failures are swallowed so one bad repo never stalls the
// card; a total failure renders GitHubError.
meRouter.get("/git", async (c) => {
  const person = c.get("activePerson") ?? null;
  if (!person) return c.body(null, 204);

  try {
    const items = (await getPortfolioService().list())
      .filter((p) => p.githubRepo);
    const gh = getGitHubService();
    const wp = getWoodpeckerService();
    const wpConfigured = await wp.isConfigured();

    // Resolve my login per provider once (guarded — an unconfigured provider
    // throws; treat as "no identity" so that provider's repos are skipped).
    const loginCache = new Map<string, string | null>();
    const loginFor = async (
      provider: VcsProvider | null | undefined,
    ): Promise<string | null> => {
      const key = provider ?? "default";
      const cached = loginCache.get(key);
      if (cached !== undefined) return cached;
      let login: string | null = null;
      try {
        login = (await gh.getAuthenticatedUser(provider)).login || null;
      } catch {
        login = null;
      }
      loginCache.set(key, login);
      return login;
    };

    const myPRs: MyGitPR[] = [];
    const reviewRequested: MyGitPR[] = [];
    const assignedIssues: MyGitIssue[] = [];
    const ciAttention: MyGitCi[] = [];

    await Promise.all(items.map(async (item) => {
      const repo = item.githubRepo as string;
      const provider = item.vcsProvider;
      const login = await loginFor(provider);

      try {
        const prs = await gh.listPRs(repo, "open", provider);
        for (const pr of prs) {
          const row: MyGitPR = {
            repo,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            htmlUrl: pr.htmlUrl,
          };
          if (login && pr.author === login) myPRs.push(row);
          if (login && pr.requestedReviewers.includes(login)) {
            reviewRequested.push(row);
          }
        }
      } catch { /* skip repo on PR fetch failure */ }

      if (login) {
        try {
          const issues = await gh.listIssues(repo, "open", login, provider);
          for (const issue of issues) {
            assignedIssues.push({
              repo,
              number: issue.number,
              title: issue.title,
              htmlUrl: issue.htmlUrl,
            });
          }
        } catch { /* skip repo on issue fetch failure */ }
      }

      if (wpConfigured) {
        try {
          const pipeline = await wp.latestPipeline(repo);
          if (pipeline && CI_ATTENTION_STATUSES.has(pipeline.status)) {
            ciAttention.push({
              repo,
              number: pipeline.number,
              status: pipeline.status,
              branch: pipeline.branch,
              forgeUrl: pipeline.forgeUrl,
            });
          }
        } catch { /* skip repo on CI fetch failure */ }
      }
    }));

    return c.html(
      toHtml(
        <MyGitCard
          myPRs={myPRs}
          reviewRequested={reviewRequested}
          assignedIssues={assignedIssues}
          ciAttention={ciAttention}
        />,
      ),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(toHtml(<GitHubError message={msg} />));
  }
});
