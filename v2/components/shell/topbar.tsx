import type { FC } from "hono/jsx";

export const Topbar: FC = () => (
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
      <form action="/search" method="get" role="search">
        <input
          type="search"
          name="q"
          class="topbar__search-input"
          placeholder="Search tasks, notes, goals..."
          autocomplete="off"
          aria-label="Search"
        />
      </form>
    </div>
    <div class="topbar__actions">
      <button
        id="animations-toggle"
        class="topbar__action-btn"
        type="button"
        aria-label="Toggle animations"
      >
        Motion
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
    </div>
  </header>
);
