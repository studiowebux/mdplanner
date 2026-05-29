// Task detail view — full task display with comments, time entries,
// approval status, subtasks, blocked-by, and quick actions.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Task } from "../types/task.types.ts";
import type { Person } from "../types/person.types.ts";
import type { Milestone } from "../types/milestone.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate, timeAgo } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import {
  TASK_PRIORITY_LABELS,
  TASK_SECTION_VARIANTS,
} from "../domains/task/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { getSectionOrder } from "../constants/mod.ts";
import {
  getMilestoneService,
  getPeopleService,
  getTaskService,
} from "../singletons/services.ts";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { type MentionOpts, parseMentions } from "../utils/mentions.ts";
import { Sidenav } from "../components/ui/sidenav.tsx";
import { MentionText } from "./components/mention-text.tsx";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TaskDetailProps = {
  task: Task;
  assigneePerson: Person | null;
  milestonEntity: Milestone | null;
  blockedByTasks: Task[];
  mentionOpts: MentionOpts;
  people: Person[];
};

type Props = ViewProps & TaskDetailProps;

// ---------------------------------------------------------------------------
// Data resolution — shared by detail route and action endpoints
// ---------------------------------------------------------------------------

export async function resolveTaskDetailProps(task: Task): Promise<{
  assigneePerson: Person | null;
  milestonEntity: Milestone | null;
  blockedByTasks: Task[];
  mentionOpts: MentionOpts;
  people: Person[];
}> {
  const taskSvc = getTaskService();
  const peopleSvc = getPeopleService();
  const milestoneSvc = getMilestoneService();

  const [assigneePerson, milestonEntity, blockedByTasks, allPeople] =
    await Promise.all([
      task.assignee ? peopleSvc.getById(task.assignee) : null,
      task.milestone ? milestoneSvc.getByName(task.milestone) : null,
      task.blocked_by?.length
        ? Promise.all(
          task.blocked_by.map((id) => taskSvc.getById(id)),
        ).then((results) => results.filter(Boolean) as Task[])
        : [],
      peopleSvc.list(),
    ]);

  const personMap = new Map<string, string>(
    allPeople.map((p) => [p.id, p.name]),
  );
  const mentionOpts: MentionOpts = {
    personMap,
    githubRepo: task.githubRepo ?? undefined,
  };

  return {
    assigneePerson,
    milestonEntity,
    blockedByTasks,
    mentionOpts,
    people: allPeople,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const priorityClass = (p: number | undefined): string =>
  p ? `badge priority--${p}` : "";

const sectionBadgeClass = (section: string): string => {
  const key = section.toLowerCase();
  return badgeClass(TASK_SECTION_VARIANTS, key);
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

const CommentsSection: FC<{
  taskId: string;
  comments: Task["comments"];
  mentionOpts: MentionOpts;
  people: Person[];
}> = ({ taskId, comments, mentionOpts, people }) => {
  return (
    <section class="detail-section task-detail__section">
      <h2>
        Comments
        {comments?.length
          ? <span class="task-detail__count">({comments.length})</span>
          : null}
      </h2>
      {comments?.length
        ? (
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
                <div class="task-detail__comment-body">
                  <MentionText
                    text={c.body}
                    people={people}
                    githubRepo={mentionOpts.githubRepo}
                  />
                </div>
                {c.metadata && Object.keys(c.metadata).length > 0 && (
                  <details class="task-detail__comment-meta">
                    <summary>Metadata</summary>
                    <pre>{JSON.stringify(c.metadata, null, 2)}</pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )
        : null}
      <form
        class="task-detail__add-comment"
        hx-post={`/tasks/${taskId}/comments`}
        hx-swap="none"
        hx-on--after-request="if(event.detail.successful){ this.reset(); }"
      >
        <label class="sr-only" for={`comment-body-${taskId}`}>
          Add a comment
        </label>
        <textarea
          id={`comment-body-${taskId}`}
          class="form__input task-detail__comment-input"
          name="body"
          rows={3}
          placeholder="Add a comment… type @ to mention someone"
          data-mentions
          required
        />
        <button type="submit" class="btn btn--primary btn--sm">
          Comment
        </button>
      </form>
    </section>
  );
};

export const LogTimeForm: FC<{
  taskId: string;
  actorName?: string;
  actorId?: string;
}> = ({ taskId, actorName, actorId }) => {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Sidenav id="task-log-time-form" title="Log Time" open>
      <form
        class="form"
        hx-post={`/tasks/${taskId}/time-entries`}
        hx-swap="none"
        hx-on--after-request="if(event.detail.successful){ window.location.reload(); }"
      >
        <div class="form__body">
          <div class="form__field">
            <label class="form__label" for="te-date">Date</label>
            <input
              id="te-date"
              name="date"
              type="date"
              class="form__input"
              value={today}
              required
            />
          </div>
          <div class="form__field">
            <label class="form__label" for="te-hours">Hours</label>
            <input
              id="te-hours"
              name="hours"
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              class="form__input"
              placeholder="e.g. 2.5"
              required
            />
          </div>
          <div class="form__field">
            <label class="form__label" for="te-person-search">Person</label>
            <div class="form__autocomplete">
              <input
                type="text"
                id="te-person-search"
                class="form__input"
                placeholder="Search people..."
                autocomplete="off"
                name="q"
                value={actorName ?? ""}
                data-autocomplete-target="te-person"
                hx-get="/autocomplete/people"
                hx-trigger="input changed delay:150ms, focus"
                hx-target="#te-person-results"
                hx-include="this"
                hx-swap="innerHTML"
              />
              <input
                type="hidden"
                id="te-person"
                name="person"
                value={actorId ?? ""}
              />
              <ul class="form__autocomplete-list" id="te-person-results" />
            </div>
          </div>
          <div class="form__field">
            <label class="form__label" for="te-description">Description</label>
            <input
              id="te-description"
              name="description"
              type="text"
              class="form__input"
              placeholder="Optional"
            />
          </div>
        </div>
        <div class="form__footer">
          <button type="submit" class="btn btn--primary">Log time</button>
          <button type="button" class="btn" data-sidenav-close>Cancel</button>
        </div>
      </form>
    </Sidenav>
  );
};

const TimeEntriesSection: FC<{
  taskId: string;
  entries: Task["time_entries"];
}> = ({ taskId, entries }) => {
  const list = entries ?? [];
  const total = list.reduce((sum, e) => sum + e.hours, 0);
  return (
    <section class="detail-section task-detail__section">
      <div class="task-detail__section-header">
        <h2>
          Time entries
          {list.length > 0 && (
            <span class="task-detail__count">
              ({list.length} · {total}h)
            </span>
          )}
        </h2>
        <button
          class="btn btn--secondary btn--sm"
          type="button"
          hx-get={`/tasks/${taskId}/time-entries/new`}
          hx-target="#tasks-form-container"
          hx-swap="innerHTML"
        >
          Log time
        </button>
      </div>
      {list.length > 0 && (
        <table class="data-table data-table--compact">
          <thead>
            <tr>
              <th>Date</th>
              <th>Hours</th>
              <th>Person</th>
              <th>Description</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>{formatDate(e.date)}</td>
                <td class="task-detail__time-hours">{e.hours}h</td>
                <td>{e.person ?? "—"}</td>
                <td>{e.description ?? "—"}</td>
                <td class="data-table__td--actions">
                  <button
                    class="btn btn--danger btn--sm"
                    type="button"
                    hx-delete={`/tasks/${taskId}/time-entries/${e.id}`}
                    hx-confirm="Delete this time entry?"
                    hx-swap="none"
                    hx-on--after-request="if(event.detail.successful) window.location.reload()"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

const ApprovalSection: FC<{ approval: Task["approvalRequest"] }> = (
  { approval },
) => {
  if (!approval) return null;
  const verdict = approval.verdict;
  return (
    <section class="detail-section task-detail__section">
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
  {
    task,
    assigneePerson,
    milestonEntity,
    blockedByTasks,
    mentionOpts,
    people,
    ...rest
  },
) => {
  const sections = getSectionOrder();
  const assigneeDisplayName = assigneePerson?.name ?? "";

  return (
    <MainLayout
      title={task.title}
      {...rest}
      styles={["/css/views/tasks.css", "/css/views/github.css"]}
      scripts={["/js/mention-autocomplete.js"]}
    >
      <SseRefresh
        getUrl={"/tasks/" + task.id}
        trigger="sse:task.updated, sse:task.deleted"
        targetId="task-detail-root"
      />
      <main id="task-detail-root" class="detail-view task-detail">
        {/* Back link */}
        <Breadcrumb
          items={[
            { label: "Tasks", href: "/tasks" },
            { label: task.title },
          ]}
        />
        <BackButton href="/tasks" label="Back to tasks" />

        <ArchivedBanner entity={task} />

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
            hx-confirm={`Delete "${task.title}"? This cannot be undone.`}
            hx-swap="none"
          >
            Delete
          </button>
        </div>

        {/* Two-column layout: left = meta, right = description */}
        <div class="task-detail__columns">
          {/* Left column — header + metadata */}
          <div class="task-detail__col-left">
            <header class="detail-section detail-header task-detail__header">
              <div class="detail-title-row task-detail__title-row">
                <h1 class="detail-title task-detail__title">
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
                    <a href={`/portfolio/${toKebab(task.project)}`}>
                      {task.project}
                    </a>
                  </MetaField>
                )}
                {task.milestone && (
                  <MetaField label="Milestone">
                    {milestonEntity
                      ? (
                        <a
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
              <section class="detail-section task-detail__section">
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
                      <span class="task-detail__subtask-title">
                        {child.title}
                      </span>
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
              <section class="detail-section task-detail__section">
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
              <section class="detail-section task-detail__section">
                <h2>Description</h2>
                <div class="task-detail__description">
                  {task.description.map((p, i) => (
                    <p key={i}>
                      <MentionText
                        text={p}
                        people={people}
                        githubRepo={mentionOpts.githubRepo}
                      />
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Attachments */}
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
                <button type="submit" class="btn btn--sm btn--secondary">
                  Upload
                </button>
              </form>
            </section>

            {/* Files */}
            {task.files && task.files.length > 0 && (
              <section class="detail-section task-detail__section">
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
            <section class="detail-section task-detail__section">
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
        <TimeEntriesSection taskId={task.id} entries={task.time_entries} />
        <ApprovalSection approval={task.approvalRequest} />
        <CommentsSection
          taskId={task.id}
          comments={task.comments}
          mentionOpts={mentionOpts}
          people={people}
        />

        {/* Edit + Delete at bottom — matches person-detail pattern */}
        <AuditMeta
          createdAt={task.createdAt}
          updatedAt={task.updatedAt}
          createdBy={task.createdBy}
          updatedBy={task.updatedBy}
        />
      </main>
      <div id="tasks-form-container" />
    </MainLayout>
  );
};
