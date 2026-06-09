import { Hono } from "hono";
import {
  getGoalService,
  getHabitService,
  getJournalService,
  getMeetingService,
  getProjectService,
  getTaskService,
} from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";
import { MeDashboard } from "../me.tsx";
import { resolveUserScope } from "../../utils/actor.ts";
import { DEFAULT_TASKS_PER_SECTION } from "../../domains/task/constants.tsx";
import { toHtml } from "../../utils/html.ts";
import {
  MY_ACTIVE_SECTIONS,
  MyTasksChunk,
  sortMyTasks,
} from "../components/my-tasks-list.tsx";

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
