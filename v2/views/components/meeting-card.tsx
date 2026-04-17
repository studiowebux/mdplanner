import type { FC } from "hono/jsx";
import type { Meeting } from "../../types/meeting.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: Meeting; q?: string };

export const MeetingCard: FC<Props> = ({ item, q }) => {
  const openActions = item.actions.filter((a) => a.status === "open").length;
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
        {(item.attendees ?? []).length > 0 && (
          <CardMetaItem label="Attendees">
            {(item.attendees ?? []).length}
          </CardMetaItem>
        )}
        {openActions > 0 && (
          <CardMetaItem label="Open actions">
            <span class="badge badge--warning">{openActions}</span>
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
