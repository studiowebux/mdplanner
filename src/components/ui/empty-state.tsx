import type { FC } from "hono/jsx";

type Props = {
  message: string;
};

export const EmptyState: FC<Props> = ({ message }) => (
  <div class="empty-state">
    <p class="empty-state__message">{message}</p>
  </div>
);
