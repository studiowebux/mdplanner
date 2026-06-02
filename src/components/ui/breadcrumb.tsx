// Shared breadcrumb navigation for detail pages.
// Renders an ordered list of crumbs separated by a CSS-generated "/".
// The final item is the current page (no link, aria-current="page").

import type { FC } from "hono/jsx";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

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
