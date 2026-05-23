import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { groupBy } from "../utils/group.ts";
import type { Milestone } from "../types/milestone.types.ts";
import type { Task } from "../types/task.types.ts";
import type { ViewProps } from "../types/app.ts";
import { toKebab } from "../utils/slug.ts";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { MILESTONE_STATUS_VARIANTS } from "../domains/milestone/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { MarkdownJsx } from "../utils/markdown-jsx.tsx";

type Props = ViewProps & {
  milestone: Milestone;
  tasks: Task[];
};

export const MilestoneDetailView: FC<Props> = (
  { milestone, tasks, ...viewProps },
) => {
  const sections = groupBy(tasks, (t) => t.section ?? "Uncategorized");

  return (
    <MainLayout
      title={milestone.name}
      {...viewProps}
      styles={["/css/views/milestones.css"]}
    >
      <SseRefresh
        getUrl={`/milestones/${milestone.id}`}
        trigger="sse:milestone.updated"
        targetId="milestone-detail-root"
      />
      <main id="milestone-detail-root" class="detail-view milestone-detail">
        <Breadcrumb
          items={[
            { label: "Milestones", href: "/milestones" },
            { label: milestone.name },
          ]}
        />
        <BackButton href="/milestones" label="Back to milestones" />
        <header class="detail-section detail-header milestone-detail__header">
          <div class="detail-title-row milestone-detail__title-row">
            <h1 class="detail-title milestone-detail__title">
              {milestone.name}
            </h1>
            <span
              class={badgeClass(MILESTONE_STATUS_VARIANTS, milestone.status)}
            >
              {milestone.status}
            </span>
          </div>
          <DetailActions
            entity="milestones"
            id={milestone.id}
            title={milestone.name}
            formContainerId="milestones-form-container"
          />

          <div class="milestone-detail__meta">
            {milestone.project && (
              <span>
                Project:{" "}
                <a href={`/portfolio/${toKebab(milestone.project)}`}>
                  {milestone.project}
                </a>
              </span>
            )}
            {milestone.target && <span>Target: {milestone.target}</span>}
          </div>

          <div class="milestone-detail__progress">
            <progress
              class="progress-bar"
              value={milestone.progress}
              max={100}
            />
            <span class="progress-label">
              {milestone.completedCount}/{milestone.taskCount} tasks &middot;
              {" "}
              {milestone.progress}%
            </span>
          </div>
        </header>

        <MarkdownJsx
          markdown={milestone.description}
          class="milestone-detail__description"
        />

        {milestone.links && milestone.links.length > 0 && (
          <section class="detail-section milestone-detail__links">
            <h2 class="section-heading">Links</h2>
            <ul class="milestone-detail__links-list">
              {milestone.links.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    class="milestone-detail__link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section class="milestone-detail__tasks">
          <h2 class="section-heading">Tasks</h2>
          {tasks.length === 0
            ? (
              <p class="milestone-detail__empty">
                No tasks linked to this milestone.
              </p>
            )
            : (
              <div class="milestone-detail__sections">
                {Object.entries(sections).map(([section, sectionTasks]) => (
                  <div key={section} class="milestone-detail__section">
                    <h3 class="milestone-detail__section-label">
                      {section}
                      <span class="milestone-detail__section-count">
                        ({sectionTasks.length})
                      </span>
                    </h3>
                    <ul class="milestone-detail__task-list">
                      {sectionTasks.map((t) => (
                        <li key={t.id} class="milestone-detail__task-item">
                          <span
                            class={`milestone-detail__task-status${
                              t.completed
                                ? " milestone-detail__task-status--done"
                                : ""
                            }`}
                          >
                            {t.completed ? "[x]" : "[ ]"}
                          </span>
                          <span class="milestone-detail__task-title">
                            {t.title}
                          </span>
                          {t.assignee && (
                            <span class="milestone-detail__task-assignee">
                              {t.assignee}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
        </section>
        <AuditMeta
          createdAt={milestone.createdAt}
          updatedAt={milestone.updatedAt}
          createdBy={milestone.createdBy}
          updatedBy={milestone.updatedBy}
        />
      </main>

      <div id="milestones-form-container" />
    </MainLayout>
  );
};
