import type { FC } from "hono/jsx";
import { APP_NAME, APP_VERSION } from "../../constants/mod.ts";
import { AppShell } from "../shell/app-shell.tsx";

// Runs before CSS loads — must stay inline to prevent FOUC.
// Kept minimal deliberately; nonce is required for CSP compliance.
const INIT_SCRIPT =
  `(function(){var d=document.documentElement;var s=localStorage.getItem("darkMode");var p=window.matchMedia("(prefers-color-scheme: dark)").matches;if(s==="true"||(s===null&&p)){d.classList.add("dark");}if(localStorage.getItem("sidebarCollapsed")==="true"){d.classList.add("sidebar-collapsed");}})();`;

type Props = {
  title?: string;
  nonce?: string;
  activePath?: string;
  styles?: string[];
  scripts?: string[];
  children?: unknown;
};

export const MainLayout: FC<Props> = ({ title, nonce, activePath, styles = [], scripts = [], children }) => {
  const pageTitle = title
    ? `${title} — ${APP_NAME}`
    : `${APP_NAME} v${APP_VERSION}`;

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <title>{pageTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }}
        />
        <link rel="stylesheet" href="/css/index.css" />
        <link rel="stylesheet" href="/css/shell.css" />
        <link rel="stylesheet" href="/css/components.css" />
        {styles.map((href) => <link key={href} rel="stylesheet" href={href} />)}
      </head>
      <body>
        <AppShell activePath={activePath}>
          {children}
        </AppShell>
        <script src="/js/sse-bus.js" />
        <script src="/js/theme-toggle.js" />
        <script src="/js/sidebar-toggle.js" />
        <script src="/js/sidenav.js" />
        <script src="/js/confirm-dialog.js" />
        {scripts.map((src) => <script key={src} src={src} />)}
      </body>
    </html>
  );
};
