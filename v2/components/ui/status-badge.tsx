import type { FC } from "hono/jsx";

type Props = {
  status: string;
  prefix?: string;
};

// Reusable status badge — renders a pill with BEM modifier based on status value.
// prefix defaults to "status-badge" for CSS class scoping per domain.
export const StatusBadge: FC<Props> = ({ status, prefix = "status-badge" }) => (
  <span class={`badge ${prefix} ${prefix}--${status}`}>
    {status}
  </span>
);

// Render function compatible with DataTable column definitions.
export const statusBadgeRenderer = (prefix?: string) => (value: unknown) => (
  <StatusBadge status={String(value)} prefix={prefix} />
);
