import type { FC } from "hono/jsx";
import type { Mindmap } from "../../types/mindmap.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { countAllNodes } from "../../domains/mindmap/constants.tsx";
import { toKebab } from "../../utils/slug.ts";
import { formatDate } from "../../utils/time.ts";

type Props = { item: Mindmap; q?: string };

export const MindmapCard: FC<Props> = ({ item, q }) => {
  const nodeCount = countAllNodes(item.nodes);
  return (
    <DomainCard
      href={`/mindmaps/${item.id}`}
      name={item.title}
      q={q}
      domain="mindmap"
      id={item.id}
      badge={
        <span class="badge mindmap-card__node-count">{nodeCount} nodes</span>
      }
    >
      <CardMeta>
        <CardMetaItem label="Project">
          <a href={`/portfolio/${toKebab(item.project)}`}>{item.project}</a>
        </CardMetaItem>
        <CardMetaItem label="Updated">
          {formatDate(item.updatedAt)}
        </CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
