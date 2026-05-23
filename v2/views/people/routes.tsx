// People routes — factory-generated + custom detail view.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { peopleConfig } from "../../domains/people/config.tsx";
import {
  getGoalService,
  getMeetingService,
  getPeopleService,
  getRetrospectiveService,
  getSearchEngine,
  getTaskService,
  getVacationService,
} from "../../singletons/services.ts";
import type { SearchResult } from "../../types/search.types.ts";
import { PersonDetailView } from "../person-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { resolvePersonByName } from "../../utils/person-name-match.ts";

export const peopleRouter = createDomainRoutes(peopleConfig);

// Detail view — shows direct reports + retrospectives participated in, so it
// stays custom.
peopleRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const showCompleted = c.req.query("show_completed") === "true";
  const svc = getPeopleService();
  const person = await svc.getById(id);
  if (!person) return c.notFound();
  const [
    reports,
    allPeople,
    allRetros,
    vacations,
    assignedTasksRaw,
    allGoals,
    allTasks,
    allMeetings,
  ] = await Promise.all([
    svc.getDirectReports(id),
    svc.list(),
    getRetrospectiveService().list(),
    getVacationService().list({ personId: id }),
    getTaskService().list({ assignee: id }),
    getGoalService().list(),
    getTaskService().list(),
    getMeetingService().list(),
  ]);
  const manager = person.reportsTo ? await svc.getById(person.reportsTo) : null;
  // Filter retrospectives whose participants resolve to this person via the
  // same tolerant matcher the retrospective detail view uses for links.
  const retrospectives = allRetros.filter((r) =>
    r.participants.some((p) => resolvePersonByName(p, allPeople)?.id === id)
  );
  // Most recent first — matches the retrospectives ordering convention.
  vacations.sort((a, b) => b.startDate.localeCompare(a.startDate));

  // Assigned tasks — assignee stores person ID (per [decision] assigneeIsId).
  // Sort by priority (1 = highest) then due_date, missing values last.
  const assignedTasks = (showCompleted
    ? assignedTasksRaw
    : assignedTasksRaw.filter((t) =>
      !t.completed
    ))
    .slice()
    .sort((a, b) => {
      const pa = a.priority ?? 99;
      const pb = b.priority ?? 99;
      if (pa !== pb) return pa - pb;
      const da = a.due_date ?? "9999-99-99";
      const db = b.due_date ?? "9999-99-99";
      return da.localeCompare(db);
    });

  // Assigned goals — owner stores person name (no service-side filter).
  const assignedGoals = allGoals
    .filter((g) => g.owner === person.name)
    .filter((g) =>
      showCompleted || (g.status !== "success" && g.status !== "failed")
    )
    .slice()
    .sort((a, b) =>
      a.status.localeCompare(b.status) || a.title.localeCompare(b.title)
    );

  // Analytics — per-person aggregates computed from the same data slices the
  // section above already touches, plus a full tasks scan for time entries
  // (entries live on tasks, not just assigned ones) and a meetings scan
  // (attendees mix names + IDs — resolve via the tolerant name matcher).
  const openTasksCount = assignedTasksRaw.filter((t) => !t.completed).length;
  const doneTasksCount = assignedTasksRaw.filter((t) => t.completed).length;
  const activeGoalsCount = allGoals.filter((g) =>
    g.owner === person.name && g.status !== "success" && g.status !== "failed"
  ).length;
  let hoursLoggedTotal = 0;
  for (const t of allTasks) {
    for (const e of t.time_entries ?? []) {
      if (e.person === id) hoursLoggedTotal += e.hours;
    }
  }
  const hoursLogged = Math.round(hoursLoggedTotal * 100) / 100;
  const attendedAll = allMeetings
    .filter((m) =>
      (m.attendees ?? []).some((a) =>
        a === id || a === person.name ||
        resolvePersonByName(a, allPeople)?.id === id
      )
    )
    .slice()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const attendedMeetingsTotal = attendedAll.length;
  const attendedMeetings = attendedAll.slice(0, 10);
  const analytics = {
    openTasks: openTasksCount,
    doneTasks: doneTasksCount,
    activeGoals: activeGoalsCount,
    hoursLogged,
    meetingsAttended: attendedMeetingsTotal,
  };

  // Mentions — FTS search across all indexed domains for the person's name,
  // excluding the person's own record (their name matches their own FTS row).
  // Cross-person matches (this person referenced in another person's notes)
  // legitimately count and are kept.
  const engine = getSearchEngine();
  const rawMentions = engine ? engine.search(person.name, { limit: 30 }) : [];
  const filteredMentions = rawMentions.filter((r) =>
    !(r.type === "person" && r.id === person.id)
  );
  const mentionsTotal = filteredMentions.length;
  const cappedMentions = filteredMentions.slice(0, 20);
  const mentionsByType: Record<string, SearchResult[]> = {};
  for (const r of cappedMentions) {
    (mentionsByType[r.type] ??= []).push(r);
  }

  return c.html(
    <PersonDetailView
      {...viewProps(c, "/people")}
      person={person}
      reports={reports}
      manager={manager}
      retrospectives={retrospectives}
      vacations={vacations}
      assignedTasks={assignedTasks}
      assignedGoals={assignedGoals}
      attendedMeetings={attendedMeetings}
      attendedMeetingsTotal={attendedMeetingsTotal}
      analytics={analytics}
      mentionsByType={mentionsByType}
      mentionsTotal={mentionsTotal}
      showCompleted={showCompleted}
    />,
  );
});
