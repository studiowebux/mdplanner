import type { FC } from "hono/jsx";
import type { VacationRequestView } from "../../types/vacation.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { VACATION_STATUS_VARIANTS } from "../../domains/vacation/constants.tsx";

type Props = { item: VacationRequestView; q?: string };

export const VacationCard: FC<Props> = ({ item, q }) => {
  const name = item.personName ?? item.personId;
  return (
    <DomainCard
      href={`/people/${item.personId}`}
      name={name}
      q={q}
      domain="vacation"
      id={item.id}
      badge={
        <span class={badgeClass(VACATION_STATUS_VARIANTS, item.status)}>
          {item.status}
        </span>
      }
      confirmMessage={`Delete request for "${name}"? This cannot be undone.`}
      customActions={
        <div class="card__actions">
          <button
            class="btn btn--secondary btn--sm"
            type="button"
            hx-get={`/vacation/${item.id}/edit`}
            hx-target="#vacation-form-container"
            hx-swap="innerHTML"
          >
            Edit
          </button>
          <button
            class="btn btn--danger btn--sm"
            type="button"
            hx-delete={`/vacation/${item.id}`}
            hx-confirm={`Delete request for "${name}"? This cannot be undone.`}
            hx-swap="none"
          >
            Delete
          </button>
        </div>
      }
    >
      <CardMeta>
        <CardMetaItem label="Dates">
          {item.startDate} → {item.endDate}
        </CardMetaItem>
        <CardMetaItem label="Type">{item.type}</CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
