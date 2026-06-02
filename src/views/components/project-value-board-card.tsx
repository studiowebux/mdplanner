import type { FC } from "hono/jsx";
import type { ProjectValueBoard } from "../../types/project-value-board.types.ts";
import { PROJECT_VALUE_BOARD_SECTION_KEYS } from "../../types/project-value-board.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { toKebab } from "../../utils/slug.ts";
import { formatDate } from "../../utils/time.ts";

type Props = { item: ProjectValueBoard; q?: string };

export const ProjectValueBoardCard: FC<Props> = ({ item, q }) => {
  const total = PROJECT_VALUE_BOARD_SECTION_KEYS.reduce(
    (sum, k) => sum + item[k].length,
    0,
  );
  return (
    <DomainCard
      href={`/project-value/${item.id}`}
      name={item.title}
      q={q}
      domain="project-value"
      id={item.id}
      badge={<span class="badge pv-date-badge">{formatDate(item.date)}</span>}
    >
      <CardMeta>
        {item.project && (
          <CardMetaItem label="Project">
            <a href={`/portfolio/${toKebab(item.project)}`}>
              {item.project}
            </a>
          </CardMetaItem>
        )}
        <CardMetaItem label="Items">{total}</CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
