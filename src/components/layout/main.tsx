// MainLayout — root HTML document wrapping AppShell.
import type { FC } from "hono/jsx";
import { APP_NAME, APP_VERSION } from "../../constants/mod.ts";
import { AppShell } from "../shell/app-shell.tsx";
import type { Actor } from "../../types/actor.ts";
import type { Person } from "../../types/person.types.ts";

type Props = {
  title?: string;
  nonce?: string;
  activePath?: string;
  enabledFeatures?: string[];
  pinnedKeys?: string[];
  navCategories?: Record<string, string[]>;
  actor?: Actor;
  activePerson?: Person;
  globalProjects?: string[];
  globalAssignees?: string[];
  styles?: string[];
  scripts?: string[];
  children?: unknown;
};

/** Root HTML document: <head> (CSP nonce, page styles/scripts) wrapping AppShell + page children. */
export const MainLayout: FC<Props> = (
  {
    title,
    nonce,
    activePath,
    enabledFeatures = [],
    pinnedKeys = [],
    navCategories,
    actor,
    activePerson,
    globalProjects = [],
    globalAssignees = [],
    styles = [],
    scripts = [],
    children,
  },
) => {
  const pageTitle = title
    ? `${title} — ${APP_NAME}`
    : `${APP_NAME} v${APP_VERSION}`;

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <title>{pageTitle}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta
          name="htmx-config"
          content={JSON.stringify({
            inlineStyleNonce: nonce,
            useTemplateFragments: true,
          })}
        />
        <script src="/js/init.js" nonce={nonce} />
        <link rel="stylesheet" href="/css/index.css" />
        <link rel="stylesheet" href="/css/shell.css" />
        <link rel="stylesheet" href="/css/components.css" />
        {styles.map((href) => <link key={href} rel="stylesheet" href={href} />)}
      </head>
      <body>
        <AppShell
          activePath={activePath}
          enabledFeatures={enabledFeatures}
          pinnedKeys={pinnedKeys}
          navCategories={navCategories}
          actor={actor}
          activePerson={activePerson}
          globalProjects={globalProjects}
          globalAssignees={globalAssignees}
        >
          {children}
        </AppShell>
        <button
          id="focus-mode-exit"
          class="btn btn--secondary focus-mode-exit"
          type="button"
          aria-label="Exit focus mode"
          title="Exit focus mode (Escape)"
        >
          ✕ Exit Focus
        </button>
        <script src="/js/vendor/htmx-2.0.8.min.js" />
        <script src="/js/vendor/htmx-ext-sse-2.2.4.min.js" />
        <script src="/js/vendor/idiomorph-ext-0.3.0.min.js" />
        <script src="/js/vendor/sortablejs-1.15.6.min.js" />
        <script src="/js/sortable-init.js" />
        <script src="/js/theme-toggle.js" />
        <script src="/js/font-toggle.js" />
        <script src="/js/animations-toggle.js" />
        <script src="/js/sidebar-toggle.js" />
        <script src="/js/sidebar-nav.js" />
        <script src="/js/dirty-guard.js" />
        <script src="/js/sidenav.js" />
        <script src="/js/global-filter-core.js" />
        <script src="/js/global-filter.js" />
        <script src="/js/confirm-dialog.js" />
        <script src="/js/autocomplete.js" />
        <script src="/js/tags-input.js" />
        <script src="/js/toast.js" />
        <script src="/js/shutdown-notice.js" />
        <script src="/js/htmx-triggers.js" />
        <script src="/js/column-toggle.js" />
        <script src="/js/search-modal.js" />
        <script src="/js/preferences-loader.js" />
        <script src="/js/keybindings.js" />
        <script src="/js/shortcuts-help.js" />
        <script src="/js/table-keyboard-nav.js" />
        <script src="/js/view-mode-shortcuts.js" />
        <script src="/js/copy-btn.js" />
        <script src="/js/hash-scroll.js" />
        <script src="/js/pomodoro.js" />
        <script src="/js/topbar-overflow.js" />
        <script src="/js/focus-mode.js" />
        {scripts.map((src) => <script key={src} src={src} />)}
      </body>
    </html>
  );
};
