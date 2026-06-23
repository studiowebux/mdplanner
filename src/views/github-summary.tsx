// GitHub summary page — dashboard of all portfolio items with githubRepo.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import type { PortfolioItem } from "../types/portfolio.types.ts";
import type { GitHubRelease, GitHubRepo } from "../types/github.types.ts";
import { GitHubCardFooter, GitHubCardStats } from "./github.tsx";

type Props = ViewProps & {
  items: PortfolioItem[];
  provider?: string;
};

export const GitHubSummaryView: FC<Props> = ({
  items,
  provider = "GitHub",
  ...viewProps
}) => (
  <MainLayout
    title={provider}
    {...viewProps}
    activePath="/github"
    styles={["/css/views/github-summary.css", "/css/views/github.css"]}
  >
    <main class="github-summary">
      <h1 class="github-summary__title">{provider} ({items.length})</h1>

      {items.length === 0
        ? (
          <p class="github-empty">
            No portfolio items have a {provider} repository configured.
          </p>
        )
        : (
          <div class="github-summary__grid">
            {items.map((item) => (
              <div
                key={item.id}
                class="github-summary__card"
                hx-get={`/github/${item.id}/card`}
                hx-trigger="load"
                hx-swap="innerHTML"
              >
                <div class="loading-spinner" aria-label="Loading">
                  <div class="loading-spinner__ring" />
                </div>
              </div>
            ))}
          </div>
        )}
    </main>
  </MainLayout>
);

/** Card fragment — loaded via htmx for each portfolio item. */
export const GitHubSummaryCard: FC<{
  item: PortfolioItem;
  repo: GitHubRepo;
  release: GitHubRelease | null;
}> = ({ item, repo, release }) => (
  <>
    <div class="github-summary__card-header">
      <a href={`/portfolio/${item.id}`} class="github-summary__card-name">
        {item.name}
      </a>
      <a
        href={repo.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="github-summary__card-repo"
      >
        {item.githubRepo}
      </a>
    </div>
    <GitHubCardStats repo={repo} />
    <GitHubCardFooter repo={repo} release={release} showLicense />
  </>
);

export const GitHubSummaryCardError: FC<
  { item: PortfolioItem; message: string }
> = ({
  item,
  message,
}) => (
  <>
    <div class="github-summary__card-header">
      <a href={`/portfolio/${item.id}`} class="github-summary__card-name">
        {item.name}
      </a>
      <span class="github-summary__card-repo">{item.githubRepo}</span>
    </div>
    <div class="github-error">
      <p>{message}</p>
    </div>
  </>
);
