import type { FC } from "hono/jsx";

export const LoadingSpinner: FC = () => (
  <div class="loading-spinner" aria-label="Loading">
    <div class="loading-spinner__ring" />
  </div>
);
