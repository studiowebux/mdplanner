import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Person } from "../types/person.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate, timeAgo } from "../utils/time.ts";

type Props = ViewProps & {
  person: Person;
  reports: Person[];
  manager: Person | null;
};

export const PersonDetailView: FC<Props> = (
  { person, reports, manager, ...viewProps },
) => {
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <MainLayout
      title={person.name}
      {...viewProps}
      styles={["/css/views/people.css"]}
    >
      <main class="person-detail">
        <div class="person-detail__back">
          <a href="/people" class="btn btn--secondary">
            Back to people
          </a>
        </div>

        <header class="person-detail__header">
          <div class="person-detail__identity">
            <span
              class={`person-card__avatar person-card__avatar--${person.agentType ?? "human"}`}
            >
              {initials}
            </span>
            <div>
              <h1 class="person-detail__name">{person.name}</h1>
              {person.title && (
                <p class="person-detail__title">{person.title}</p>
              )}
            </div>
          </div>
          {person.agentType && (
            <span
              class={`person-card__badge person-card__badge--${person.agentType}`}
            >
              {person.agentType}
            </span>
          )}
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
          <section class="person-detail__section">
            <h2>Skills</h2>
            <div class="person-card__skills">
              {person.skills.map((s) => (
                <span key={s} class="person-card__skill-tag">{s}</span>
              ))}
            </div>
          </section>
        )}

        {person.agentType && person.agentType !== "human" && (
          <section class="person-detail__section">
            <h2>Agent</h2>
            <dl class="person-detail__meta">
              {person.status && (
                <>
                  <dt>Status</dt>
                  <dd>
                    <span
                      class={`person-card__status person-card__status--${person.status}`}
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
                    {person.models.map((m) => `${m.name} (${m.provider})`).join(
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

        {person.notes && (
          <section class="person-detail__section">
            <h2>Notes</h2>
            <div class="person-detail__notes">{person.notes}</div>
          </section>
        )}

        {reports.length > 0 && (
          <section class="person-detail__section">
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
                      {" "}&mdash; {r.title}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div class="person-detail__actions">
          <button
            class="btn btn--secondary"
            type="button"
            hx-get={`/people/${person.id}/edit`}
            hx-target="#people-form-container"
            hx-swap="innerHTML"
          >
            Edit
          </button>
          <button
            class="btn btn--danger"
            type="button"
            hx-delete={`/people/${person.id}`}
            hx-swap="none"
            hx-confirm-dialog={`Delete "${person.name}"? This cannot be undone.`}
            data-confirm-name={person.name}
          >
            Delete
          </button>
        </div>
      </main>
    </MainLayout>
  );
};
