import type { FC } from "hono/jsx";
import type { Person } from "../../types/person.types.ts";
import { Highlight } from "../../utils/highlight.tsx";

type Props = { person: Person; q?: string };

export const PersonCard: FC<Props> = ({ person, q }) => {
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <article class="person-card" data-filterable-card>
      <header class="person-card__header">
        <div class="person-card__identity">
          <span
            class={`person-card__avatar person-card__avatar--${
              person.agentType ?? "human"
            }`}
          >
            {initials}
          </span>
          <div>
            <h2 class="person-card__name">
              <a href={`/people/${person.id}`}>
                <Highlight text={person.name} q={q} />
              </a>
            </h2>
            {person.title && (
              <span class="person-card__title">{person.title}</span>
            )}
          </div>
        </div>
        {person.agentType && (
          <span
            class={`badge person-card__badge person-card__badge--${person.agentType}`}
          >
            {person.agentType}
          </span>
        )}
      </header>

      <dl class="person-card__meta">
        {person.role && (
          <>
            <dt class="person-card__meta-label">Role</dt>
            <dd class="person-card__meta-value">{person.role}</dd>
          </>
        )}
        {person.departments && person.departments.length > 0 && (
          <>
            <dt class="person-card__meta-label">Department</dt>
            <dd class="person-card__meta-value">
              {person.departments.join(", ")}
            </dd>
          </>
        )}
        {person.email && (
          <>
            <dt class="person-card__meta-label">Email</dt>
            <dd class="person-card__meta-value">
              <a href={`mailto:${person.email}`}>{person.email}</a>
            </dd>
          </>
        )}
      </dl>

      {person.skills && person.skills.length > 0 && (
        <div class="person-card__skills">
          {person.skills.map((skill) => (
            <span key={skill} class="person-card__skill-tag">{skill}</span>
          ))}
        </div>
      )}

      <div class="person-card__actions">
        <a class="btn btn--secondary" href={`/people/${person.id}`}>
          View
        </a>
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
    </article>
  );
};
