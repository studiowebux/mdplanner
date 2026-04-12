import type { FC } from "hono/jsx";
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
// Action items table
// ---------------------------------------------------------------------------

const ActionItem: FC<{ action: MeetingAction }> = ({ action }) => (
  <tr class="data-table__row">
    <td class="data-table__td">{action.description}</td>
    <td class="data-table__td">{action.owner ?? "—"}</td>
    <td class="data-table__td">{action.due ?? "—"}</td>
    <td class="data-table__td">
      <span
        class={`badge badge--${
          action.status === "done" ? "success" : "warning"
        }`}
      >
        {action.status}
      </span>
    </td>
  </tr>
);

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
          {meeting.actions.length > 0 && (
            <InfoItem label="Actions">
              {meeting.actions.filter((a) => a.status === "open").length} open /
              {" "}
              {meeting.actions.length} total
            </InfoItem>
          )}
        </div>

        {/* -- Attendees -------------------------------------------------- */}
        {attendees.length > 0 && (
          <div class="detail-section meeting-detail__attendees">
            <h3 class="meeting-detail__attendees-label">Attendees</h3>
            <ul class="meeting-detail__attendees-list">
              {attendees.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}

        {/* -- Agenda ----------------------------------------------------- */}
        <MarkdownSection title="Agenda" markdown={meeting.agenda} />

        {/* -- Notes ------------------------------------------------------ */}
        <MarkdownSection title="Notes" markdown={meeting.notes} />

        {/* -- Action items ----------------------------------------------- */}
        {meeting.actions.length > 0 && (
          <section class="detail-section">
            <h2 class="section-heading">Action Items</h2>
            <div class="data-table-wrapper">
              <table class="data-table data-table--compact meeting-detail__actions-table">
                <thead class="data-table__head">
                  <tr>
                    <th class="data-table__th">Description</th>
                    <th class="data-table__th">Owner</th>
                    <th class="data-table__th">Due</th>
                    <th class="data-table__th">Status</th>
                  </tr>
                </thead>
                <tbody class="data-table__body">
                  {meeting.actions.map((action) => (
                    <ActionItem key={action.id} action={action} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

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
