import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Investor } from "../types/investor.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { formatCurrency } from "../utils/format.ts";
import {
  INVESTOR_STAGE_VARIANTS,
  INVESTOR_STATUS_LABELS,
  INVESTOR_STATUS_VARIANTS,
  INVESTOR_TYPE_LABELS,
  INVESTOR_TYPE_VARIANTS,
} from "../domains/investor/constants.tsx";

const NotesSection: FC<{ investor: Investor }> = ({ investor }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <InlineEditable
      fieldId="investor-notes"
      name="notes"
      value={investor.notes ?? ""}
      hxPut={`/investors/${investor.id}/notes?editing=true`}
      rootId="investor-detail-root"
    />
  </section>
);

export const InvestorDetailView: FC<
  ViewProps & { item: Investor; editing?: boolean }
> = (
  { item: investor, editing = false, ...viewProps },
) => {
  return (
    <MainLayout
      title={investor.name}
      {...viewProps}
      styles={["/css/views/investors.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/investors/" + investor.id +
          (editing ? "?editing=true" : "")}
        trigger="sse:investor.updated"
        targetId="investor-detail-root"
      />
      <main
        id="investor-detail-root"
        class={`detail-view investor-detail${
          editing ? " investor-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Investors", href: "/investors" },
            { label: investor.name },
          ]}
        />
        <BackButton href="/investors" label="Back to Investors" />

        <header class="detail-section detail-header investor-detail__header">
          <div>
            <h1 class="detail-title">{investor.name}</h1>
            <div class="investor-detail__badges">
              <span class={badgeClass(INVESTOR_TYPE_VARIANTS, investor.type)}>
                {INVESTOR_TYPE_LABELS[investor.type]}
              </span>
              <span class={badgeClass(INVESTOR_STAGE_VARIANTS, investor.stage)}>
                {investor.stage}
              </span>
              <span
                class={badgeClass(INVESTOR_STATUS_VARIANTS, investor.status)}
              >
                {INVESTOR_STATUS_LABELS[investor.status]}
              </span>
              {investor.tags &&
                investor.tags.map((tag) => (
                  <span key={tag} class="badge">{tag}</span>
                ))}
            </div>
          </div>
          <DetailActions
            entity="investors"
            id={investor.id}
            title={investor.name}
            formContainerId="investors-form-container"
            archived={investor.archived === true}
          >
            <EditModeToggle
              href={`/investors/${investor.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={investor} />

        <div class="detail-section detail-info-row">
          <InfoItem label="Contact">{investor.contact ?? "—"}</InfoItem>
          <InfoItem label="Target Amount">
            {investor.amountTarget != null
              ? formatCurrency(investor.amountTarget)
              : "—"}
          </InfoItem>
          <InfoItem label="Intro Date">{investor.introDate ?? "—"}</InfoItem>
          <InfoItem label="Last Contact">
            {investor.lastContact ?? "—"}
          </InfoItem>
        </div>

        {editing
          ? <NotesSection investor={investor} />
          : <MarkdownSection title="Notes" markdown={investor.notes} />}

        <AuditMeta
          createdAt={investor.createdAt}
          updatedAt={investor.updatedAt}
          createdBy={investor.createdBy}
          updatedBy={investor.updatedBy}
        />
      </main>

      <div id="investors-form-container" />
    </MainLayout>
  );
};
