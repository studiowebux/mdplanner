import type { FC } from "hono/jsx";
import type { Company } from "../../types/company.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { COMPANY_TYPE_VARIANTS } from "../../domains/company/constants.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";

type Props = { item: Company; q?: string };

export const CompanyCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/companies/${item.id}`}
      name={item.name}
      q={q}
      domain="companies"
      id={item.id}
      badge={item.type
        ? (
          <span class={badgeClass(COMPANY_TYPE_VARIANTS, item.type)}>
            {item.type}
          </span>
        )
        : undefined}
    >
      <CardMeta>
        {item.industry && (
          <CardMetaItem label="Industry">{item.industry}</CardMetaItem>
        )}
        {item.size && <CardMetaItem label="Size">{item.size}</CardMetaItem>}
        {item.website && (
          <CardMetaItem label="Website">
            <a href={item.website} target="_blank" rel="noopener noreferrer">
              {item.website}
            </a>
          </CardMetaItem>
        )}
        {item.email && (
          <CardMetaItem label="Email">
            <a href={`mailto:${item.email}`}>{item.email}</a>
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
