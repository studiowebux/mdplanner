import type { FC } from "hono/jsx";
import { Sidebar } from "./sidebar.tsx";
import { Topbar } from "./topbar.tsx";
import { ConfirmDialog } from "../ui/confirm-dialog.tsx";
import { SearchDialog } from "../ui/search-dialog.tsx";
import { ShortcutsDialog } from "../ui/shortcuts-dialog.tsx";
import type { Actor } from "../../types/actor.ts";
import type { Person } from "../../types/person.types.ts";

type Props = {
  activePath?: string;
  enabledFeatures?: string[];
  pinnedKeys?: string[];
  navCategories?: Record<string, string[]>;
  actor?: Actor;
  activePerson?: Person;
  children?: unknown;
};

export const AppShell: FC<Props> = (
  {
    activePath,
    enabledFeatures = [],
    pinnedKeys = [],
    navCategories,
    actor,
    activePerson,
    children,
  },
) => (
  <div class="app-shell">
    <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true" />
    <Sidebar
      activePath={activePath}
      enabledFeatures={enabledFeatures}
      pinnedKeys={pinnedKeys}
      navCategories={navCategories}
    />
    <div class="app-shell__main">
      <Topbar actor={actor} activePerson={activePerson} />
      <div class="app-shell__content">
        {children}
      </div>
    </div>
    <ConfirmDialog />
    <SearchDialog />
    <ShortcutsDialog />
  </div>
);
