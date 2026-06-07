// Generic domain grid card (title, badges, default actions).
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
  /** Set to "true" to add hx-swap-oob="true" for OOB morphing */
  oobSwap?: string;
};

/** Generic domain grid card: linked title with search highlight, badge/leading/subtitle slots, and default View/Edit/Delete actions (overridable via customActions). */
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
  oobSwap,
}) => (
  <article
    id={`card-${id}`}
    class={`domain-card${className ? ` ${className}` : ""}`}
    data-filterable-card
    data-id={id}
    {...(oobSwap ? { "hx-swap-oob": oobSwap } : {})}
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
      <div class="card__actions">
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
          hx-confirm={confirmMessage ??
            `Delete "${name}"? This cannot be undone.`}
          hx-swap="none"
        >
          Delete
        </button>
      </div>
    )}
  </article>
);
