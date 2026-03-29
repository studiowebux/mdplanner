import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { FormBuilder } from "../components/ui/form-builder.tsx";
import type { DnsDomain } from "../types/dns.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { DNS_RECORD_FORM_FIELDS } from "../domains/dns/constants.tsx";
import { toKebab } from "../utils/slug.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";

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
    <SseRefresh
      getUrl={"/dns/" + domain.id}
      trigger="sse:dns.updated, sse:dns.synced"
      targetId="dns-detail-root"
    />
    <main id="dns-detail-root" class="detail-view dns-detail">
      <BackButton href="/dns" label="Back to DNS" />

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
        <DetailActions
          entity="dns"
          id={domain.id}
          title={domain.domain}
          formContainerId="dns-form-container"
        />
      </header>

      <div class="detail-section detail-info-row">
        {domain.expiryDate && (
          <InfoItem label="Expires">{formatDate(domain.expiryDate)}</InfoItem>
        )}
        {domain.autoRenew !== undefined && (
          <InfoItem label="Auto-renew">
            {domain.autoRenew ? "Yes" : "No"}
          </InfoItem>
        )}
        {domain.renewalCostUsd !== undefined && (
          <InfoItem label="Renewal cost">
            ${domain.renewalCostUsd}/yr
          </InfoItem>
        )}
        {domain.lastFetchedAt && (
          <InfoItem label="Last synced">
            {formatDate(domain.lastFetchedAt)}
          </InfoItem>
        )}
        {domain.project && (
          <InfoItem label="Project">
            <a href={`/portfolio/${toKebab(domain.project)}`}>
              {domain.project}
            </a>
          </InfoItem>
        )}
        {domain.nameservers && domain.nameservers.length > 0 && (
          <InfoItem label="Nameservers">
            <span class="dns-detail__nameservers">
              {domain.nameservers.join(", ")}
            </span>
          </InfoItem>
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
