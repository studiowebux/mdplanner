import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Contact, PositionHistoryItem } from "../types/contact.types.ts";
import { formatDate } from "../utils/time.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { CONTACT_TYPE_VARIANTS } from "../domains/contact/constants.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";

const PositionHistorySection: FC<{ history: PositionHistoryItem[] }> = (
  { history },
) => {
  if (!history.length) return null;
  return (
    <section class="detail-section contact-detail__history">
      <h2 class="section-heading">Position History</h2>
      <table class="data-table contact-detail__history-table">
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col">Title</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr
              key={i}
              class={h.active ? "contact-detail__history-active" : ""}
            >
              <td>
                <a href={`/companies?q=${encodeURIComponent(h.company)}`}>
                  {h.company}
                </a>
                {h.active && <span class="badge badge--success">current</span>}
              </td>
              <td>{h.title ?? ""}</td>
              <td>{formatDate(h.from)}</td>
              <td>{h.to ? formatDate(h.to) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const NotesSection: FC<{ contact: Contact }> = ({ contact }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <InlineEditable
      fieldId="contact-notes"
      name="notes"
      value={contact.notes ?? ""}
      hxPut={`/contacts/${contact.id}/notes?editing=true`}
      rootId="contact-detail-root"
    />
  </section>
);

export const ContactDetailView: FC<
  ViewProps & { item: Contact; editing?: boolean }
> = (
  { item: contact, editing = false, ...viewProps },
) => {
  const hasContact = contact.email || contact.phone || contact.role ||
    contact.company;
  const tags = contact.tags ?? [];

  return (
    <MainLayout
      title={contact.name}
      {...viewProps}
      styles={["/css/views/contacts.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={`/contacts/${contact.id}${editing ? "?editing=true" : ""}`}
        trigger="sse:contact.updated"
        targetId="contact-detail-root"
      />
      <main
        id="contact-detail-root"
        class={`detail-view contact-detail${
          editing ? " contact-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Contacts", href: "/contacts" },
            { label: contact.name },
          ]}
        />
        <BackButton href="/contacts" label="Back to Contacts" />

        <header class="detail-section detail-header contact-detail__header">
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
            archived={contact.archived === true}
          >
            <EditModeToggle
              href={`/contacts/${contact.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={contact} />

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

        <PositionHistorySection
          history={contact.positionHistory ?? []}
        />

        {editing
          ? <NotesSection contact={contact} />
          : <MarkdownSection title="Notes" markdown={contact.notes} />}

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
