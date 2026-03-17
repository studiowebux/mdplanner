import type { FC } from "hono/jsx";
import { Sidebar } from "./sidebar.tsx";
import { Topbar } from "./topbar.tsx";
import { ConfirmDialog } from "../ui/confirm-dialog.tsx";
import { SearchDialog } from "../ui/search-dialog.tsx";

type Props = { activePath?: string; children?: unknown };

export const AppShell: FC<Props> = ({ activePath, children }) => (
  <div class="app-shell">
    <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true" />
    <Sidebar activePath={activePath} />
    <div class="app-shell__main">
      <Topbar />
      <div class="app-shell__content">
        {children}
      </div>
    </div>
    <ConfirmDialog />
    <SearchDialog />
  </div>
);
