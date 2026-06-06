import type { FC } from "hono/jsx";
import type { MeetingWithAttendees } from "../../domains/meeting/owners.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { AttendeePills } from "./meeting-attendee-pills.tsx";

type Props = { item: MeetingWithAttendees; q?: string };

export const MeetingCard: FC<Props> = ({ item, q }) => {
  const openActions = item.actions.filter((a) => a.status === "open").length;
  const attendees = item.attendees ?? [];
  return (
    <DomainCard
      href={`/meetings/${item.id}`}
      name={item.title}
      q={q}
      domain="meetings"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Date">{item.date}</CardMetaItem>
        {attendees.length > 0 && (
          <CardMetaItem label="Attendees">
            <AttendeePills
              attendees={attendees}
              attendeeById={item.attendeeById ?? {}}
            />
          </CardMetaItem>
        )}
        {openActions > 0 && (
          <CardMetaItem label="Open actions">
            <a
              href={`/meetings/${item.id}#meeting-actions-table`}
              class="badge badge--warning"
            >
              {openActions} open
            </a>
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
