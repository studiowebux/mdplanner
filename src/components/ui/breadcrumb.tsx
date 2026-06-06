// Shared breadcrumb navigation for detail pages.
// Renders an ordered list of crumbs separated by a CSS-generated "/".
// The final item is the current page (no link, aria-current="page").

import type { FC } from "hono/jsx";

/** A single breadcrumb crumb; an href-less item renders as the current page. */
export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

/** Detail-page breadcrumb trail; the last crumb is aria-current with no link. */
export const Breadcrumb: FC<BreadcrumbProps> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <nav class="breadcrumb" aria-label="breadcrumb">
      <ol class="breadcrumb__list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} class="breadcrumb__item">
              {isLast || !item.href
                ? (
                  <span class="breadcrumb__current" aria-current="page">
                    {item.label}
                  </span>
                )
                : (
                  <a class="breadcrumb__link" href={item.href}>
                    {item.label}
                  </a>
                )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
