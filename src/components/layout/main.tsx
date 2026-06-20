// MainLayout — root HTML document wrapping AppShell.
import type { FC } from "hono/jsx";
import { APP_NAME, APP_VERSION } from "../../constants/mod.ts";
import { asset } from "../../utils/asset.ts";
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
        <script src={asset("/js/init.js")} nonce={nonce} />
        <link rel="stylesheet" href={asset("/css/index.css")} />
        <link rel="stylesheet" href={asset("/css/shell.css")} />
        <link rel="stylesheet" href={asset("/css/components.css")} />
        {styles.map((href) => (
          <link key={href} rel="stylesheet" href={asset(href)} />
        ))}
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
        {[
          "/js/vendor/htmx-2.0.8.min.js",
          "/js/vendor/htmx-ext-sse-2.2.4.min.js",
          "/js/sse-bfcache.js",
          "/js/vendor/idiomorph-ext-0.3.0.min.js",
          "/js/vendor/sortablejs-1.15.6.min.js",
          "/js/sortable-init.js",
          "/js/theme-toggle.js",
          "/js/font-toggle.js",
          "/js/animations-toggle.js",
          "/js/sidebar-toggle.js",
          "/js/sidebar-nav.js",
          "/js/dirty-guard.js",
          "/js/sidenav.js",
          "/js/global-filter-core.js",
          "/js/global-filter.js",
          "/js/confirm-dialog.js",
          "/js/autocomplete.js",
          "/js/tags-input.js",
          "/js/toast.js",
          "/js/shutdown-notice.js",
          "/js/htmx-triggers.js",
          "/js/column-toggle.js",
          "/js/search-modal.js",
          "/js/preferences-loader.js",
          "/js/keybindings.js",
          "/js/shortcuts-help.js",
          "/js/table-keyboard-nav.js",
          "/js/view-mode-shortcuts.js",
          "/js/copy-btn.js",
          "/js/hash-scroll.js",
          "/js/pomodoro.js",
          "/js/topbar-overflow.js",
          "/js/focus-mode.js",
        ].map((src) => <script key={src} src={asset(src)} />)}
        {scripts.map((src) => <script key={src} src={asset(src)} />)}
      </body>
    </html>
  );
};
