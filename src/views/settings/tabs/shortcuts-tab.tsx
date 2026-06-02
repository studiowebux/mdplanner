import type { FC } from "hono/jsx";
import { getDomainViewModes, type NavLink } from "../../../constants/mod.ts";
import type { PersonPreferences } from "../../../types/person.types.ts";
import { ArrayTable } from "../../../components/ui/form-builder.tsx";
import type { FieldDef } from "../../../components/ui/form-builder.tsx";

// Filter-defaults array-table field — one row per `domain.filterKey=value`
// entry. `section` keys the input names and the /forms/array-row endpoint.
export const FILTER_DEFAULTS_FIELD: Extract<
  FieldDef,
  { type: "array-table" }
> = {
  type: "array-table",
  name: "entries",
  label: "Filter default",
  section: "filterDefaults",
  itemFields: [
    { type: "text", name: "domain", label: "Domain", placeholder: "tasks" },
    {
      type: "text",
      name: "filterKey",
      label: "Filter key",
      placeholder: "section",
    },
    { type: "text", name: "value", label: "Value", placeholder: "In Progress" },
  ],
};

// Registered with the array-table row endpoint in views/mod.tsx.
export const SETTINGS_FORM_FIELDS: FieldDef[] = [FILTER_DEFAULTS_FIELD];

const SHORTCUT_GROUPS = [
  {
    title: "Chord leader",
    desc:
      "Press this key first, then a view mode key to switch views. Default: m",
    fields: [
      { name: "chordLeader", label: "Leader key", defaultVal: "m" },
    ],
  },
  {
    title: "Navigation keys",
    desc: "Vim-style row navigation in tables and task lists.",
    fields: [
      { name: "nav.down", label: "Move down", defaultVal: "j" },
      { name: "nav.up", label: "Move up", defaultVal: "k" },
      { name: "nav.top", label: "Jump to top", defaultVal: "g" },
      { name: "nav.bottom", label: "Jump to bottom", defaultVal: "G" },
      { name: "nav.select", label: "Toggle select row", defaultVal: "x" },
      { name: "nav.selectAll", label: "Select all rows", defaultVal: "a" },
    ],
  },
];

type Props = {
  navLinks?: NavLink[];
  preferences?: PersonPreferences;
};

// Flatten filterDefaults → one { domain, filterKey, value } row per entry.
function filterDefaultsToRows(
  fd: Record<string, Record<string, string>> | undefined,
): Record<string, unknown>[] {
  if (!fd) return [];
  const rows: Record<string, unknown>[] = [];
  for (const domain of Object.keys(fd)) {
    for (const filterKey of Object.keys(fd[domain] ?? {})) {
      const value = fd[domain][filterKey];
      if (value) rows.push({ domain, filterKey, value });
    }
  }
  return rows;
}

// All preferences in this tab are stored on PersonPreferences (server-side,
// per actor) and loaded in settings/routes.tsx via getPeopleService().
// The notice below makes that scope explicit to the user.
const PER_USER_NOTE =
  "These preferences are stored per user — they apply to your account only, not to other people in this project.";

export const ShortcutsTab: FC<Props> = (
  { navLinks = [], preferences = {} },
) => {
  const viewPrefs = preferences.viewPrefs ?? {};
  const pinnedNav = new Set(preferences.pinnedNav ?? []);
  const filterRows = filterDefaultsToRows(preferences.filterDefaults);

  return (
    <div class="settings-tabs__panel settings-tabs__panel--shortcuts">
      {/* ── View & UI Preferences (per-user) ─────────────────────────── */}
      <section class="shortcuts-section">
        <h2 class="shortcuts-section__title">View &amp; UI Preferences</h2>
        <p class="shortcuts-section__scope">{PER_USER_NOTE}</p>

        {/* View defaults */}
        <section class="shortcuts-group">
          <h3 class="shortcuts-group__title">Default views</h3>
          <p class="shortcuts-group__desc">
            Default view mode per domain. Applies when no query param or session
            state is set. Override anytime with the view toggle on the domain
            page. Only views the domain actually supports are listed — domains
            with a single view show no selector.
          </p>
          <form
            hx-post="/settings/preferences/view-prefs"
            hx-swap="none"
            hx-target="this"
          >
            <div class="shortcuts-fields">
              {navLinks
                .map((link) => ({ link, modes: getDomainViewModes(link.key) }))
                .filter((row) => row.modes.length > 1)
                .map(({ link, modes }) => (
                  <div key={link.key} class="shortcuts-row">
                    <label
                      class="shortcuts-row__label"
                      for={"vp-" + link.key}
                    >
                      {link.label}
                    </label>
                    <select
                      id={"vp-" + link.key}
                      name={link.key}
                      class="shortcuts-input"
                    >
                      <option value="">— default —</option>
                      {modes.map((m) => (
                        <option
                          key={m.key}
                          value={m.key}
                          selected={viewPrefs[link.key] === m.key}
                        >
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
            <div class="settings-page__form-actions shortcuts-form-actions">
              <button type="submit" class="btn btn--primary">
                Save default views
              </button>
              <button
                type="submit"
                name="_reset"
                value="1"
                class="btn btn--secondary"
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        {/* Pinned nav */}
        <section class="shortcuts-group">
          <h3 class="shortcuts-group__title">Pinned navigation</h3>
          <p class="shortcuts-group__desc">
            Pin up to 8 domains to the top of the sidebar for quick access.
          </p>
          <form
            hx-post="/settings/preferences/pinned-nav"
            hx-swap="none"
            hx-target="this"
          >
            <div class="shortcuts-fields">
              {navLinks.map((link) => (
                <div key={link.key} class="shortcuts-row">
                  <input
                    type="checkbox"
                    id={"pin-" + link.key}
                    name="pinned"
                    value={link.key}
                    class="shortcuts-checkbox"
                    checked={pinnedNav.has(link.key)}
                  />
                  <label
                    class="shortcuts-row__label"
                    for={"pin-" + link.key}
                  >
                    {link.label}
                  </label>
                </div>
              ))}
            </div>
            <div class="settings-page__form-actions shortcuts-form-actions">
              <button type="submit" class="btn btn--primary">
                Save pinned navigation
              </button>
              <button
                type="submit"
                name="_reset"
                value="1"
                class="btn btn--secondary"
              >
                Clear pins
              </button>
            </div>
          </form>
        </section>

        {/* Filter defaults */}
        <section class="shortcuts-group">
          <h3 class="shortcuts-group__title">Filter defaults</h3>
          <p class="shortcuts-group__desc">
            Pre-apply filters when visiting a domain with no active filters. One
            row per filter: <code>domain</code> + <code>filter key</code> +{" "}
            <code>value</code> — e.g. <code>tasks</code> / <code>section</code>
            {" "}
            / <code>In Progress</code>.
          </p>
          <form
            hx-post="/settings/preferences/filter-defaults"
            hx-swap="none"
            hx-target="this"
          >
            <ArrayTable
              section={FILTER_DEFAULTS_FIELD.section}
              itemFields={FILTER_DEFAULTS_FIELD.itemFields}
              rows={filterRows}
              rowsId="filter-defaults-rows"
              addLabel="Add filter default"
            />
            <div class="settings-page__form-actions shortcuts-form-actions">
              <button type="submit" class="btn btn--primary">
                Save filter defaults
              </button>
              <button
                type="submit"
                name="_reset"
                value="1"
                class="btn btn--secondary"
              >
                Clear
              </button>
            </div>
          </form>
        </section>
      </section>

      {/* ── Keyboard Shortcuts (per-user) ────────────────────────────── */}
      <section class="shortcuts-section">
        <h2 class="shortcuts-section__title">Keyboard Shortcuts</h2>
        <p class="shortcuts-section__scope">{PER_USER_NOTE}</p>

        <form id="shortcuts-form">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} class="shortcuts-group">
              <h3 class="shortcuts-group__title">{group.title}</h3>
              <p class="shortcuts-group__desc">{group.desc}</p>
              <div class="shortcuts-fields">
                {group.fields.map((f) => (
                  <div key={f.name} class="shortcuts-row">
                    <label class="shortcuts-row__label" for={"kb-" + f.name}>
                      {f.label}
                    </label>
                    <input
                      type="text"
                      id={"kb-" + f.name}
                      name={f.name}
                      maxlength={1}
                      autocomplete="off"
                      class="shortcuts-input"
                      data-default={f.defaultVal}
                      placeholder={f.defaultVal}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p id="shortcuts-conflict-msg" class="shortcuts-conflict is-hidden">
            Fix conflicting keys before saving.
          </p>

          <div class="settings-page__form-actions shortcuts-form-actions">
            <button type="submit" class="btn btn--primary">
              Save shortcuts
            </button>
            <button
              type="button"
              id="shortcuts-reset"
              class="btn btn--secondary"
            >
              Reset to defaults
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
