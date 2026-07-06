import type { FC } from "hono/jsx";

export const CachingTab: FC = () => (
  <div class="settings-tabs__panel settings-tabs__panel--caching">
    <h2 class="settings-page__heading">Caching</h2>
    <div
      id="cache-stats"
      hx-get="/settings/cache/stats"
      hx-trigger="load"
      hx-swap="innerHTML"
    >
      <span class="loading-spinner__ring" />
    </div>
    <div class="settings-cache__actions">
      <button
        class="btn btn--secondary"
        type="button"
        hx-post="/settings/cache/rebuild"
        hx-swap="none"
        data-trigger-on-success="#cache-stats"
      >
        Rebuild Cache
      </button>
      <button
        class="btn btn--secondary"
        type="button"
        hx-post="/settings/cache/rebuild-fts"
        hx-swap="none"
        data-trigger-on-success="#cache-stats"
      >
        Rebuild FTS
      </button>
    </div>
  </div>
);
