import type { FC } from "hono/jsx";
import type { LeanCanvas } from "../../types/lean-canvas.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: LeanCanvas; q?: string };

export const LeanCanvasCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/lean-canvases/${item.id}`}
      name={item.title}
      q={q}
      domain="lean-canvases"
      id={item.id}
    >
      <CardMeta>
        {item.project && (
          <CardMetaItem label="Project">
            <span class="badge badge--neutral">{item.project}</span>
          </CardMetaItem>
        )}
        {item.date && <CardMetaItem label="Date">{item.date}</CardMetaItem>}
        <CardMetaItem label="Sections">
          {item.completedSections}/12
        </CardMetaItem>
        <CardMetaItem label="Complete">{item.completionPct}%</CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
