import type { FC } from "hono/jsx";
import type { Contact } from "../../types/contact.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { CONTACT_TYPE_VARIANTS } from "../../domains/contact/constants.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";

type Props = { item: Contact; q?: string };

export const ContactCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/contacts/${item.id}`}
      name={item.name}
      q={q}
      domain="contacts"
      id={item.id}
      badge={item.type
        ? (
          <span class={badgeClass(CONTACT_TYPE_VARIANTS, item.type)}>
            {item.type}
          </span>
        )
        : undefined}
    >
      <CardMeta>
        {item.company && (
          <CardMetaItem label="Company">{item.company}</CardMetaItem>
        )}
        {item.role && <CardMetaItem label="Role">{item.role}</CardMetaItem>}
        {item.email && (
          <CardMetaItem label="Email">
            <a href={`mailto:${item.email}`}>{item.email}</a>
          </CardMetaItem>
        )}
        {item.phone && (
          <CardMetaItem label="Phone">
            <a href={`tel:${item.phone}`}>{item.phone}</a>
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
