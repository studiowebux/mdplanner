// Shared topbar global-filter dropdown — used by BOTH the project and assignee
// filters (single source of truth; previously copy-pasted in topbar.tsx).
//
// Multi-select is PURE htmx: the dropdowns live inside one shared <form> (see
// Topbar) so the browser serializes every checked box via FormData as repeated
// keys (name=A&name=B). This avoids htmx #1541 (loose hx-include of duplicate
// names collapses to the first value). Checked state is rendered server-side
// from the active list so it survives boosted navigations without JS.
//
// global-filter.js wires the QOL extras (panel open/close, search, All/None,
// badge recount) — none of which touch serialization.

type FilterOption = { value: string; label: string };

type Props = {
  /** Stable key used across the data-* attribute contract ("projects" | "assignees"). */
  type: string;
  /** Button label. */
  label: string;
  /** Checkbox name — the form field the server reads (globalProjects | globalAssignees). */
  name: string;
  /** Selectable options. */
  options: FilterOption[];
  /** Currently-active values (checked + counted in the badge). */
  active: string[];
};

/** One topbar filter dropdown: trigger button + badge, searchable scrollable option list with All/None. */
export function GlobalFilterDropdown(
  { type, label, name, options, active }: Props,
) {
  const activeCount = active.length;
  return (
    <div class="topbar__filter-wrap">
      <button
        type="button"
        class="topbar__filter-btn"
        data-global-filter={type}
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        {label}
        <span
          data-global-filter-badge={type}
          class={`topbar__filter-badge${activeCount === 0 ? " is-hidden" : ""}`}
        >
          {activeCount}
        </span>
      </button>
      <div
        data-global-filter-panel={type}
        class="topbar__filter-panel is-hidden"
      >
        <div class="topbar__filter-search-wrap">
          {
            /* type="text" (not "search"): Safari ignores autocomplete="off" on
              type=search and shows a native history dropdown whose interaction
              closes the panel via the outside-click handler. */
          }
          <input
            type="text"
            class="topbar__filter-search form__input form__input--sm"
            data-global-filter-search={type}
            placeholder={`Search ${label.toLowerCase()}...`}
            autocomplete="off"
            aria-label={`Search ${label.toLowerCase()}`}
          />
        </div>
        <div class="topbar__filter-actions">
          <button
            type="button"
            class="topbar__filter-action"
            data-global-filter-all={type}
          >
            All
          </button>
          <button
            type="button"
            class="topbar__filter-action"
            data-global-filter-none={type}
          >
            None
          </button>
        </div>
        <div class="topbar__filter-list" data-global-filter-list={type}>
          {
            /* Checked options first (stable sort preserves intra-group order).
              Render-order only; global-filter.js keys off data-* + label text. */
          }
          {[...options].sort((a, b) =>
            Number(active.includes(b.value)) - Number(active.includes(a.value))
          ).map((opt) => (
            <label
              key={opt.value}
              data-global-filter-item={type}
              class="topbar__filter-option"
            >
              <input
                type="checkbox"
                name={name}
                value={opt.value}
                checked={active.includes(opt.value)}
              />
              <span class="topbar__filter-option-label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
