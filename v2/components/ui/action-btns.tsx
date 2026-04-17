// Shared action button renderer factory for domain table columns.
// Generates the standard View / Edit / Delete button group used by every domain.

export interface ActionBtnsOptions {
  /** Row field used in the delete confirmation message. Defaults to "title". */
  nameField?: string;
  /** CSS class for the wrapper div. Defaults to "domain-card__actions". */
  actionsClass?: string;
}

/**
 * Returns a column renderer function that renders View / Edit / Delete buttons.
 *
 * @param path           URL path prefix, e.g. "goals" → /goals/:id
 * @param formContainer  ID of the sidenav form container, e.g. "goals-form-container"
 * @param opts           Optional overrides for nameField and actionsClass
 */
export function createActionBtns(
  path: string,
  formContainer: string,
  opts: ActionBtnsOptions = {},
): (_value: unknown, row: Record<string, unknown>) => unknown {
  const nameField = opts.nameField ?? "title";
  const actionsClass = opts.actionsClass ?? "domain-card__actions";

  return (_value, row) => (
    <div class={actionsClass}>
      <a class="btn btn--secondary btn--sm" href={`/${path}/${row.id}`}>
        View
      </a>
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        hx-get={`/${path}/${row.id}/edit`}
        hx-target={`#${formContainer}`}
        hx-swap="innerHTML"
      >
        Edit
      </button>
      <button
        class="btn btn--danger btn--sm"
        type="button"
        hx-delete={`/${path}/${row.id}`}
        hx-confirm={`Delete "${row[nameField]}"? This cannot be undone.`}
        hx-swap="none"
      >
        Delete
      </button>
    </div>
  );
}
