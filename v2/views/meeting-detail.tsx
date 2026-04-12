import type { FC } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { AutocompleteWidget } from "../components/ui/autocomplete-widget.tsx";
import type {
  Meeting,
  MeetingAction,
  OpenActionEntry,
} from "../types/meeting.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { MarkdownSection } from "./components/markdown-section.tsx";

// ---------------------------------------------------------------------------
// Action item row
// ---------------------------------------------------------------------------

const ActionRow: FC<{ action: MeetingAction; meetingId: string }> = (
  { action, meetingId },
) => (
  <tr class="data-table__row">
    <td class="data-table__td">{action.description}</td>
    <td class="data-table__td">{action.owner ?? "—"}</td>
    <td class="data-table__td">{action.due ?? "—"}</td>
    <td class="data-table__td">
      <button
        type="button"
        class={`badge badge--${
          action.status === "done" ? "success" : "warning"
        } action-badge`}
        hx-put={`/api/v1/meetings/${meetingId}/actions/${action.id}/toggle`}
        hx-target="#meeting-actions-table"
        hx-swap="outerHTML"
        title="Toggle status"
      >
        {action.status}
      </button>
    </td>
    <td class="data-table__td data-table__td--actions">
      <button
        type="button"
        class="btn btn--icon btn--danger-ghost action-delete"
        hx-delete={`/api/v1/meetings/${meetingId}/actions/${action.id}`}
        hx-target="#meeting-actions-table"
        hx-swap="outerHTML"
        hx-confirm="Delete this action item?"
        title="Delete action"
        aria-label="Delete action"
      >
        &times;
      </button>
    </td>
  </tr>
);

// ---------------------------------------------------------------------------
// Actions table fragment — exported for API fragment responses
// ---------------------------------------------------------------------------

const ActionsTableComponent: FC<{ meeting: Meeting }> = ({ meeting }) => (
  <section id="meeting-actions-table" class="detail-section">
    <h2 class="section-heading">
      Action Items
      {meeting.actions.length > 0 && (
        <span class="badge badge--neutral meeting-detail__actions-count">
          {meeting.actions.filter((a) => a.status === "open").length} open /
          {" "}
          {meeting.actions.length} total
        </span>
      )}
    </h2>

    {meeting.actions.length > 0 && (
      <div class="data-table-wrapper">
        <table class="data-table data-table--compact meeting-detail__actions-table">
          <thead class="data-table__head">
            <tr>
              <th class="data-table__th">Description</th>
              <th class="data-table__th">Owner</th>
              <th class="data-table__th">Due</th>
              <th class="data-table__th">Status</th>
              <th class="data-table__th" />
            </tr>
          </thead>
          <tbody class="data-table__body">
            {meeting.actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                meetingId={meeting.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    )}

    {/* Inline add form */}
    <form
      class="meeting-detail__add-action-form"
      hx-post={`/api/v1/meetings/${meeting.id}/actions`}
      hx-target="#meeting-actions-table"
      hx-swap="outerHTML"
      hx-ext="json-enc"
      hx-on--htmx:after-request="this.reset()"
    >
      <input
        class="input meeting-detail__add-action-input"
        type="text"
        name="description"
        placeholder="Add action item…"
        required
      />
      <input
        class="input meeting-detail__add-action-input meeting-detail__add-action-input--sm"
        type="text"
        name="owner"
        placeholder="Owner"
      />
      <input
        class="input meeting-detail__add-action-input meeting-detail__add-action-input--sm"
        type="date"
        name="due"
      />
      <button class="btn btn--primary" type="submit">Add</button>
    </form>
  </section>
);

/** Render the actions table section as an HTML string for fragment responses. */
export function renderActionsTable(meeting: Meeting): string {
  return renderToString(<ActionsTableComponent meeting={meeting} />);
}

// ---------------------------------------------------------------------------
// Carry-over section — open actions from prior meetings
// ---------------------------------------------------------------------------

const CarryoverSectionContent: FC<{ entries: OpenActionEntry[] }> = (
  { entries },
) => (
  <div id="meeting-carryover-content">
    {entries.length === 0
      ? <p class="empty-state__text">No open actions from previous meetings.</p>
      : (
        <ul class="meeting-detail__carryover-list">
          {entries.map((e) => (
            <li key={e.action.id} class="meeting-detail__carryover-item">
              <a
                href={`/meetings/${e.meetingId}`}
                class="meeting-detail__carryover-source"
              >
                {e.meetingTitle}
                <span class="meeting-detail__carryover-date">
                  {e.meetingDate}
                </span>
              </a>
              <span class="meeting-detail__carryover-desc">
                {e.action.description}
              </span>
              {e.action.owner && (
                <span class="badge badge--neutral">
                  {e.action.owner}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
  </div>
);

/** Render the carry-over section content as an HTML string for fragment responses. */
export function renderCarryoverSection(entries: OpenActionEntry[]): string {
  return renderToString(<CarryoverSectionContent entries={entries} />);
}

const CarryoverSection: FC<{ meetingId: string }> = ({ meetingId }) => (
  <details
    class="detail-section meeting-detail__carryover"
    hx-get={`/api/v1/meetings/${meetingId}/open-actions`}
    hx-target="#meeting-carryover-content"
    hx-swap="outerHTML"
    hx-trigger="toggle once"
  >
    <summary class="meeting-detail__carryover-summary">
      Open actions from previous meetings
    </summary>
    <div id="meeting-carryover-content">
      <p class="meeting-detail__carryover-loading">Loading…</p>
    </div>
  </details>
);

// ---------------------------------------------------------------------------
// Related meetings section — exported for API fragment responses
// ---------------------------------------------------------------------------

const RelatedMeetingsSectionComponent: FC<
  { meeting: Meeting; relatedItems: Meeting[] }
> = ({ meeting, relatedItems }) => {
  const sorted = [...relatedItems].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section id="meeting-related-section" class="detail-section">
      <h2 class="section-heading">Related Meetings</h2>

      {sorted.length > 0 && (
        <ul class="meeting-detail__related-list">
          {sorted.map((r) => {
            const open = r.actions.filter((a) => a.status === "open").length;
            return (
              <li key={r.id} class="meeting-detail__related-item">
                <a
                  href={`/meetings/${r.id}`}
                  class="meeting-detail__related-title"
                >
                  {r.title}
                </a>
                <span class="meeting-detail__related-date">{r.date}</span>
                {open > 0 && (
                  <span class="badge badge--warning meeting-detail__related-actions">
                    {open} open
                  </span>
                )}
                <button
                  type="button"
                  class="btn btn--icon btn--danger-ghost meeting-detail__related-remove"
                  hx-delete={`/api/v1/meetings/${meeting.id}/links/${r.id}`}
                  hx-target="#meeting-related-section"
                  hx-swap="outerHTML"
                  hx-confirm="Remove this link?"
                  title="Remove link"
                  aria-label="Remove link"
                >
                  &times;
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Inline link form */}
      <form
        class="meeting-detail__link-form"
        hx-post={`/api/v1/meetings/${meeting.id}/links`}
        hx-target="#meeting-related-section"
        hx-swap="outerHTML"
        hx-ext="json-enc"
        hx-on--htmx:after-request="this.reset()"
      >
        <AutocompleteWidget
          id={`meeting-link-${meeting.id}`}
          name="linkedId"
          source="meetings-by-id"
          placeholder="Search meetings…"
          required
        />
        <button class="btn btn--secondary" type="submit">Link</button>
      </form>

      {/* Schedule follow-up */}
      <div class="meeting-detail__related-footer">
        <button
          type="button"
          class="btn btn--ghost"
          hx-get={`/meetings/new?related=${meeting.id}`}
          hx-target="#meetings-form-container"
          hx-swap="innerHTML"
          data-sidenav-open="meetings-form-container"
        >
          Schedule follow-up
        </button>
      </div>
    </section>
  );
};

/** Render the related meetings section as an HTML string for fragment responses. */
export function renderRelatedSection(
  meeting: Meeting,
  relatedItems: Meeting[],
): string {
  return renderToString(
    <RelatedMeetingsSectionComponent
      meeting={meeting}
      relatedItems={relatedItems}
    />,
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const MeetingDetailView: FC<
  ViewProps & { item: Meeting; relatedItems: Meeting[] }
> = (
  { item: meeting, relatedItems, ...viewProps },
) => {
  const attendees = meeting.attendees ?? [];

  return (
    <MainLayout
      title={meeting.title}
      {...viewProps}
      styles={["/css/views/meetings.css"]}
    >
      <SseRefresh
        getUrl={"/meetings/" + meeting.id}
        trigger="sse:meeting.updated"
        targetId="meeting-detail-root"
      />
      <main id="meeting-detail-root" class="detail-view meeting-detail">
        <BackButton href="/meetings" label="Back to Meetings" />

        {/* -- Header ----------------------------------------------------- */}
        <header class="detail-section meeting-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{meeting.title}</h1>
          </div>
          <DetailActions
            entity="meetings"
            id={meeting.id}
            title={meeting.title}
            formContainerId="meetings-form-container"
          />
        </header>

        {/* -- Info -------------------------------------------------------- */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Date">{meeting.date}</InfoItem>
          {meeting.project && (
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(meeting.project)}`}>
                {meeting.project}
              </a>
            </InfoItem>
          )}
        </div>

        {/* -- Attendees -------------------------------------------------- */}
        {attendees.length > 0 && (
          <div class="detail-section">
            <h2 class="section-heading">Attendees</h2>
            <div class="form__tags-pills">
              {attendees.map((a, i) => (
                <span key={i} class="form__tags-pill">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* -- Agenda ----------------------------------------------------- */}
        <MarkdownSection title="Agenda" markdown={meeting.agenda} />

        {/* -- Notes ------------------------------------------------------ */}
        <MarkdownSection title="Notes" markdown={meeting.notes} />

        {/* -- Action items ----------------------------------------------- */}
        <ActionsTableComponent meeting={meeting} />

        {/* -- Related meetings ------------------------------------------- */}
        <RelatedMeetingsSectionComponent
          meeting={meeting}
          relatedItems={relatedItems}
        />

        {/* -- Carry-over open actions from prior meetings ---------------- */}
        <CarryoverSection meetingId={meeting.id} />

        {/* -- Meta ------------------------------------------------------- */}
        <AuditMeta
          createdAt={meeting.createdAt}
          updatedAt={meeting.updatedAt}
          createdBy={meeting.createdBy}
          updatedBy={meeting.updatedBy}
        />
      </main>

      <div id="meetings-form-container" />
    </MainLayout>
  );
};
