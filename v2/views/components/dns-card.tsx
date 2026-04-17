import type { FC } from "hono/jsx";
import type { DnsDomain } from "../../types/dns.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { formatDate } from "../../utils/time.ts";
import { DNS_STATUS_VARIANTS } from "../../domains/dns/constants.tsx";

type Props = { item: DnsDomain; q?: string };

export const DnsCard: FC<Props> = ({ item, q }) => (
  <DomainCard
    href={`/dns/${item.id}`}
    name={item.domain}
    q={q}
    domain="dns"
    id={item.id}
    badge={item.status
      ? (
        <span
          class={`badge badge--${
            DNS_STATUS_VARIANTS[item.status] ?? "neutral"
          }`}
        >
          {item.status}
        </span>
      )
      : undefined}
  >
    <CardMeta>
      {item.provider && (
        <CardMetaItem label="Provider">{item.provider}</CardMetaItem>
      )}
      {item.expiryDate && (
        <CardMetaItem label="Expires">
          {formatDate(item.expiryDate)}
        </CardMetaItem>
      )}
      <CardMetaItem label="Records">
        {(item.dnsRecords ?? []).length}
      </CardMetaItem>
      {item.autoRenew !== undefined && (
        <CardMetaItem label="Auto-renew">
          {item.autoRenew ? "Yes" : "No"}
        </CardMetaItem>
      )}
    </CardMeta>
  </DomainCard>
);
