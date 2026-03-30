import type { FC } from "hono/jsx";
import type { Customer } from "../../types/customer.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: Customer; q?: string };

export const CustomerCard: FC<Props> = ({ item, q }) => {
  const city = item.billingAddress?.city;

  return (
    <DomainCard
      href={`/customers/${item.id}`}
      name={item.name}
      q={q}
      domain="customers"
      id={item.id}
    >
      <CardMeta>
        {item.company && (
          <CardMetaItem label="Company">{item.company}</CardMetaItem>
        )}
        {item.email && <CardMetaItem label="Email">{item.email}</CardMetaItem>}
        {city && <CardMetaItem label="City">{city}</CardMetaItem>}
      </CardMeta>
    </DomainCard>
  );
};
