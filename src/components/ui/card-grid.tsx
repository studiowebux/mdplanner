// Responsive card-grid wrapper for domain grid views.
import type { FC } from "hono/jsx";

type Props = {
  id?: string;
  children?: unknown;
};

/** Responsive card-grid wrapper (.card-grid) for domain grid views. */
export const CardGrid: FC<Props> = ({ id, children }) => (
  <div id={id} class="card-grid">
    {children}
  </div>
);
