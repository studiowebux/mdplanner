// Task detail view — full task display with comments, time entries,
// approval status, subtasks, blocked-by, and quick actions.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Task } from "../types/task.types.ts";
import type { Person } from "../types/person.types.ts";
import type { Milestone } from "../types/milestone.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate, timeAgo } from "../utils/time.ts";
import { TASK_PRIORITY_LABELS } from "../domains/task/constants.tsx";
import { getSectionOrder } from "../constants/mod.ts";
import {
  getMilestoneService,
  getPeopleService,
  getTaskService,
} from "../singletons/services.ts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TaskDetailProps = {
  task: Task;
  assigneePerson: Person | null;
  milestonEntity: Milestone | null;
  blockedByTasks: Task[];
};

type Props = ViewProps & TaskDetailProps;

// ---------------------------------------------------------------------------
// Data resolution — shared by detail route and action endpoints
// ---------------------------------------------------------------------------

export async function resolveTaskDetailProps(task: Task): Promise<{
  assigneePerson: Person | null;
  milestonEntity: Milestone | null;
  blockedByTasks: Task[];
}> {
  const taskSvc = getTaskService();
  const peopleSvc = getPeopleService();
  const milestoneSvc = getMilestoneService();

  const [assigneePerson, milestonEntity, blockedByTasks] = await Promise.all([
    task.assignee ? peopleSvc.getById(task.assignee) : null,
    task.milestone ? milestoneSvc.getByName(task.milestone) : null,
    task.blocked_by?.length
      ? Promise.all(
        task.blocked_by.map((id) => taskSvc.getById(id)),
      ).then((results) => results.filter(Boolean) as Task[])
      : [],
  ]);

  return { assigneePerson, milestonEntity, blockedByTasks };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const priorityClass = (p: number | undefined): string =>
  p ? `task-priority task-priority--${p}` : "";

const sectionBadgeClass = (section: string): string => {
  const slug = section.toLowerCase().replace(/\s+/g, "-");
  return `task-detail__badge task-detail__badge--${slug}`;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MetaField: FC<{ label: string; children: unknown }> = (
  { label, children },
) => (
  <>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </>
);

const CommentsSection: FC<{ comments: Task["comments"] }> = ({ comments }) => {
  if (!comments?.length) return null;
  return (
    <section class="task-detail__section">
      <h2>
        Comments
        <span class="task-detail__count">({comments.length})</span>
      </h2>
      <ol class="task-detail__comments">
        {comments.map((c) => (
          <li key={c.id} class="task-detail__comment">
            <div class="task-detail__comment-header">
              <span class="task-detail__comment-author">
                {c.author ?? "Unknown"}
              </span>
              <time class="task-detail__comment-time">
                {timeAgo(c.timestamp)}
              </time>
            </div>
            <div class="task-detail__comment-body">{c.body}</div>
            {c.metadata && Object.keys(c.metadata).length > 0 && (
              <details class="task-detail__comment-meta">
                <summary>Metadata</summary>
                <pre>{JSON.stringify(c.metadata, null, 2)}</pre>
              </details>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};

const TimeEntriesSection: FC<{ entries: Task["time_entries"] }> = (
  { entries },
) => {
  if (!entries?.length) return null;
  const total = entries.reduce((sum, e) => sum + e.hours, 0);
  return (
    <section class="task-detail__section">
      <h2>
        Time entries
        <span class="task-detail__count">({entries.length})</span>
      </h2>
      <table class="task-detail__table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Hours</th>
            <th>Person</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{formatDate(e.date)}</td>
              <td>{e.hours}</td>
              <td>{e.person ?? ""}</td>
              <td>{e.description ?? ""}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td>{total}</td>
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
    </section>
  );
};

const ApprovalSection: FC<{ approval: Task["approvalRequest"] }> = (
  { approval },
) => {
  if (!approval) return null;
  const verdict = approval.verdict;
  return (
    <section class="task-detail__section">
      <h2>Approval request</h2>
      <dl class="task-detail__meta">
        <MetaField label="Requested by">{approval.requestedBy}</MetaField>
        <MetaField label="Requested at">
          {formatDate(approval.requestedAt, true)}
        </MetaField>
        {approval.commitHash && (
          <MetaField label="Commit">{approval.commitHash}</MetaField>
        )}
      </dl>
      <div class="task-detail__approval-summary">{approval.summary}</div>
      {verdict && (
        <div
          class={`task-detail__verdict task-detail__verdict--${verdict.decision}`}
        >
          <span class="task-detail__verdict-label">{verdict.decision}</span>
          <span class="task-detail__verdict-by">
            by {verdict.decidedBy} &middot;{" "}
            {formatDate(verdict.decidedAt, true)}
          </span>
          {verdict.feedback && (
            <p class="task-detail__verdict-feedback">{verdict.feedback}</p>
          )}
        </div>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const TaskDetailView: FC<Props> = (
  { task, assigneePerson, milestonEntity, blockedByTasks, ...rest },
) => {
  const sections = getSectionOrder();
  const assigneeDisplayName = assigneePerson?.name ?? "";

  return (
    <MainLayout
      title={task.title}
      {...rest}
      styles={["/css/views/task.css", "/css/views/github.css"]}
      scripts={[]}
    >
      <div
        hx-ext="sse"
        sse-connect="/sse"
        hx-get={`/tasks/${task.id}`}
        hx-trigger="sse:task.updated, sse:task.deleted"
        hx-target="#task-detail-root"
        hx-select="#task-detail-root"
        hx-swap="outerHTML"
      />
      <main id="task-detail-root" class="task-detail">
        {/* Back link — matches person-detail / milestone-detail pattern */}
        <div class="task-detail__back">
          <a href="/tasks" class="btn btn--secondary">Back to tasks</a>
        </div>

        {/* Quick actions bar — move, assign, then mark complete last */}
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
            <select
              id="move-section"
              name="section"
              class="form__select"
            >
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
        </div>

        {/* Two-column layout: left = meta, right = description */}
        <div class="task-detail__columns">
          {/* Left column — header + metadata */}
          <div class="task-detail__col-left">
            <header class="task-detail__header">
              <div class="task-detail__title-row">
                <h1 class="task-detail__title">
                  {task.completed && (
                    <span class="task-detail__completed-mark">[x]</span>
                  )}
                  {task.title}
                </h1>
                <span class={sectionBadgeClass(task.section)}>
                  {task.section}
                </span>
                {task.priority && (
                  <span class={priorityClass(task.priority)}>
                    {TASK_PRIORITY_LABELS[String(task.priority)] ??
                      `P${task.priority}`}
                  </span>
                )}
              </div>

              <dl class="task-detail__meta">
                {task.project && (
                  <MetaField label="Project">{task.project}</MetaField>
                )}
                {task.milestone && (
                  <MetaField label="Milestone">
                    {milestonEntity
                      ? (
                        <a
                          class="task-detail__link"
                          href={`/milestones/${milestonEntity.id}`}
                        >
                          {task.milestone}
                        </a>
                      )
                      : task.milestone}
                  </MetaField>
                )}
                {task.assignee && (
                  <MetaField label="Assignee">
                    {assigneePerson
                      ? (
                        <a
                          class="task-detail__link"
                          href={`/people/${assigneePerson.id}`}
                        >
                          {assigneePerson.name}
                        </a>
                      )
                      : task.assignee}
                  </MetaField>
                )}
                {task.due_date && (
                  <MetaField label="Due">
                    {formatDate(task.due_date)}
                  </MetaField>
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
                  <MetaField label="Updated">
                    {timeAgo(task.updatedAt)}
                  </MetaField>
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

            {/* Subtasks */}
            {task.children && task.children.length > 0 && (
              <section class="task-detail__section">
                <h2>
                  Subtasks
                  <span class="task-detail__count">
                    ({task.children.length})
                  </span>
                </h2>
                <ul class="task-detail__subtasks">
                  {task.children.map((child) => (
                    <li key={child.id} class="task-detail__subtask-item">
                      <span
                        class={`task-detail__subtask-check${
                          child.completed
                            ? " task-detail__subtask-check--done"
                            : ""
                        }`}
                      >
                        {child.completed ? "[x]" : "[ ]"}
                      </span>
                      <a
                        class="task-detail__link"
                        href={`/tasks/${child.id}`}
                      >
                        {child.title}
                      </a>
                      <span class={sectionBadgeClass(child.section)}>
                        {child.section}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Blocked by */}
            {blockedByTasks.length > 0 && (
              <section class="task-detail__section">
                <h2>
                  Blocked by
                  <span class="task-detail__count">
                    ({blockedByTasks.length})
                  </span>
                </h2>
                <ul class="task-detail__blockers">
                  {blockedByTasks.map((bt) => (
                    <li key={bt.id} class="task-detail__blocker-item">
                      <span
                        class={`task-detail__subtask-check${
                          bt.completed
                            ? " task-detail__subtask-check--done"
                            : ""
                        }`}
                      >
                        {bt.completed ? "[x]" : "[ ]"}
                      </span>
                      <a
                        class="task-detail__link"
                        href={`/tasks/${bt.id}`}
                      >
                        {bt.title}
                      </a>
                      <span class={sectionBadgeClass(bt.section)}>
                        {bt.section}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right column — description */}
          <div class="task-detail__col-right">
            {task.description && task.description.length > 0 && (
              <section class="task-detail__section">
                <h2>Description</h2>
                <div class="task-detail__description">
                  {task.description.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </section>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <section class="task-detail__section">
                <h2>Attachments</h2>
                <ul class="task-detail__files">
                  {task.attachments.map((a) => (
                    <li key={a}>
                      <code>{a}</code>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Files */}
            {task.files && task.files.length > 0 && (
              <section class="task-detail__section">
                <h2>Files</h2>
                <ul class="task-detail__files">
                  {task.files.map((f) => (
                    <li key={f}>
                      <code>{f}</code>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* GitHub section — live data loaded via htmx */}
            <section class="task-detail__section">
              <h2>GitHub</h2>
              <div
                id="task-github-section"
                hx-get={`/tasks/${task.id}/github`}
                hx-trigger="load"
                hx-swap="innerHTML"
              >
                <div class="loading-spinner" aria-label="Loading">
                  <div class="loading-spinner__ring" />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Full-width sections below columns */}
        <TimeEntriesSection entries={task.time_entries} />
        <ApprovalSection approval={task.approvalRequest} />
        <CommentsSection comments={task.comments} />

        {/* Edit + Delete at bottom — matches person-detail pattern */}
        <div class="task-detail__actions">
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
            class="btn btn--danger"
            type="button"
            hx-delete={`/tasks/${task.id}`}
            hx-swap="none"
            hx-confirm-dialog={`Delete "${task.title}"? This cannot be undone.`}
            data-confirm-name={task.title}
          >
            Delete
          </button>
        </div>
      </main>
      <div id="tasks-form-container" />
    </MainLayout>
  );
};
