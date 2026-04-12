import type { FC } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Meeting, MeetingAction } from "../types/meeting.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
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
// Main view
// ---------------------------------------------------------------------------

export const MeetingDetailView: FC<ViewProps & { item: Meeting }> = (
  { item: meeting, ...viewProps },
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
