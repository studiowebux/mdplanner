import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { FormBuilder } from "../components/ui/form-builder.tsx";
import type { DnsDomain } from "../types/dns.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { DNS_RECORD_FORM_FIELDS } from "../domains/dns/constants.tsx";
import { toKebab } from "../utils/slug.ts";

// ---------------------------------------------------------------------------
// DNS records table — standalone fragment for htmx swaps
// ---------------------------------------------------------------------------

export const DnsRecordsTable: FC<{ domain: DnsDomain }> = ({ domain }) => {
  const records = domain.dnsRecords ?? [];
  return (
    <section
      id="dns-records-section"
      class="detail-section dns-detail__section"
    >
      <div class="dns-detail__section-header">
        <h2 class="section-heading">DNS Records</h2>
        <button
          class="btn btn--primary btn--sm"
          type="button"
          hx-get={`/dns/${domain.id}/records/new`}
          hx-target="#dns-records-form-container"
          hx-swap="innerHTML"
        >
          Add Record
        </button>
      </div>
      {records.length === 0
        ? (
          <p class="dns-detail__empty">
            No records. Use Sync to pull from Cloudflare, or add manually.
          </p>
        )
        : (
          <div class="dns-detail__records-wrap">
            <table class="data-table dns-detail__records-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Value</th>
                  <th>TTL</th>
                  <th>Proxied</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span
                        class={`dns-record-type dns-record-type--${r.type.toLowerCase()}`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td class="dns-record__name">{r.name}</td>
                    <td class="dns-record__value">{r.value}</td>
                    <td>{r.ttl === 1 ? "Auto" : String(r.ttl)}</td>
                    <td>{r.proxied ? "Yes" : "No"}</td>
                    <td>
                      <div class="dns-record__actions">
                        <button
                          class="btn btn--secondary btn--sm"
                          type="button"
                          hx-get={`/dns/${domain.id}/records/${i}/edit`}
                          hx-target="#dns-records-form-container"
                          hx-swap="innerHTML"
                        >
                          Edit
                        </button>
                        <button
                          class="btn btn--danger btn--sm"
                          type="button"
                          hx-delete={`/dns/${domain.id}/records/${i}`}
                          hx-confirm={`Delete "${r.type} ${r.name}"? This cannot be undone.`}
                          hx-target="#dns-records-section"
                          hx-swap="outerHTML"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Record new/edit form — rendered into #dns-records-form-container
// ---------------------------------------------------------------------------

export const DnsRecordForm: FC<{
  domainId: string;
  index?: number;
  values?: Record<string, string>;
}> = ({ domainId, index, values }) => {
  const isEdit = index !== undefined;
  return (
    <FormBuilder
      id="dns-record-form"
      title={isEdit ? "Edit DNS Record" : "Add DNS Record"}
      fields={DNS_RECORD_FORM_FIELDS}
      values={values}
      action={isEdit
        ? `/dns/${domainId}/records/${index}`
        : `/dns/${domainId}/records`}
      method="post"
      open
    />
  );
};

// ---------------------------------------------------------------------------
// DNS domain detail view
// ---------------------------------------------------------------------------

export const DnsDetailView: FC<ViewProps & { item: DnsDomain }> = (
  { item: domain, ...viewProps },
) => (
  <MainLayout
    title={domain.domain}
    {...viewProps}
    styles={["/css/views/dns.css"]}
  >
    <div
      hx-ext="sse"
      sse-connect="/sse"
      hx-get={`/dns/${domain.id}`}
      hx-trigger="sse:dns.updated, sse:dns.synced"
      hx-target="#dns-detail-root"
      hx-select="#dns-detail-root"
      hx-swap="outerHTML"
    />
    <main id="dns-detail-root" class="detail-view dns-detail">
      <div class="dns-detail__back">
        <a href="/dns" class="btn btn--secondary">Back to DNS</a>
      </div>

      <header class="detail-section dns-detail__header">
        <div class="detail-title-row dns-detail__title-row">
          <h1 class="detail-title dns-detail__title">{domain.domain}</h1>
          {domain.status && (
            <span class={`badge dns-badge dns-badge--${domain.status}`}>
              {domain.status}
            </span>
          )}
          {domain.provider && (
            <span class="badge dns-provider-badge">{domain.provider}</span>
          )}
        </div>
        <div class="detail-actions">
          <button
            class="btn btn--secondary btn--sm"
            type="button"
            hx-get={`/dns/${domain.id}/edit`}
            hx-target="#dns-form-container"
            hx-swap="innerHTML"
          >
            Edit
          </button>
          <button
            class="btn btn--danger btn--sm"
            type="button"
            hx-delete={`/dns/${domain.id}`}
            hx-confirm={`Delete "${domain.domain}"? This cannot be undone.`}
            hx-swap="none"
          >
            Delete
          </button>
        </div>
      </header>

      <div class="detail-section dns-detail__info-grid">
        {domain.expiryDate && (
          <div class="dns-detail__info-item">
            <span class="dns-detail__info-label">Expires</span>
            <span>{formatDate(domain.expiryDate)}</span>
          </div>
        )}
        {domain.autoRenew !== undefined && (
          <div class="dns-detail__info-item">
            <span class="dns-detail__info-label">Auto-renew</span>
            <span>{domain.autoRenew ? "Yes" : "No"}</span>
          </div>
        )}
        {domain.renewalCostUsd !== undefined && (
          <div class="dns-detail__info-item">
            <span class="dns-detail__info-label">Renewal cost</span>
            <span>${domain.renewalCostUsd}/yr</span>
          </div>
        )}
        {domain.lastFetchedAt && (
          <div class="dns-detail__info-item">
            <span class="dns-detail__info-label">Last synced</span>
            <span>{formatDate(domain.lastFetchedAt)}</span>
          </div>
        )}
        {domain.project && (
          <div class="dns-detail__info-item">
            <span class="dns-detail__info-label">Project</span>
            <a href={`/portfolio/${toKebab(domain.project)}`}>
              {domain.project}
            </a>
          </div>
        )}
        {domain.nameservers && domain.nameservers.length > 0 && (
          <div class="dns-detail__info-item dns-detail__info-item--full">
            <span class="dns-detail__info-label">Nameservers</span>
            <span class="dns-detail__nameservers">
              {domain.nameservers.join(", ")}
            </span>
          </div>
        )}
      </div>

      {domain.notes && (
        <section class="detail-section dns-detail__section">
          <h2 class="section-heading">Notes</h2>
          <p class="dns-detail__notes">{domain.notes}</p>
        </section>
      )}

      <DnsRecordsTable domain={domain} />
    </main>

    <div id="dns-form-container" />
    <div id="dns-records-form-container" />
  </MainLayout>
);
