import type { FC } from "hono/jsx";

// Global search dialog — one instance in AppShell.
// Opened by Cmd+K / Ctrl+K or clicking the topbar search input.
// As-you-type results via htmx, Enter navigates to full results page.
export const SearchDialog: FC = () => (
  <dialog class="search-dialog" id="search-dialog">
    <div class="search-dialog__content">
      <div class="search-dialog__header">
        <input
          type="search"
          id="search-dialog-input"
          class="search-dialog__input"
          placeholder="Search tasks, notes, milestones..."
          autocomplete="off"
          aria-label="Search"
          name="q"
          hx-get="/search/results"
          hx-trigger="input changed delay:200ms, search"
          hx-target="#search-dialog-results"
          hx-swap="innerHTML"
        />
        <kbd class="search-dialog__kbd">ESC</kbd>
      </div>
      <ul class="search-dialog__results" id="search-dialog-results">
        <li class="search-dialog__empty">Type to search...</li>
      </ul>
    </div>
  </dialog>
);
