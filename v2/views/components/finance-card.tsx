import type { FC } from "hono/jsx";
import type { Finance } from "../../types/finance.types.ts";
import { FINANCE_TYPE_LABELS } from "../../types/finance.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { FINANCE_TYPE_VARIANTS } from "../../domains/finance/constants.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { formatDate } from "../../utils/time.ts";

type Props = { item: Finance; q?: string };

export const FinanceCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/finances/${item.id}`}
      name={item.title}
      q={q}
      domain="finances"
      id={item.id}
      badge={
        <span class={badgeClass(FINANCE_TYPE_VARIANTS, item.type)}>
          {FINANCE_TYPE_LABELS[item.type]}
        </span>
      }
    >
      <CardMeta>
        <CardMetaItem label="Amount">
          <strong>
            {item.amount.toLocaleString()}
            {item.currency ? ` ${item.currency}` : ""}
          </strong>
        </CardMetaItem>
        {item.date && (
          <CardMetaItem label="Date">{formatDate(item.date)}</CardMetaItem>
        )}
        {(item.tags ?? []).length > 0 && (
          <CardMetaItem label="Tags">
            {(item.tags ?? []).join(", ")}
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
