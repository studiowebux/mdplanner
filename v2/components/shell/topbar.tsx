import {
  getPeopleService,
  getPortfolioService,
} from "../../singletons/services.ts";
import type { Actor } from "../../types/actor.ts";
import type { Person } from "../../types/person.types.ts";

type Props = {
  actor?: Actor;
  activePerson?: Person;
  globalProjects?: string[];
  globalAssignees?: string[];
};

export async function Topbar(
  { actor, activePerson, globalProjects = [], globalAssignees = [] }: Props,
) {
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
      <details class="topbar__person-switcher" id="topbar-person-switcher">
        <summary
          class="topbar__person-summary"
          aria-label="Switch active person"
        >
          <span class="topbar__person-avatar">
            {activePerson ? activePerson.name.charAt(0).toUpperCase() : "?"}
          </span>
          <span class="topbar__person-name">
            {activePerson?.name ?? "Guest"}
          </span>
        </summary>
        <ul class="topbar__person-list">
          <li>
            <form hx-post="/settings/identity" hx-swap="none">
              <input type="hidden" name="personId" value="" />
              <button type="submit" class="topbar__person-item">
                — Guest —
              </button>
            </form>
          </li>
          {people.map((p) => (
            <li key={p.id}>
              <form hx-post="/settings/identity" hx-swap="none">
                <input type="hidden" name="personId" value={p.id} />
                <button
                  type="submit"
                  class={`topbar__person-item${
                    activePerson?.id === p.id
                      ? " topbar__person-item--active"
                      : ""
                  }`}
                >
                  {p.name}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </details>

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
        {/* Project filter */}
        {portfolioItems.length > 0 && (
          <div
            class="topbar__filter-wrap"
            hx-post="/settings/global-filters"
            hx-trigger="change"
            hx-include="[data-global-filter-item] input"
            hx-swap="none"
          >
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
              data-active={JSON.stringify(globalProjects)}
              class="topbar__filter-panel is-hidden"
            >
              {portfolioItems.map((p) => (
                <label
                  key={p.id}
                  data-global-filter-item="projects"
                  class="topbar__filter-option"
                >
                  <input
                    type="checkbox"
                    name="globalProjects"
                    value={p.name}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Assignee filter */}
        {people.length > 0 && (
          <div
            class="topbar__filter-wrap"
            hx-post="/settings/global-filters"
            hx-trigger="change"
            hx-include="[data-global-filter-item] input"
            hx-swap="none"
          >
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
              data-active={JSON.stringify(globalAssignees)}
              class="topbar__filter-panel is-hidden"
            >
              {people.map((p) => (
                <label
                  key={p.id}
                  data-global-filter-item="assignees"
                  class="topbar__filter-option"
                >
                  <input
                    type="checkbox"
                    name="globalAssignees"
                    value={p.name}
                  />
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
