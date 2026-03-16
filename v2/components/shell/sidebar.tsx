import type { FC } from "hono/jsx";

type NavLink = { href: string; label: string };

// Hardcoded until settings registry task wires this from disk.
const LINKS: NavLink[] = [
  { href: "/milestones", label: "Milestones" },
];

type Props = { activePath?: string };

export const Sidebar: FC<Props> = ({ activePath }) => (
  <aside class="sidebar">
    <div class="sidebar__brand">
      <a href="/" class="sidebar__brand-link">MDPlanner</a>
    </div>
    <nav class="sidebar__nav" aria-label="Main navigation">
      <ul class="sidebar__links">
        {LINKS.map((link) => (
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
  </aside>
);
