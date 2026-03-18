import type { FC } from "hono/jsx";
import {
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_ROUTES,
} from "../../constants/mod.ts";

type NavLink = { href: string; label: string };

function buildNavLinks(enabledFeatures: string[]): NavLink[] {
  return enabledFeatures
    .filter((key) => ENTITY_TYPE_ROUTES[key] && ENTITY_TYPE_LABELS[key])
    .map((key) => ({
      href: ENTITY_TYPE_ROUTES[key],
      label: ENTITY_TYPE_LABELS[key],
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

type Props = {
  activePath?: string;
  enabledFeatures?: string[];
};

export const Sidebar: FC<Props> = ({ activePath, enabledFeatures = [] }) => {
  const links = buildNavLinks(enabledFeatures);

  return (
    <aside class="sidebar" id="app-sidebar">
      <div class="sidebar__brand">
        <a href="/" class="sidebar__brand-link">MDPlanner</a>
      </div>
      <nav class="sidebar__nav" aria-label="Main navigation">
        <ul class="sidebar__links">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                class={`sidebar__link${activePath === link.href ? " sidebar__link--active" : ""}`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div class="sidebar__footer">
        <a
          href="/settings"
          class={`sidebar__link${activePath === "/settings" ? " sidebar__link--active" : ""}`}
        >
          Settings
        </a>
      </div>
    </aside>
  );
};
