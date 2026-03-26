import type { FC } from "hono/jsx";
import type { DnsDomain } from "../../types/dns.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { formatDate } from "../../utils/time.ts";

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
        <span class={`dns-badge dns-badge--${item.status}`}>
          {item.status}
        </span>
      )
      : undefined}
  >
    <dl class="domain-card__meta">
      {item.provider && (
        <>
          <dt class="domain-card__meta-label">Provider</dt>
          <dd class="domain-card__meta-value">{item.provider}</dd>
        </>
      )}
      {item.expiryDate && (
        <>
          <dt class="domain-card__meta-label">Expires</dt>
          <dd class="domain-card__meta-value">{formatDate(item.expiryDate)}</dd>
        </>
      )}
      <dt class="domain-card__meta-label">Records</dt>
      <dd class="domain-card__meta-value">{(item.dnsRecords ?? []).length}</dd>
      {item.autoRenew !== undefined && (
        <>
          <dt class="domain-card__meta-label">Auto-renew</dt>
          <dd class="domain-card__meta-value">
            {item.autoRenew ? "Yes" : "No"}
          </dd>
        </>
      )}
    </dl>
  </DomainCard>
);
