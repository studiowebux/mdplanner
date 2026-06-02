import type { FC } from "hono/jsx";

export const IntegrityTab: FC = () => (
  <div class="settings-tabs__panel settings-tabs__panel--integrity">
    <h2 class="settings-page__heading">Data Integrity</h2>
    <p class="settings-integrity__desc">
      Scans all entities for broken references, unknown IDs, and duplicate
      records. Read-only — reports issues but does not modify data.
    </p>
    <div class="settings-integrity__actions">
      <button
        class="btn btn--secondary"
        type="button"
        hx-get="/settings/integrity/scan"
        hx-target="#integrity-results"
        hx-swap="innerHTML"
        hx-indicator="#integrity-spinner"
      >
        Run Scan
      </button>
      <span
        id="integrity-spinner"
        class="loading-spinner__ring htmx-indicator"
      />
    </div>
    <div id="integrity-results" />
  </div>
);
