// No-data placeholder component.
import type { FC } from "hono/jsx";

type Props = {
  message: string;
};

/** No-data placeholder rendering a single message. */
export const EmptyState: FC<Props> = ({ message }) => (
  <div class="empty-state">
    <p class="empty-state__message">{message}</p>
  </div>
);
