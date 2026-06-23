// Status badge pill + variant helpers.
import type { FC } from "hono/jsx";
import type { PortfolioBadge } from "../../types/portfolio.types.ts";

/** Semantic color variants for StatusBadge pills. */
export type BadgeVariant =
  | "neutral"
  | "accent"
  | "info"
  | "warning"
  | "success"
  | "error"
  | "error-solid"
  | "purple"
  | "teal"
  | "orange"
  | "pink";

type Props = {
  status: string;
  variant?: BadgeVariant;
};

/** Shared badge class string from a variant map + status value. */
export function badgeClass(
  variants: Record<string, BadgeVariant>,
  status: string,
): string {
  return `badge badge--${variants[status.toLowerCase()] ?? "neutral"}`;
}

// Reusable status badge — renders a pill colored by semantic variant.
export const StatusBadge: FC<Props> = ({ status, variant = "neutral" }) => (
  <span class={`badge badge--${variant}`}>
    {status}
  </span>
);

// External status badges (CI/CD/pipeline/git shields images). Renders each
// badge as its image, wrapped in a link when linkUrl is set. Renders nothing
// when the list is empty.
export const ExternalBadges: FC<{ badges?: PortfolioBadge[] | null }> = (
  { badges },
) => {
  if (!badges || badges.length === 0) return null;
  return (
    <span class="external-badges">
      {badges.map((b, i) => {
        const img = (
          <img
            class="external-badges__img"
            src={b.imageUrl}
            alt={b.alt ?? "status badge"}
            loading="lazy"
          />
        );
        return b.linkUrl
          ? (
            <a
              key={`${b.imageUrl}-${i}`}
              href={b.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {img}
            </a>
          )
          : <span key={`${b.imageUrl}-${i}`}>{img}</span>;
      })}
    </span>
  );
};

// Render function compatible with DataTable column definitions.
// Takes a status→variant map to resolve colors, and an optional labels map for display text.
export const statusBadgeRenderer =
  (variants: Record<string, BadgeVariant>, labels?: Record<string, string>) =>
  (value: unknown) => {
    const status = String(value);
    const variant = variants[status.toLowerCase()] ?? "neutral";
    const label = labels?.[status] ?? status;
    return (
      <span class={`badge badge--${variant}`}>
        {label}
      </span>
    );
  };
