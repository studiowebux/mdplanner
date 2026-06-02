import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Company } from "../types/company.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { COMPANY_TYPE_VARIANTS } from "../domains/company/constants.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const NotesSection: FC<{ company: Company }> = ({ company }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={company.notes ?? ""}
      data-inline-target="company-notes-value"
      data-inline-save-btn="company-notes-save"
    >
      {company.notes ?? ""}
    </div>
    <input
      type="hidden"
      id="company-notes-value"
      name="notes"
      value={company.notes ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="company-notes-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/companies/${company.id}/notes?editing=true`}
        hx-include="#company-notes-value"
        hx-target="#company-detail-root"
        hx-select="#company-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

export const CompanyDetailView: FC<
  ViewProps & { item: Company; editing?: boolean }
> = (
  { item: company, editing = false, ...viewProps },
) => {
  const hasInfo = company.website || company.phone || company.email ||
    company.industry || company.size || company.address;
  const tags = company.tags ?? [];

  return (
    <MainLayout
      title={company.name}
      {...viewProps}
      styles={["/css/views/companies.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={`/companies/${company.id}${editing ? "?editing=true" : ""}`}
        trigger="sse:company.updated"
        targetId="company-detail-root"
      />
      <main
        id="company-detail-root"
        class={`detail-view company-detail${
          editing ? " company-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Companies", href: "/companies" },
            { label: company.name },
          ]}
        />
        <BackButton href="/companies" label="Back to Companies" />

        <header class="detail-section detail-header company-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{company.name}</h1>
            {company.type && (
              <span class={badgeClass(COMPANY_TYPE_VARIANTS, company.type)}>
                {company.type}
              </span>
            )}
          </div>
          <DetailActions
            entity="companies"
            id={company.id}
            title={company.name}
            formContainerId="companies-form-container"
            archived={company.archived === true}
          >
            <EditModeToggle
              href={`/companies/${company.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={company} />

        {hasInfo && (
          <div class="detail-section detail-info-row">
            {company.website && (
              <InfoItem label="Website">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {company.website}
                </a>
              </InfoItem>
            )}
            {company.industry && (
              <InfoItem label="Industry">{company.industry}</InfoItem>
            )}
            {company.size && <InfoItem label="Size">{company.size}</InfoItem>}
            {company.phone && (
              <InfoItem label="Phone">
                <a href={`tel:${company.phone}`}>{company.phone}</a>
              </InfoItem>
            )}
            {company.email && (
              <InfoItem label="Email">
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </InfoItem>
            )}
            {company.address && (
              <InfoItem label="Address">{company.address}</InfoItem>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <section class="detail-section">
            <h2 class="section-heading">Tags</h2>
            <div class="company-detail__tags">
              {tags.map((t) => (
                <span key={t} class="company-detail__tag">{t}</span>
              ))}
            </div>
          </section>
        )}

        {editing
          ? <NotesSection company={company} />
          : <MarkdownSection title="Notes" markdown={company.notes} />}

        <AuditMeta
          createdAt={company.createdAt}
          updatedAt={company.updatedAt}
          createdBy={company.createdBy}
          updatedBy={company.updatedBy}
        />
      </main>

      <div id="companies-form-container" />
    </MainLayout>
  );
};
