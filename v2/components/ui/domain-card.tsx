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
  /** Domain name for form container targeting (e.g. "goals", "milestones") */
  domain: string;
  /** Entity ID for edit/delete routes */
  id: string;
  /** Extra CSS class on the root <article> (e.g. "milestone-card--completed") */
  className?: string;
  /** Confirm delete message */
  confirmMessage?: string;
  /** Domain-specific content between header and actions */
  children?: unknown;
};

export const DomainCard: FC<Props> = ({
  href,
  name,
  q,
  badge,
  domain,
  id,
  className,
  confirmMessage,
  children,
}) => (
  <article
    class={`domain-card${className ? ` ${className}` : ""}`}
    data-filterable-card
  >
    <header class="domain-card__header">
      <h2 class="domain-card__name">
        <a href={href}>
          <Highlight text={name} q={q} />
        </a>
      </h2>
      {badge}
    </header>

    {children}

    <div class="domain-card__actions">
      <a class="btn btn--secondary" href={href}>View</a>
      <button
        class="btn btn--secondary"
        type="button"
        hx-get={`/${domain}/${id}/edit`}
        hx-target={`#${domain}-form-container`}
        hx-swap="innerHTML"
      >
        Edit
      </button>
      <button
        class="btn btn--danger"
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
  </article>
);
