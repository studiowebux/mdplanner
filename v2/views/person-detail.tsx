import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Goal } from "../types/goal.types.ts";
import type { Person } from "../types/person.types.ts";
import type { Retrospective } from "../types/retrospective.types.ts";
import type { Task } from "../types/task.types.ts";
import type { VacationRequest } from "../types/vacation.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate, timeAgo } from "../utils/time.ts";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import {
  PERSON_STATUS_VARIANTS,
  PERSON_TYPE_VARIANTS,
} from "../domains/people/constants.tsx";
import { VACATION_STATUS_VARIANTS } from "../domains/vacation/constants.tsx";
import { TASK_SECTION_VARIANTS } from "../domains/task/constants.tsx";
import { GOAL_STATUS_VARIANTS } from "../domains/goal/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";

type Props = ViewProps & {
  person: Person;
  reports: Person[];
  manager: Person | null;
  retrospectives?: Retrospective[];
  vacations?: VacationRequest[];
  assignedTasks?: Task[];
  assignedGoals?: Goal[];
  showCompleted?: boolean;
};

export const PersonDetailView: FC<Props> = (
  {
    person,
    reports,
    manager,
    retrospectives = [],
    vacations = [],
    assignedTasks = [],
    assignedGoals = [],
    showCompleted = false,
    ...viewProps
  },
) => {
  const toggleHref = showCompleted
    ? `/people/${person.id}`
    : `/people/${person.id}?show_completed=true`;
  const toggleLabel = showCompleted ? "Hide completed" : "Show completed";
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <MainLayout
        title={person.name}
        {...viewProps}
        styles={["/css/views/people.css"]}
      >
        <main id="person-detail" class="detail-view person-detail">
          <Breadcrumb
            items={[
              { label: "People", href: "/people" },
              { label: person.name },
            ]}
          />
          <BackButton href="/people" label="Back to people" />

          <header class="detail-header person-detail__header">
            <div class="person-detail__identity">
              <span
                class={`person-card__avatar person-card__avatar--${
                  person.agentType ?? "human"
                }`}
              >
                {initials}
              </span>
              <div>
                <h1 class="detail-title person-detail__name">{person.name}</h1>
                {person.title && (
                  <p class="person-detail__title">{person.title}</p>
                )}
              </div>
            </div>
            {person.agentType && (
              <span class={badgeClass(PERSON_TYPE_VARIANTS, person.agentType)}>
                {person.agentType}
              </span>
            )}
            <DetailActions
              entity="people"
              id={person.id}
              title={person.name}
              formContainerId="people-form-container"
              onDeleteRedirect="/people"
            />
          </header>

          <dl class="person-detail__meta">
            {person.role && (
              <>
                <dt>Role</dt>
                <dd>{person.role}</dd>
              </>
            )}
            {person.departments && person.departments.length > 0 && (
              <>
                <dt>Departments</dt>
                <dd>{person.departments.join(", ")}</dd>
              </>
            )}
            {person.email && (
              <>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${person.email}`}>{person.email}</a>
                </dd>
              </>
            )}
            {person.phone && (
              <>
                <dt>Phone</dt>
                <dd>{person.phone}</dd>
              </>
            )}
            {person.startDate && (
              <>
                <dt>Start date</dt>
                <dd>{formatDate(person.startDate)}</dd>
              </>
            )}
            {manager && (
              <>
                <dt>Reports to</dt>
                <dd>
                  <a href={`/people/${manager.id}`}>{manager.name}</a>
                </dd>
              </>
            )}
            {person.hoursPerDay != null && (
              <>
                <dt>Hours/day</dt>
                <dd>{person.hoursPerDay}</dd>
              </>
            )}
            {person.workingDays && person.workingDays.length > 0 && (
              <>
                <dt>Working days</dt>
                <dd>{person.workingDays.join(", ")}</dd>
              </>
            )}
          </dl>

          {person.skills && person.skills.length > 0 && (
            <section class="detail-section person-detail__section">
              <h2>Skills</h2>
              <div class="person-card__skills">
                {person.skills.map((s) => (
                  <span key={s} class="badge">{s}</span>
                ))}
              </div>
            </section>
          )}

          {person.agentType && person.agentType !== "human" && (
            <section class="detail-section person-detail__section">
              <h2>Agent</h2>
              <dl class="person-detail__meta">
                {person.status && (
                  <>
                    <dt>Status</dt>
                    <dd>
                      <span
                        class={badgeClass(
                          PERSON_STATUS_VARIANTS,
                          person.status,
                        )}
                      >
                        {person.status}
                      </span>
                    </dd>
                  </>
                )}
                {person.lastSeen && (
                  <>
                    <dt>Last seen</dt>
                    <dd>{timeAgo(person.lastSeen)}</dd>
                  </>
                )}
                {person.currentTaskId && (
                  <>
                    <dt>Current task</dt>
                    <dd>{person.currentTaskId}</dd>
                  </>
                )}
                {person.models && person.models.length > 0 && (
                  <>
                    <dt>Models</dt>
                    <dd>
                      {person.models.map((m) => `${m.name} (${m.provider})`)
                        .join(
                          ", ",
                        )}
                    </dd>
                  </>
                )}
              </dl>
              {person.systemPrompt && (
                <details class="person-detail__prompt">
                  <summary>System prompt</summary>
                  <pre>{person.systemPrompt}</pre>
                </details>
              )}
            </section>
          )}

          {person.accounts && Object.keys(person.accounts).length > 0 && (
            <section class="detail-section person-detail__section">
              <h2>External accounts</h2>
              <dl class="person-detail__meta">
                {Object.entries(person.accounts).map(([provider, username]) => (
                  <>
                    <dt key={provider}>{provider}</dt>
                    <dd key={`${provider}-val`}>{username}</dd>
                  </>
                ))}
              </dl>
            </section>
          )}

          {person.notes && (
            <section class="detail-section person-detail__section">
              <h2>Notes</h2>
              <div class="person-detail__notes">{person.notes}</div>
            </section>
          )}

          {reports.length > 0 && (
            <section class="detail-section person-detail__section">
              <h2>
                Direct reports
                <span class="person-detail__count">({reports.length})</span>
              </h2>
              <ul class="person-detail__reports">
                {reports.map((r) => (
                  <li key={r.id}>
                    <a href={`/people/${r.id}`}>{r.name}</a>
                    {r.title && (
                      <span class="person-detail__report-title">
                        &nbsp;&mdash; {r.title}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {retrospectives.length > 0 && (
            <section class="detail-section person-detail__section">
              <h2>
                Retrospectives
                <span class="person-detail__count">
                  ({retrospectives.length})
                </span>
              </h2>
              <ul class="person-detail__retros">
                {retrospectives.map((r) => (
                  <li key={r.id}>
                    <a href={`/retrospectives/${r.id}`}>{r.title}</a>
                    {r.date && (
                      <span class="person-detail__retro-date">
                        &nbsp;&mdash; {formatDate(r.date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section class="detail-section person-detail__section">
            <h2>
              Assigned
              <a class="person-detail__toggle" href={toggleHref}>
                {toggleLabel}
              </a>
            </h2>

            <h3 class="person-detail__subsection-heading">
              Tasks
              <span class="person-detail__count">({assignedTasks.length})</span>
            </h3>
            {assignedTasks.length > 0
              ? (
                <ul class="person-detail__assigned-tasks">
                  {assignedTasks.map((t) => (
                    <li key={t.id}>
                      <a href={`/tasks/${t.id}`}>{t.title}</a>
                      <span class="person-detail__assigned-meta">
                        <span
                          class={badgeClass(TASK_SECTION_VARIANTS, t.section)}
                        >
                          {t.section}
                        </span>
                        {t.priority != null && (
                          <span class={`badge priority--${t.priority}`}>
                            P{t.priority}
                          </span>
                        )}
                        {t.due_date && (
                          <span class="person-detail__assigned-date">
                            due {formatDate(t.due_date)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )
              : <EmptyState message="No tasks assigned to this person." />}

            <h3 class="person-detail__subsection-heading">
              Goals
              <span class="person-detail__count">({assignedGoals.length})</span>
            </h3>
            {assignedGoals.length > 0
              ? (
                <ul class="person-detail__assigned-goals">
                  {assignedGoals.map((g) => (
                    <li key={g.id}>
                      <a href={`/goals/${g.id}`}>{g.title}</a>
                      <span class="person-detail__assigned-meta">
                        <span
                          class={badgeClass(GOAL_STATUS_VARIANTS, g.status)}
                        >
                          {g.status}
                        </span>
                        {g.progress != null && (
                          <span class="person-detail__assigned-date">
                            {g.progress}%
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )
              : <EmptyState message="No goals owned by this person." />}
          </section>

          <section class="detail-section person-detail__section">
            <h2>
              Vacation
              {vacations.length > 0 && (
                <span class="person-detail__count">({vacations.length})</span>
              )}
            </h2>
            {vacations.length > 0
              ? (
                <ul class="person-detail__vacations">
                  {vacations.map((v) => (
                    <li key={v.id}>
                      <a href={`/vacation/${v.id}`}>
                        {formatDate(v.startDate)} &ndash;{" "}
                        {formatDate(v.endDate)}
                      </a>
                      <span class="person-detail__vacation-meta">
                        <span class="person-detail__vacation-type">
                          {v.type}
                        </span>
                        <span
                          class={badgeClass(VACATION_STATUS_VARIANTS, v.status)}
                        >
                          {v.status}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )
              : <EmptyState message="No vacations recorded for this person." />}
          </section>

          <AuditMeta
            createdAt={person.createdAt}
            updatedAt={person.updatedAt}
            createdBy={person.createdBy}
            updatedBy={person.updatedBy}
          />
        </main>
        <div id="people-form-container" />
      </MainLayout>
      <SseRefresh
        getUrl={`/people/${person.id}`}
        trigger="sse:person.updated, sse:person.deleted"
        targetId="person-detail"
      />
    </>
  );
};
