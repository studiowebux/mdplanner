// Task detail view — full task display with comments, time entries,
// approval status, subtasks, blocked-by, and quick actions.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Task } from "../types/task.types.ts";
import type { Person } from "../types/person.types.ts";
import type { Milestone } from "../types/milestone.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate, timeAgo } from "../utils/time.ts";
import { getMoveSectionOrder } from "../domains/task/constants.tsx";
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
import { type MentionOpts } from "../utils/mentions.ts";
import { Sidenav } from "../components/ui/sidenav.tsx";
import { MentionText } from "./components/mention-text.tsx";
import { MarkdownJsx } from "../utils/markdown-jsx.tsx";
import { resolveLinkedItems } from "../utils/resolve-links.ts";
import {
  MetaField,
  TaskAttachmentsSection,
  TaskBlockedBySection,
  TaskMetaHeader,
  TaskQuickActions,
  TaskSubtasksSection,
} from "./components/task-detail-sections.tsx";

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
  moveSections: string[];
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
  moveSections: string[];
}> {
  const taskSvc = getTaskService();
  const peopleSvc = getPeopleService();
  const milestoneSvc = getMilestoneService();

  const [assigneePerson, milestonEntity, blockedByTasks, allPeople, allTasks] =
    await Promise.all([
      task.assignee ? peopleSvc.getById(task.assignee) : null,
      task.milestone ? milestoneSvc.getByName(task.milestone) : null,
      resolveLinkedItems(task.blocked_by, (id) => taskSvc.getById(id)),
      peopleSvc.list(),
      taskSvc.list(),
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
    moveSections: getMoveSectionOrder(allTasks),
  };
}

// ---------------------------------------------------------------------------
// Sub-components (header / quick-actions / structure live in
// ./components/task-detail-sections.tsx; activity sections below)
// ---------------------------------------------------------------------------

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

export const TimeEntriesSection: FC<{
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
              <th scope="col" class="data-table__th">Date</th>
              <th scope="col" class="data-table__th">Hours</th>
              <th scope="col" class="data-table__th">Person</th>
              <th scope="col" class="data-table__th">Description</th>
              <th scope="col" class="data-table__th" />
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} class="data-table__row">
                <td class="data-table__td">{formatDate(e.date)}</td>
                <td class="data-table__td task-detail__time-hours">
                  {e.hours}h
                </td>
                <td class="data-table__td">{e.person ?? "—"}</td>
                <td class="data-table__td">{e.description ?? "—"}</td>
                <td class="data-table__td data-table__td--actions">
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
    moveSections,
    ...rest
  },
) => {
  const sections = moveSections;
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
        <Breadcrumb
          items={[
            { label: "Tasks", href: "/tasks" },
            { label: task.title },
          ]}
        />
        <BackButton href="/tasks" label="Back to tasks" />

        <ArchivedBanner entity={task} />

        <TaskQuickActions
          task={task}
          sections={sections}
          assigneeDisplayName={assigneeDisplayName}
        />

        {/* Two-column layout: left = meta, right = description */}
        <div class="task-detail__columns">
          {/* Left column — header + metadata */}
          <div class="task-detail__col-left">
            <TaskMetaHeader
              task={task}
              milestonEntity={milestonEntity}
              assigneePerson={assigneePerson}
            />
            <TaskSubtasksSection subtasks={task.children} />
            <TaskBlockedBySection blockedByTasks={blockedByTasks} />
          </div>

          {/* Right column — description */}
          <div class="task-detail__col-right">
            {task.description && task.description.length > 0 && (
              <section class="detail-section task-detail__section">
                <h2>Description</h2>
                <div class="task-detail__description markdown-body">
                  <MarkdownJsx
                    markdown={task.description.join("\n\n")}
                    bare
                    renderText={(t) => (
                      <MentionText
                        text={t}
                        people={people}
                        githubRepo={mentionOpts.githubRepo}
                      />
                    )}
                  />
                </div>
              </section>
            )}

            <TaskAttachmentsSection task={task} />

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
