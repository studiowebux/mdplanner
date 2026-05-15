import {
  getPeopleService,
  getPortfolioService,
} from "../../singletons/services.ts";
import type { Actor } from "../../types/actor.ts";

type Props = {
  actor?: Actor;
};

export async function Topbar({ actor }: Props) {
  const [people, portfolioItems] = await Promise.all([
    getPeopleService().list(),
    getPortfolioService().list(),
  ]);

  return (
    <header class="topbar">
      <button
        id="sidebar-toggle"
        class="topbar__action-btn topbar__sidebar-toggle"
        type="button"
        aria-label="Toggle sidebar"
        aria-expanded="true"
        aria-controls="app-sidebar"
      >
        Menu
      </button>
      <div class="topbar__search">
        <input
          type="search"
          class="topbar__search-input"
          placeholder="Search..."
          autocomplete="off"
          aria-label="Search"
          readonly
        />
        <kbd class="topbar__search-kbd">&#8984;K</kbd>
      </div>
      <button
        id="topbar-overflow-btn"
        class="topbar__action-btn topbar__overflow-btn"
        type="button"
        aria-label="More options"
        aria-expanded="false"
        aria-controls="topbar-actions"
      >
        &#8942;
      </button>
      <div id="topbar-actions" class="topbar__actions">
        {/* Identity selector — htmx form-encoded POST to view route, no json-enc */}
        <form
          hx-post="/settings/identity"
          hx-trigger="change"
          hx-swap="none"
        >
          <select
            id="identity-select"
            name="personId"
            class="topbar__identity-select"
            aria-label="Active identity"
          >
            <option value="">— Anonymous —</option>
            {people.map((p) => (
              <option
                key={p.id}
                value={p.id}
                selected={actor?.source !== "anonymous" && actor?.id === p.id}
              >
                {p.name}
              </option>
            ))}
          </select>
        </form>

        {/* Project filter */}
        {portfolioItems.length > 0 && (
          <div class="topbar__filter-wrap">
            <button
              type="button"
              class="topbar__filter-btn"
              data-global-filter="projects"
              aria-label="Filter by project"
            >
              Project
              <span
                data-global-filter-badge="projects"
                class="topbar__filter-badge is-hidden"
              >
                0
              </span>
            </button>
            <div
              data-global-filter-panel="projects"
              class="topbar__filter-panel is-hidden"
            >
              {portfolioItems.map((p) => (
                <label
                  key={p.id}
                  data-global-filter-item="projects"
                  class="topbar__filter-option"
                >
                  <input type="checkbox" value={p.name} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Assignee filter */}
        {people.length > 0 && (
          <div class="topbar__filter-wrap">
            <button
              type="button"
              class="topbar__filter-btn"
              data-global-filter="assignees"
              aria-label="Filter by assignee"
            >
              Assignee
              <span
                data-global-filter-badge="assignees"
                class="topbar__filter-badge is-hidden"
              >
                0
              </span>
            </button>
            <div
              data-global-filter-panel="assignees"
              class="topbar__filter-panel is-hidden"
            >
              {people.map((p) => (
                <label
                  key={p.id}
                  data-global-filter-item="assignees"
                  class="topbar__filter-option"
                >
                  <input type="checkbox" value={p.name} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          id="pomodoro-btn"
          class="topbar__action-btn topbar__pomodoro"
          type="button"
          aria-label="Start Pomodoro"
          title="Click to start/pause · Hold or right-click to reset"
        >
          Pomodoro
        </button>
        <button
          id="animations-toggle"
          class="topbar__action-btn"
          type="button"
          aria-label="Toggle animations"
        >
          Motion
        </button>
        <button
          id="font-toggle"
          class="topbar__action-btn"
          type="button"
          aria-label="Toggle font"
        >
          Font
        </button>
        <button
          id="theme-toggle"
          class="topbar__action-btn"
          type="button"
          aria-label="Toggle theme"
        >
          Theme
        </button>
        <a href="/settings" class="topbar__action-btn" aria-label="Settings">
          Settings
        </a>
        <button
          id="focus-mode-btn"
          class="topbar__action-btn"
          type="button"
          aria-label="Enter focus mode"
          title="Focus mode — hide sidebar and topbar"
        >
          Focus
        </button>
      </div>
    </header>
  );
}
