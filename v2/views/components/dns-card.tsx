import type { FC } from "hono/jsx";
import type { DnsDomain } from "../../types/dns.types.ts";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

type Props = { item: DnsDomain; q?: string };

export const DnsCard: FC<Props> = ({ item, q }) => (
  <article class="dns-card" data-filterable-card>
    <header class="dns-card__header">
      <h2 class="dns-card__name">
        <a href={`/dns/${item.id}`}>
          <Highlight text={item.domain} q={q} />
        </a>
      </h2>
      {item.status && (
        <span class={`dns-badge dns-badge--${item.status}`}>
          {item.status}
        </span>
      )}
    </header>

    <dl class="dns-card__meta">
      {item.provider && (
        <>
          <dt class="dns-card__meta-label">Provider</dt>
          <dd class="dns-card__meta-value">{item.provider}</dd>
        </>
      )}
      {item.expiryDate && (
        <>
          <dt class="dns-card__meta-label">Expires</dt>
          <dd class="dns-card__meta-value">{formatDate(item.expiryDate)}</dd>
        </>
      )}
      <dt class="dns-card__meta-label">Records</dt>
      <dd class="dns-card__meta-value">{(item.dnsRecords ?? []).length}</dd>
      {item.autoRenew !== undefined && (
        <>
          <dt class="dns-card__meta-label">Auto-renew</dt>
          <dd class="dns-card__meta-value">{item.autoRenew ? "Yes" : "No"}</dd>
        </>
      )}
    </dl>

    <div class="dns-card__actions">
      <a class="btn btn--secondary btn--sm" href={`/dns/${item.id}`}>
        View
      </a>
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        hx-get={`/dns/${item.id}/edit`}
        hx-target="#dns-form-container"
        hx-swap="innerHTML"
      >
        Edit
      </button>
      <button
        class="btn btn--danger btn--sm"
        type="button"
        hx-delete={`/dns/${item.id}`}
        hx-swap="none"
        hx-confirm-dialog={`Delete "${item.domain}"? This cannot be undone.`}
        data-confirm-name={item.domain}
      >
        Delete
      </button>
    </div>
  </article>
);
