// Sidebar — search filter, category groups, pinned favorites.
// Pin toggle via hx-post — server returns updated sidebar inner content.

import type { FC } from "hono/jsx";
import { buildNavLinks, groupByCategory } from "../../constants/mod.ts";
import type { NavLink } from "../../constants/mod.ts";

type Props = {
  activePath?: string;
  enabledFeatures?: string[];
  pinnedKeys?: string[];
  navCategories?: Record<string, string[]>;
};

const NavItem: FC<{
  link: NavLink;
  active: boolean;
  pinned: boolean;
}> = ({ link, active, pinned }) => (
  <li class="sidebar__item" data-nav-key={link.key}>
    <a
      href={link.href}
      class={`sidebar__link${active ? " sidebar__link--active" : ""}`}
    >
      <span class="sidebar__link-text">{link.label}</span>
    </a>
    <button
      type="button"
      class={`sidebar__pin-btn${pinned ? " sidebar__pin-btn--active" : ""}`}
      hx-post={`/sidebar/pin?key=${link.key}`}
      hx-target="#sidebar-content"
      hx-swap="innerHTML"
    >
      {pinned ? "unpin" : "pin"}
    </button>
  </li>
);

export const SidebarContent: FC<Props> = ({
  activePath,
  enabledFeatures = [],
  pinnedKeys = [],
  navCategories,
}) => {
  const links = buildNavLinks(enabledFeatures);
  const pinnedSet = new Set(pinnedKeys);
  const pinnedLinks = links.filter((l) => pinnedSet.has(l.key));
  const unpinnedLinks = links.filter((l) => !pinnedSet.has(l.key));
  const categories = groupByCategory(unpinnedLinks, navCategories);

  return (
    <>
      {pinnedLinks.length > 0 && (
        <div class="sidebar__pinned">
          <ul class="sidebar__links">
            {pinnedLinks.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                active={activePath === link.href}
                pinned
              />
            ))}
          </ul>
        </div>
      )}

      {categories.map((cat) => {
        const groupId = `nav-group-${
          cat.name.toLowerCase().replace(/\s+/g, "-")
        }`;
        return (
          <details key={cat.name} class="sidebar__group" id={groupId} open>
            <summary class="sidebar__group-title">{cat.name}</summary>
            <ul class="sidebar__links">
              {cat.links.map((link) => (
                <NavItem
                  key={link.href}
                  link={link}
                  active={activePath === link.href}
                  pinned={false}
                />
              ))}
            </ul>
          </details>
        );
      })}
    </>
  );
};

export const Sidebar: FC<Props> = (props) => {
  const { activePath } = props;

  return (
    <aside class="sidebar" id="app-sidebar">
      <div class="sidebar__brand">
        <a href="/" class="sidebar__brand-link">MDPlanner</a>
      </div>

      <div class="sidebar__filter">
        <input
          type="search"
          id="sidebar-filter"
          class="sidebar__filter-input"
          placeholder="Filter..."
          autocomplete="off"
        />
      </div>

      <nav
        class="sidebar__nav"
        id="sidebar-content"
        aria-label="Main navigation"
      >
        <SidebarContent {...props} />
      </nav>

      <div class="sidebar__footer">
        <a
          href="/settings"
          class={`sidebar__link${
            activePath === "/settings" ? " sidebar__link--active" : ""
          }`}
        >
          Settings
        </a>
      </div>
    </aside>
  );
};
