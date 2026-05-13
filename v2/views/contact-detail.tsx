import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Contact } from "../types/contact.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { CONTACT_TYPE_VARIANTS } from "../domains/contact/constants.tsx";

export const ContactDetailView: FC<ViewProps & { item: Contact }> = (
  { item: contact, ...viewProps },
) => {
  const hasContact = contact.email || contact.phone || contact.role ||
    contact.company;
  const tags = contact.tags ?? [];

  return (
    <MainLayout
      title={contact.name}
      {...viewProps}
      styles={["/css/views/contacts.css"]}
      scripts={["/js/fullscreen-reading.js"]}
    >
      <SseRefresh
        getUrl={`/contacts/${contact.id}`}
        trigger="sse:contact.updated"
        targetId="contact-detail-root"
      />
      <main id="contact-detail-root" class="detail-view contact-detail">
        <BackButton href="/contacts" label="Back to Contacts" />

        <header class="detail-section contact-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{contact.name}</h1>
            {contact.type && (
              <span class={badgeClass(CONTACT_TYPE_VARIANTS, contact.type)}>
                {contact.type}
              </span>
            )}
          </div>
          <DetailActions
            entity="contacts"
            id={contact.id}
            title={contact.name}
            formContainerId="contacts-form-container"
          >
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              data-fullscreen-toggle
            >
              Focus
            </button>
          </DetailActions>
        </header>

        {hasContact && (
          <div class="detail-section detail-info-row">
            {contact.email && (
              <InfoItem label="Email">
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </InfoItem>
            )}
            {contact.phone && (
              <InfoItem label="Phone">
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </InfoItem>
            )}
            {contact.role && <InfoItem label="Role">{contact.role}</InfoItem>}
            {contact.company && (
              <InfoItem label="Company">
                <a
                  href={`/companies?q=${encodeURIComponent(contact.company)}`}
                >
                  {contact.company}
                </a>
              </InfoItem>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <section class="detail-section">
            <h2 class="section-heading">Tags</h2>
            <div class="contact-detail__tags">
              {tags.map((t) => (
                <span key={t} class="contact-detail__tag">{t}</span>
              ))}
            </div>
          </section>
        )}

        <MarkdownSection title="Notes" markdown={contact.notes} />

        <AuditMeta
          createdAt={contact.createdAt}
          updatedAt={contact.updatedAt}
          createdBy={contact.createdBy}
          updatedBy={contact.updatedBy}
        />
      </main>

      <div id="contacts-form-container" />
    </MainLayout>
  );
};
