import type { FC } from "hono/jsx";
import type { JournalEntry } from "../../types/journal.types.ts";
import { JOURNAL_MOOD_LABELS } from "../../types/journal.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { JOURNAL_MOOD_VARIANTS } from "../../domains/journal/constants.tsx";

type Props = { item: JournalEntry; q?: string };

export const JournalCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/journal/${item.id}`}
      name={item.title}
      q={q}
      domain="journal"
      id={item.id}
      badge={item.mood
        ? (
          <span class={badgeClass(JOURNAL_MOOD_VARIANTS, item.mood)}>
            {JOURNAL_MOOD_LABELS[item.mood]}
          </span>
        )
        : undefined}
    >
      <CardMeta>
        <CardMetaItem label="Date">{item.date}</CardMetaItem>
        {item.tags && item.tags.length > 0 && (
          <CardMetaItem label="Tags">{item.tags.join(", ")}</CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
