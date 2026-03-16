import type { FC } from "hono/jsx";

type Props = {
  id: string;
  title: string;
  children?: unknown;
};

// Slide-in panel from the right. Open via data-sidenav-open="<id>" on any
// trigger button. Close via data-sidenav-close inside the panel or backdrop click.
export const Sidenav: FC<Props> = ({ id, title, children }) => (
  <aside class="sidenav" id={id} aria-hidden="true">
    <div class="sidenav__backdrop" data-sidenav-close />
    <div class="sidenav__panel">
      <div class="sidenav__header">
        <h2 class="sidenav__title">{title}</h2>
        <button class="sidenav__close-btn" type="button" data-sidenav-close>
          Close
        </button>
      </div>
      <div class="sidenav__body">
        {children}
      </div>
    </div>
  </aside>
);
