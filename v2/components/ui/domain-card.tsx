import type { FC } from "hono/jsx";
import { Highlight } from "../../utils/highlight.tsx";

type Props = {
  /** URL path to detail page (e.g. "/goals/goal_123") */
  href: string;
  /** Display name */
  name: string;
  /** Search query for highlighting */
  q?: string;
  /** Badge element(s) rendered in the header next to the name */
  badge?: unknown;
  /** Leading element before the name (e.g. avatar) */
  leading?: unknown;
  /** Subtitle below the name (e.g. job title) */
  subtitle?: string;
  /** Domain name for form container targeting (e.g. "goals", "milestones") */
  domain: string;
  /** Entity ID for edit/delete routes */
  id: string;
  /** Extra CSS class on the root <article> (e.g. "milestone-card--completed") */
  className?: string;
  /** Confirm delete message */
  confirmMessage?: string;
  /** Override default View/Edit/Delete actions */
  customActions?: unknown;
  /** Domain-specific content between header and actions */
  children?: unknown;
};

export const DomainCard: FC<Props> = ({
  href,
  name,
  q,
  badge,
  leading,
  subtitle,
  domain,
  id,
  className,
  confirmMessage,
  customActions,
  children,
}) => (
  <article
    class={`domain-card${className ? ` ${className}` : ""}`}
    data-filterable-card
  >
    <header class="domain-card__header">
      {leading && <div class="domain-card__leading">{leading}</div>}
      <div class="domain-card__name-group">
        <h2 class="domain-card__name">
          <a href={href}>
            <Highlight text={name} q={q} />
          </a>
        </h2>
        {subtitle && <span class="domain-card__subtitle">{subtitle}</span>}
      </div>
      {badge && <div class="domain-card__badges">{badge}</div>}
    </header>

    {children}

    {customActions ?? (
      <div class="domain-card__actions">
        <a class="btn btn--secondary btn--sm" href={href}>View</a>
        <button
          class="btn btn--secondary btn--sm"
          type="button"
          hx-get={`/${domain}/${id}/edit`}
          hx-target={`#${domain}-form-container`}
          hx-swap="innerHTML"
        >
          Edit
        </button>
        <button
          class="btn btn--danger btn--sm"
          type="button"
          hx-delete={`/${domain}/${id}`}
          hx-swap="none"
          hx-confirm-dialog={confirmMessage ??
            `Delete "${name}"? This cannot be undone.`}
          data-confirm-name={name}
        >
          Delete
        </button>
      </div>
    )}
  </article>
);
