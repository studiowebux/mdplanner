import type { FC } from "hono/jsx";
import type { ResolvedAttendee } from "../../domains/meeting/owners.ts";

/**
 * Attendee badges for the meeting list card + table. Attendees resolved to a
 * Person link to `/people/:id` by name; unresolved values fall back to a
 * people search. Shows the first three, with a "+N" overflow badge whose
 * tooltip lists the remaining (resolved) names.
 */
export const AttendeePills: FC<{
  attendees: string[];
  attendeeById: Record<string, ResolvedAttendee>;
}> = ({ attendees, attendeeById }) => {
  const visible = attendees.slice(0, 3);
  const hidden = attendees.slice(3);
  return (
    <span class="meeting-attendees-pills">
      {visible.map((a) => {
        const person = attendeeById[a];
        return person
          ? (
            <a
              key={a}
              href={`/people/${person.id}`}
              class="badge badge--neutral"
            >
              {person.name}
            </a>
          )
          : (
            <a
              key={a}
              href={`/people?q=${encodeURIComponent(a)}`}
              class="badge badge--neutral"
            >
              {a}
            </a>
          );
      })}
      {hidden.length > 0 && (
        <span
          class="badge badge--neutral meeting-attendees-overflow"
          title={hidden.map((a) => attendeeById[a]?.name ?? a).join(", ")}
        >
          +{hidden.length}
        </span>
      )}
    </span>
  );
};
