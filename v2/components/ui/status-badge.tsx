import type { FC } from "hono/jsx";

export type BadgeVariant =
  | "neutral"
  | "accent"
  | "info"
  | "warning"
  | "success"
  | "error"
  | "error-solid";

type Props = {
  status: string;
  variant?: BadgeVariant;
};

/** Shared badge class string from a variant map + status value. */
export function badgeClass(
  variants: Record<string, BadgeVariant>,
  status: string,
): string {
  return `badge badge--${variants[status] ?? "neutral"}`;
}

// Reusable status badge — renders a pill colored by semantic variant.
export const StatusBadge: FC<Props> = ({ status, variant = "neutral" }) => (
  <span class={`badge badge--${variant}`}>
    {status}
  </span>
);

// Render function compatible with DataTable column definitions.
// Takes a status→variant map to resolve colors.
export const statusBadgeRenderer =
  (variants: Record<string, BadgeVariant>) => (value: unknown) => {
    const status = String(value);
    const variant = variants[status] ?? "neutral";
    return (
      <span class={`badge badge--${variant}`}>
        {status}
      </span>
    );
  };
