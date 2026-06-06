// Presentational sections extracted from task-detail.tsx to keep the main view
// lean. All htmx/SSE element ids + attributes are copied verbatim — these are
// pure layout split-outs, not behavior changes.

import type { FC } from "hono/jsx";
import type { Task } from "../../types/task.types.ts";
import type { Person } from "../../types/person.types.ts";
import type { Milestone } from "../../types/milestone.types.ts";
import { formatDate, timeAgo } from "../../utils/time.ts";
import { toKebab } from "../../utils/slug.ts";
import {
  TASK_PRIORITY_LABELS,
  TASK_SECTION_VARIANTS,
} from "../../domains/task/constants.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";

// ── Shared helpers ──────────────────────────────────────────────────────────

export const priorityClass = (p: number | undefined): string =>
  p ? `badge priority--${p}` : "";

export const sectionBadgeClass = (section: string): string => {
  const key = section.toLowerCase();
  return badgeClass(TASK_SECTION_VARIANTS, key);
};

export const MetaField: FC<{ label: string; children: unknown }> = (
  { label, children },
) => (
  <>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </>
);

// ── Quick actions bar ───────────────────────────────────────────────────────
// Move, assign, then mark complete last. Deliberately NOT the shared
// <DetailActions> (Edit + Delete row): this is a richer quick-actions bar
// (Move-to select + Assign autocomplete + Mark complete/Reopen toggle alongside
// Edit/Archive), with full-size buttons matching those neighbors. DetailActions
// is the standalone Edit+Delete row (margin-left:auto) and can't absorb the
// bespoke quick-action controls — justified exception (cz1i).

export const TaskQuickActions: FC<{
  task: Task;
  sections: readonly string[];
  assigneeDisplayName: string;
}> = ({ task, sections, assigneeDisplayName }) => (
  <div class="task-detail__quick-actions">
    <form
      class="task-detail__action-group"
      hx-post={`/tasks/${task.id}/move`}
      hx-target="#task-detail-root"
      hx-select="#task-detail-root"
      hx-swap="outerHTML"
      hx-trigger="change from:#move-section"
    >
      <label class="task-detail__action-label" for="move-section">
        Move to
      </label>
      <select id="move-section" name="section" class="form__select">
        {sections.map((s) => (
          <option key={s} value={s} selected={s === task.section}>
            {s}
          </option>
        ))}
      </select>
    </form>

    <div class="task-detail__action-group">
      <label class="task-detail__action-label" for="assign-search">
        Assign
      </label>
      <div class="form__autocomplete">
        <input
          type="text"
          id="assign-search"
          class="form__input"
          placeholder="Search people..."
          value={assigneeDisplayName}
          autocomplete="off"
          name="q"
          data-autocomplete-target="assign-hidden"
          data-freetext="true"
          hx-get="/autocomplete/people"
          hx-trigger="input changed delay:150ms, focus"
          hx-target="#assign-results"
          hx-include="this"
          hx-swap="innerHTML"
        />
        <input
          type="hidden"
          id="assign-hidden"
          name="assignee"
          value={task.assignee ?? ""}
          hx-post={`/tasks/${task.id}/assign`}
          hx-target="#task-detail-root"
          hx-select="#task-detail-root"
          hx-swap="outerHTML"
          hx-trigger="input"
          hx-include="this"
        />
        <ul class="form__autocomplete-list" id="assign-results" />
      </div>
    </div>

    {!task.completed
      ? (
        <button
          class="btn btn--primary"
          type="button"
          hx-post={`/tasks/${task.id}/complete`}
          hx-target="#task-detail-root"
          hx-select="#task-detail-root"
          hx-swap="outerHTML"
        >
          Mark complete
        </button>
      )
      : (
        <button
          class="btn btn--secondary"
          type="button"
          hx-post={`/tasks/${task.id}/reopen`}
          hx-target="#task-detail-root"
          hx-select="#task-detail-root"
          hx-swap="outerHTML"
        >
          Reopen
        </button>
      )}
    {task.archived === true
      ? (
        <>
          <button
            class="btn btn--secondary"
            type="button"
            hx-post={`/tasks/${task.id}/restore`}
            hx-swap="none"
          >
            Restore
          </button>
          <button
            class="btn btn--danger btn--sm"
            type="button"
            hx-post={`/tasks/${task.id}/destroy`}
            hx-confirm={`Permanently delete "${task.title}"? This cannot be undone — the file will be removed from disk.`}
            data-confirm-title="Delete permanently"
            data-confirm-label="Delete permanently"
            hx-swap="none"
          >
            Delete permanently
          </button>
        </>
      )
      : (
        <>
          <button
            class="btn btn--secondary"
            type="button"
            hx-get={`/tasks/${task.id}/edit`}
            hx-target="#tasks-form-container"
            hx-swap="innerHTML"
          >
            Edit
          </button>
          <button
            class="btn btn--danger btn--sm"
            type="button"
            hx-delete={`/tasks/${task.id}`}
            hx-confirm={`Archive "${task.title}"? Archived items can be restored from the archived view.`}
            data-confirm-title="Archive"
            data-confirm-label="Archive"
            hx-swap="none"
          >
            Archive
          </button>
        </>
      )}
  </div>
);

// ── Header + metadata ───────────────────────────────────────────────────────

export const TaskMetaHeader: FC<{
  task: Task;
  milestonEntity: Milestone | null;
  assigneePerson: Person | null;
}> = ({ task, milestonEntity, assigneePerson }) => (
  <header class="detail-section detail-header task-detail__header">
    <div class="detail-title-row task-detail__title-row">
      <h1 class="detail-title task-detail__title">
        {task.completed && <span class="task-detail__completed-mark">[x]</span>}
        {task.title}
      </h1>
      <span class={sectionBadgeClass(task.section)}>{task.section}</span>
      {task.priority && (
        <span class={priorityClass(task.priority)}>
          {TASK_PRIORITY_LABELS[String(task.priority)] ?? `P${task.priority}`}
        </span>
      )}
      <div class="task-detail__copy-btns">
        <button
          class="btn btn--tertiary btn--sm"
          type="button"
          data-copy
          data-copy-value={task.id}
          title="Copy task ID"
        >
          Copy ID
        </button>
        <button
          class="btn btn--tertiary btn--sm"
          type="button"
          data-copy="url"
          title="Copy permalink"
        >
          Copy URL
        </button>
      </div>
    </div>

    <dl class="task-detail__meta">
      {task.project && (
        <MetaField label="Project">
          <a href={`/portfolio/${toKebab(task.project)}`}>{task.project}</a>
        </MetaField>
      )}
      {task.milestone && (
        <MetaField label="Milestone">
          {milestonEntity
            ? <a href={`/milestones/${milestonEntity.id}`}>{task.milestone}</a>
            : task.milestone}
        </MetaField>
      )}
      {task.assignee && (
        <MetaField label="Assignee">
          {assigneePerson
            ? <a href={`/people/${assigneePerson.id}`}>{assigneePerson.name}</a>
            : task.assignee}
        </MetaField>
      )}
      {task.due_date && (
        <MetaField label="Due">{formatDate(task.due_date)}</MetaField>
      )}
      {task.planned_start && (
        <MetaField label="Planned start">
          {formatDate(task.planned_start)}
        </MetaField>
      )}
      {task.planned_end && (
        <MetaField label="Planned end">
          {formatDate(task.planned_end)}
        </MetaField>
      )}
      {task.effort != null && (
        <MetaField label="Effort">{task.effort}</MetaField>
      )}
      {task.createdAt && (
        <MetaField label="Created">
          {formatDate(task.createdAt, true)}
        </MetaField>
      )}
      {task.updatedAt && (
        <MetaField label="Updated">{timeAgo(task.updatedAt)}</MetaField>
      )}
      {task.claimedBy && (
        <MetaField label="Claimed by">
          {task.claimedBy}
          {task.claimedAt && (
            <span class="task-detail__meta-hint">
              &nbsp;({timeAgo(task.claimedAt)})
            </span>
          )}
        </MetaField>
      )}
    </dl>

    {task.tags && task.tags.length > 0 && (
      <div class="task-detail__tags">
        {task.tags.map((t) => (
          <span key={t} class="task-detail__tag">{t}</span>
        ))}
      </div>
    )}
  </header>
);

// ── Subtasks ────────────────────────────────────────────────────────────────

export const TaskSubtasksSection: FC<{ subtasks: Task["children"] }> = (
  { subtasks },
) => {
  if (!subtasks || subtasks.length === 0) return null;
  return (
    <section class="detail-section task-detail__section">
      <h2>
        Subtasks
        <span class="task-detail__count">({subtasks.length})</span>
      </h2>
      <ul class="task-detail__subtasks">
        {subtasks.map((child) => (
          <li key={child.id} class="task-detail__subtask-item">
            <span
              class={`task-detail__subtask-check${
                child.completed ? " task-detail__subtask-check--done" : ""
              }`}
            >
              {child.completed ? "[x]" : "[ ]"}
            </span>
            <span class="task-detail__subtask-title">{child.title}</span>
            <span class={sectionBadgeClass(child.section)}>
              {child.section}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

// ── Blocked by ──────────────────────────────────────────────────────────────

export const TaskBlockedBySection: FC<{ blockedByTasks: Task[] }> = (
  { blockedByTasks },
) => {
  if (blockedByTasks.length === 0) return null;
  return (
    <section class="detail-section task-detail__section">
      <h2>
        Blocked by
        <span class="task-detail__count">({blockedByTasks.length})</span>
      </h2>
      <ul class="task-detail__blockers">
        {blockedByTasks.map((bt) => (
          <li key={bt.id} class="task-detail__blocker-item">
            <span
              class={`task-detail__subtask-check${
                bt.completed ? " task-detail__subtask-check--done" : ""
              }`}
            >
              {bt.completed ? "[x]" : "[ ]"}
            </span>
            <a class="task-detail__link" href={`/tasks/${bt.id}`}>{bt.title}</a>
            <span class={sectionBadgeClass(bt.section)}>{bt.section}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

// ── Attachments (upload/download/delete) ────────────────────────────────────

export const TaskAttachmentsSection: FC<{ task: Task }> = ({ task }) => (
  <section class="detail-section task-detail__section">
    <h2>Attachments</h2>
    {task.attachments && task.attachments.length > 0 && (
      <ul class="task-detail__files">
        {task.attachments.map((a) => {
          const filename = a.split("/").pop() ?? a;
          return (
            <li key={a} class="task-detail__file-row">
              <a
                href={`/api/v1/tasks/${task.id}/upload/${filename}`}
                class="task-detail__file-link"
                download
              >
                {filename}
              </a>
              <button
                type="button"
                class="btn btn--ghost btn--sm task-detail__file-delete"
                hx-delete={`/tasks/${task.id}/upload/${filename}`}
                hx-confirm={`Delete ${filename}?`}
                hx-swap="none"
              >
                &times;
              </button>
            </li>
          );
        })}
      </ul>
    )}
    <form
      class="task-detail__upload-form"
      hx-encoding="multipart/form-data"
      hx-post={`/tasks/${task.id}/upload`}
      hx-swap="none"
    >
      <input
        type="file"
        name="file"
        class="task-detail__upload-input"
        required
      />
      <button type="submit" class="btn btn--sm btn--secondary">Upload</button>
    </form>
  </section>
);
