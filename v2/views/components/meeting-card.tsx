import type { FC } from "hono/jsx";
import type { Meeting } from "../../types/meeting.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: Meeting; q?: string };

export const MeetingCard: FC<Props> = ({ item, q }) => {
  const openActions = item.actions.filter((a) => a.status === "open").length;
  const attendees = item.attendees ?? [];
  const visible = attendees.slice(0, 3);
  const hidden = attendees.slice(3);
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
            <span class="meeting-attendees-pills">
              {visible.map((name) => (
                <a
                  key={name}
                  href={`/people?q=${encodeURIComponent(name)}`}
                  class="badge badge--neutral"
                >
                  {name}
                </a>
              ))}
              {hidden.length > 0 && (
                <span
                  class="badge badge--neutral meeting-attendees-overflow"
                  title={hidden.join(", ")}
                >
                  +{hidden.length}
                </span>
              )}
            </span>
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
