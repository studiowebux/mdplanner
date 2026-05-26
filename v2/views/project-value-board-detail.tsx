import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { ProjectValueBoard } from "../types/project-value-board.types.ts";
import {
  PROJECT_VALUE_BOARD_SECTION_KEYS,
  type ProjectValueBoardSectionKey,
} from "../types/project-value-board.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { PROJECT_VALUE_BOARD_SECTION_META } from "../domains/project-value-board/constants.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";

// ---------------------------------------------------------------------------
// Section block
// ---------------------------------------------------------------------------

const SectionBlock: FC<{
  boardId: string;
  sectionKey: ProjectValueBoardSectionKey;
  label: string;
  modifier: string;
  singular: string;
  items: string[];
  editing: boolean;
  editSuffix: string;
}> = (
  {
    boardId,
    sectionKey,
    label,
    modifier,
    singular,
    items,
    editing,
    editSuffix,
  },
) => (
  <div class="pv-board__cell" data-quadrant={modifier}>
    <div class="pv-board__cell-header">
      <h3 class="pv-board__cell-title">{label}</h3>
      <span class="badge">{items.length}</span>
    </div>
    {items.length === 0 && !editing
      ? <p class="quadrant-card__empty">Add items…</p>
      : (
        <ul class="quadrant-card__list">
          {items.map((item, idx) =>
            editing
              ? (
                <li key={idx} class="quadrant-card__item">
                  <input
                    type="text"
                    class="quadrant-card__inline-edit"
                    name="text"
                    value={item}
                    data-quadrant-edit={`/project-value/${boardId}/${sectionKey}/${idx}${editSuffix}`}
                    hx-put={`/project-value/${boardId}/${sectionKey}/${idx}${editSuffix}`}
                    hx-trigger="quadrant-save"
                    hx-target="#pv-detail-root"
                    hx-select="#pv-detail-root"
                    hx-swap="outerHTML"
                    hx-include="this"
                  />
                  <button
                    type="button"
                    class="quadrant-card__remove"
                    hx-delete={`/project-value/${boardId}/${sectionKey}/${idx}${editSuffix}`}
                    hx-confirm={`Remove "${item}"?`}
                    hx-target="#pv-detail-root"
                    hx-select="#pv-detail-root"
                    hx-swap="outerHTML"
                    aria-label={`Remove "${item}"`}
                  >
                    &times;
                  </button>
                </li>
              )
              : <li key={idx}>{item}</li>
          )}
        </ul>
      )}
    {editing && (
      <div class="quadrant-card__add">
        <input
          type="text"
          class="quadrant-card__input quadrant-card__input--ghost"
          name="text"
          placeholder={`Add ${singular}…`}
          data-quadrant-add={`/project-value/${boardId}/${sectionKey}${editSuffix}`}
          hx-post={`/project-value/${boardId}/${sectionKey}${editSuffix}`}
          hx-trigger="quadrant-submit"
          hx-target="#pv-detail-root"
          hx-select="#pv-detail-root"
          hx-swap="outerHTML"
          hx-include="this"
          autocomplete="off"
        />
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const ProjectValueBoardDetailView: FC<
  ViewProps & { item: ProjectValueBoard; editing?: boolean }
> = ({ item: board, editing = false, ...viewProps }) => {
  const editSuffix = editing ? "?editing=true" : "";

  return (
    <MainLayout
      title={board.title}
      {...viewProps}
      styles={["/css/views/project-value-boards.css"]}
      scripts={["/js/quadrant-edit.js"]}
    >
      <SseRefresh
        getUrl={"/project-value/" + board.id + editSuffix}
        trigger="sse:project-value-board.updated"
        targetId="pv-detail-root"
      />
      <main
        id="pv-detail-root"
        class={`detail-view pv-detail${editing ? " pv-detail--editing" : ""}`}
      >
        <Breadcrumb
          items={[
            { label: "Value Boards", href: "/project-value" },
            { label: board.title },
          ]}
        />
        <BackButton href="/project-value" label="Back to Value Boards" />

        {/* -- Header ------------------------------------------------------- */}
        <header class="detail-section detail-header pv-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{board.title}</h1>
            <span class="badge badge--neutral">{formatDate(board.date)}</span>
          </div>
          <DetailActions
            entity="project-value"
            id={board.id}
            title={board.title}
            formContainerId="project-value-form-container"
            archived={board.archived === true}
          >
            {editing
              ? (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/project-value/${board.id}`}
                >
                  Done Editing
                </a>
              )
              : (
                <a
                  class="btn btn--secondary btn--sm"
                  href={`/project-value/${board.id}?editing=true`}
                >
                  Edit Items
                </a>
              )}
          </DetailActions>
        </header>

        <ArchivedBanner entity={board} />

        {/* -- Project ------------------------------------------------------- */}
        {board.project && (
          <div class="detail-section detail-info-row">
            <InfoItem label="Project">
              <a href={`/portfolio/${toKebab(board.project)}`}>
                {board.project}
              </a>
            </InfoItem>
          </div>
        )}

        {/* -- Value Board grid ---------------------------------------------- */}
        <div class="pv-board">
          {PROJECT_VALUE_BOARD_SECTION_KEYS.map((key) => {
            const meta = PROJECT_VALUE_BOARD_SECTION_META[key];
            return (
              <SectionBlock
                key={key}
                boardId={board.id}
                sectionKey={key}
                label={meta.label}
                modifier={meta.modifier}
                singular={meta.singular}
                items={board[key as keyof ProjectValueBoard] as string[]}
                editing={editing}
                editSuffix={editSuffix}
              />
            );
          })}
        </div>

        {/* -- Notes --------------------------------------------------------- */}
        <MarkdownSection title="Notes" markdown={board.notes} />

        <AuditMeta
          createdAt={board.createdAt}
          updatedAt={board.updatedAt}
          createdBy={board.createdBy}
          updatedBy={board.updatedBy}
        />
      </main>

      <div id="project-value-form-container" />
    </MainLayout>
  );
};
