import type { FC } from "hono/jsx";

type ViewsTabProps = {
  enabledList: [string, string][];
  disabledList: [string, string][];
};

export const ViewsTab: FC<ViewsTabProps> = ({ enabledList, disabledList }) => (
  <div class="settings-tabs__panel settings-tabs__panel--views">
    <div class="settings-page__search-row">
      <input
        type="search"
        id="features-search"
        class="settings-page__search"
        placeholder="Filter views..."
        autocomplete="off"
      />
      <span id="features-count" class="domain-page__count"></span>
    </div>

    <form
      id="features-form"
      hx-post="/settings/features"
      hx-trigger="change"
      hx-swap="none"
    >
      <div class="settings-page__bulk-actions">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-check-all
        >
          Check all
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-uncheck-all
        >
          Uncheck all
        </button>
      </div>

      <details id="features-enabled" class="settings-collapse" open>
        <summary class="settings-collapse__trigger">
          Enabled (<span class="settings-collapse__count">
            {enabledList.length}
          </span>)
        </summary>
        <ul class="settings-page__feature-list">
          {enabledList.map(([key, label]) => (
            <li key={key} class="settings-page__feature-item">
              <label class="settings-page__feature-label">
                <input
                  type="checkbox"
                  name="features"
                  value={key}
                  checked
                  class="settings-page__checkbox"
                />
                {label}
                <span class="settings-page__feature-key">{key}</span>
              </label>
            </li>
          ))}
        </ul>
      </details>

      <details id="features-disabled" class="settings-collapse">
        <summary class="settings-collapse__trigger">
          Disabled (<span class="settings-collapse__count">
            {disabledList.length}
          </span>)
        </summary>
        <ul class="settings-page__feature-list">
          {disabledList.map(([key, label]) => (
            <li key={key} class="settings-page__feature-item">
              <label class="settings-page__feature-label">
                <input
                  type="checkbox"
                  name="features"
                  value={key}
                  class="settings-page__checkbox"
                />
                {label}
                <span class="settings-page__feature-key">{key}</span>
              </label>
            </li>
          ))}
        </ul>
      </details>
    </form>
  </div>
);
