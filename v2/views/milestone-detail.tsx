import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { groupBy } from "../utils/group.ts";
import type { Milestone } from "../types/milestone.types.ts";
import type { Task } from "../types/task.types.ts";
import type { ViewProps } from "../types/app.ts";
import { toKebab } from "../utils/slug.ts";
import { BackButton } from "./components/back-button.tsx";
import { DetailActions } from "./components/detail-actions.tsx";

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
      <main class="detail-view milestone-detail">
        <BackButton href="/milestones" label="Back to milestones" />
        <header class="milestone-detail__header">
          <div class="detail-title-row milestone-detail__title-row">
            <h1 class="detail-title milestone-detail__title">
              {milestone.name}
            </h1>
            <span
              class={`badge milestone-card__badge milestone-card__badge--${milestone.status}`}
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
              class="progress-bar milestone-card__bar"
              value={milestone.progress}
              max={100}
            />
            <span class="milestone-card__stats">
              {milestone.completedCount}/{milestone.taskCount} tasks &middot;
              {" "}
              {milestone.progress}%
            </span>
          </div>
        </header>

        {milestone.descriptionHtml && (
          <div
            class="milestone-detail__description"
            dangerouslySetInnerHTML={{ __html: milestone.descriptionHtml }}
          />
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
      </main>
    </MainLayout>
  );
};
