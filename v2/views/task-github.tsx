// Task GitHub section fragment — loaded via htmx into task detail page.

import type { FC } from "hono/jsx";
import type { Task } from "../types/task.types.ts";
import type { GitHubIssue, GitHubPR } from "../types/github.types.ts";

type Props = {
  task: Task;
  issue: GitHubIssue | null;
  pr: GitHubPR | null;
  inheritedFrom?: string | null;
  effectiveRepo?: string;
};

export const TaskGitHubSection: FC<Props> = (
  { task, issue, pr, inheritedFrom, effectiveRepo },
) => {
  const repo = effectiveRepo ?? task.githubRepo;
  return (
    <div class="task-github">
      {inheritedFrom && (
        <p class="task-github__hint">
          Repo: {repo}{" "}
          <span class="badge badge--muted">via {inheritedFrom}</span>
        </p>
      )}
      {/* Linked issue */}
      {issue
        ? (
          <div class="task-github__item">
            <div class="task-github__item-header">
              <span class={`github-badge github-badge--${issue.state}`}>
                {issue.state}
              </span>
              <a
                href={issue.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                #{issue.number} {issue.title}
              </a>
              <button
                class="btn btn--secondary btn--sm"
                type="button"
                hx-post={`/tasks/${task.id}/github/unlink-issue`}
                hx-target="#task-github-section"
                hx-swap="innerHTML"
              >
                Unlink
              </button>
            </div>
            {issue.labels.length > 0 && (
              <div class="task-github__labels">
                {issue.labels.map((l) => (
                  <span key={l} class="github-label">{l}</span>
                ))}
              </div>
            )}
          </div>
        )
        : (
          <form
            class="task-github__link-form"
            hx-post={`/tasks/${task.id}/github/link-issue`}
            hx-target="#task-github-section"
            hx-swap="innerHTML"
          >
            <input
              type="number"
              name="issueNumber"
              placeholder="Issue #"
              min={1}
              class="task-github__input"
              required
            />
            {!repo && (
              <input
                type="text"
                name="githubRepo"
                placeholder="owner/repo"
                class="task-github__input"
              />
            )}
            {repo && !task.githubRepo && (
              <input type="hidden" name="githubRepo" value={repo} />
            )}
            <button class="btn btn--secondary btn--sm" type="submit">
              Link issue
            </button>
          </form>
        )}

      {/* Linked PR */}
      {pr
        ? (
          <div class="task-github__item">
            <div class="task-github__item-header">
              <span
                class={`github-badge github-badge--${
                  pr.merged ? "merged" : pr.state
                }`}
              >
                {pr.merged ? "merged" : pr.state}
              </span>
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                #{pr.number} {pr.title}
              </a>
              <code class="github-branch">{pr.headBranch}</code>
              <button
                class="btn btn--secondary btn--sm"
                type="button"
                hx-post={`/tasks/${task.id}/github/unlink-pr`}
                hx-target="#task-github-section"
                hx-swap="innerHTML"
              >
                Unlink
              </button>
            </div>
          </div>
        )
        : (
          <form
            class="task-github__link-form"
            hx-post={`/tasks/${task.id}/github/link-pr`}
            hx-target="#task-github-section"
            hx-swap="innerHTML"
          >
            <input
              type="number"
              name="prNumber"
              placeholder="PR #"
              min={1}
              class="task-github__input"
              required
            />
            {!repo && (
              <input
                type="text"
                name="githubRepo"
                placeholder="owner/repo"
                class="task-github__input"
              />
            )}
            {repo && !task.githubRepo && (
              <input type="hidden" name="githubRepo" value={repo} />
            )}
            <button class="btn btn--secondary btn--sm" type="submit">
              Link PR
            </button>
          </form>
        )}

      {!inheritedFrom && task.githubRepo && !issue && !pr && (
        <p class="task-github__hint">
          Repo: {task.githubRepo}
        </p>
      )}
    </div>
  );
};

export const TaskGitHubError: FC<{ taskId: string; message: string }> = ({
  taskId,
  message,
}) => (
  <div class="task-github">
    <div class="github-error">
      <p>{message}</p>
    </div>
    <form
      class="task-github__link-form"
      hx-post={`/tasks/${taskId}/github/link-issue`}
      hx-target="#task-github-section"
      hx-swap="innerHTML"
    >
      <input
        type="text"
        name="githubRepo"
        placeholder="owner/repo"
        class="task-github__input"
        required
      />
      <input
        type="number"
        name="issueNumber"
        placeholder="Issue #"
        min={1}
        class="task-github__input"
        required
      />
      <button class="btn btn--secondary btn--sm" type="submit">
        Link issue
      </button>
    </form>
  </div>
);

/** No-data state — no repo or issue/PR linked. */
export const TaskGitHubEmpty: FC<{ taskId: string }> = ({ taskId }) => (
  <div class="task-github">
    <div class="task-github__link-forms">
      <form
        class="task-github__link-form"
        hx-post={`/tasks/${taskId}/github/link-issue`}
        hx-target="#task-github-section"
        hx-swap="innerHTML"
      >
        <input
          type="text"
          name="githubRepo"
          placeholder="owner/repo"
          class="task-github__input"
          required
        />
        <input
          type="number"
          name="issueNumber"
          placeholder="Issue #"
          min={1}
          class="task-github__input"
        />
        <input
          type="number"
          name="prNumber"
          placeholder="PR #"
          min={1}
          class="task-github__input"
        />
        <button class="btn btn--secondary btn--sm" type="submit">
          Link
        </button>
      </form>
    </div>
  </div>
);
