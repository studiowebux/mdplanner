import type { FC } from "hono/jsx";
import type { Person } from "../../types/person.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { person: Person; q?: string };

export const PersonCard: FC<Props> = ({ person, q }) => {
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DomainCard
      href={`/people/${person.id}`}
      name={person.name}
      q={q}
      domain="people"
      id={person.id}
      leading={
        <span
          class={`person-card__avatar person-card__avatar--${
            person.agentType ?? "human"
          }`}
        >
          {initials}
        </span>
      }
      subtitle={person.title ?? undefined}
      badge={person.agentType
        ? (
          <span
            class={`badge person-card__badge person-card__badge--${person.agentType}`}
          >
            {person.agentType}
          </span>
        )
        : undefined}
    >
      <CardMeta>
        {person.role && <CardMetaItem label="Role">{person.role}</CardMetaItem>}
        {person.departments && person.departments.length > 0 && (
          <CardMetaItem label="Department">
            {person.departments.join(", ")}
          </CardMetaItem>
        )}
        {person.email && (
          <CardMetaItem label="Email">
            <a href={`mailto:${person.email}`}>{person.email}</a>
          </CardMetaItem>
        )}
      </CardMeta>

      {person.skills && person.skills.length > 0 && (
        <div class="person-card__skills">
          {person.skills.map((skill) => (
            <span key={skill} class="badge">{skill}</span>
          ))}
        </div>
      )}
    </DomainCard>
  );
};
