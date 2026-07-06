// Topbar — search, filters, person switcher, theme/settings actions.
import {
  getPeopleService,
  getPortfolioService,
} from "../../singletons/services.ts";
import type { Actor } from "../../types/actor.ts";
import type { Person } from "../../types/person.types.ts";
import { GlobalFilterDropdown } from "./global-filter-dropdown.tsx";

type Props = {
  actor?: Actor;
  activePerson?: Person;
  globalProjects?: string[];
  globalAssignees?: string[];
};

/** Async topbar: global search, project/assignee filters, person switcher, theme/settings actions; loads people + portfolio for the filter pickers. */
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
        {
          /* Project + assignee filters share ONE form so every change serializes
            the full state of both via FormData (repeated keys) — pure-htmx
            multi-select, avoids htmx #1541. */
        }
        {(portfolioItems.length > 0 || people.length > 0) && (
          <form
            class="topbar__filters"
            hx-post="/settings/global-filters"
            hx-trigger="change"
            hx-swap="none"
            hx-sync="this:replace"
          >
            {portfolioItems.length > 0 && (
              <GlobalFilterDropdown
                type="projects"
                label="Project"
                name="globalProjects"
                options={portfolioItems.map((p) => ({
                  value: p.name,
                  label: p.name,
                }))}
                active={globalProjects}
              />
            )}
            {people.length > 0 && (
              <GlobalFilterDropdown
                type="assignees"
                label="Assignee"
                name="globalAssignees"
                options={people.map((p) => ({ value: p.name, label: p.name }))}
                active={globalAssignees}
              />
            )}
          </form>
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
