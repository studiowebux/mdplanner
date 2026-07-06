import type { FC } from "hono/jsx";
import type { Brief } from "../../types/brief.types.ts";
import { BRIEF_SECTIONS } from "../../types/brief.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: Brief; q?: string };

function countSections(b: Brief): number {
  let count = 0;
  for (const s of BRIEF_SECTIONS) {
    const val = b[s.key as keyof Brief] as string[] | undefined;
    if (val && val.length > 0) count++;
  }
  return count;
}

export const BriefCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/briefs/${item.id}`}
      name={item.title}
      q={q}
      domain="briefs"
      id={item.id}
    >
      <CardMeta>
        {item.date && <CardMetaItem label="Date">{item.date}</CardMetaItem>}
        <CardMetaItem label="Sections">
          {countSections(item)}/{BRIEF_SECTIONS.length}
        </CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
