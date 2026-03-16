import type { FC } from "hono/jsx";

export const Topbar: FC = () => (
  <header class="topbar">
    <form class="topbar__search" action="/search" method="get" role="search">
      <input
        type="search"
        name="q"
        class="topbar__search-input"
        placeholder="Search tasks, notes, goals..."
        autocomplete="off"
        aria-label="Search"
      />
    </form>
    <div class="topbar__actions">
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
    </div>
  </header>
);
