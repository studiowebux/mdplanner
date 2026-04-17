import type { FC } from "hono/jsx";

type Props = {
  id?: string;
  children?: unknown;
};

export const CardGrid: FC<Props> = ({ id, children }) => (
  <div id={id} class="card-grid">
    {children}
  </div>
);
