import { Hono } from "hono";
import {
  getGoalService,
  getHabitService,
  getJournalService,
  getMeetingService,
  getTaskService,
} from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";
import { MeDashboard } from "../me.tsx";

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

  const [allTasks, allGoals, allHabits, allJournal, allMeetings] = await Promise
    .all([
      getTaskService().list({ assignee: person.id }),
      getGoalService().list(),
      getHabitService().list(),
      getJournalService().list(),
      getMeetingService().list(),
    ]);

  const tasks = allTasks.filter((t) =>
    (["Todo", "In Progress", "Pending Review"] as string[]).includes(t.section)
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
    />,
  );
});
