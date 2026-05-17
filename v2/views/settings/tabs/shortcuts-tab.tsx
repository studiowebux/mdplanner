import type { FC } from "hono/jsx";
import type { NavLink } from "../../../constants/mod.ts";
import type { PersonPreferences } from "../../../types/person.types.ts";

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

const VIEW_MODES = ["grid", "table", "board", "timeline", "org", "card"];

type Props = {
  navLinks?: NavLink[];
  preferences?: PersonPreferences;
};

// Serialize filterDefaults → one "domain.key=value" per line.
function filterDefaultsToText(
  fd: Record<string, Record<string, string>> | undefined,
): string {
  if (!fd) return "";
  const lines: string[] = [];
  for (const domain of Object.keys(fd)) {
    for (const key of Object.keys(fd[domain] ?? {})) {
      const val = fd[domain][key];
      if (val) lines.push(`${domain}.${key}=${val}`);
    }
  }
  return lines.join("\n");
}

export const ShortcutsTab: FC<Props> = (
  { navLinks = [], preferences = {} },
) => {
  const viewPrefs = preferences.viewPrefs ?? {};
  const pinnedNav = new Set(preferences.pinnedNav ?? []);
  const filterText = filterDefaultsToText(preferences.filterDefaults);

  return (
    <div class="settings-tabs__panel settings-tabs__panel--shortcuts">
      {/* View defaults */}
      <section class="shortcuts-group">
        <h2 class="shortcuts-group__title">View defaults</h2>
        <p class="shortcuts-group__desc">
          Default view mode per domain. Applies when no query param or session
          state is set. Override anytime with the view toggle on the domain
          page.
        </p>
        <form
          hx-post="/settings/preferences/view-prefs"
          hx-swap="none"
          hx-target="this"
        >
          <div class="shortcuts-fields">
            {navLinks.map((link) => (
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
                  {VIEW_MODES.map((m) => (
                    <option
                      key={m}
                      value={m}
                      selected={viewPrefs[link.key] === m}
                    >
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div class="settings-page__form-actions shortcuts-form-actions">
            <button type="submit" class="btn btn--primary">
              Save view defaults
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
        <h2 class="shortcuts-group__title">Pinned nav</h2>
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
              Save pinned nav
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
        <h2 class="shortcuts-group__title">Filter defaults</h2>
        <p class="shortcuts-group__desc">
          Pre-apply filters when visiting a domain with no active filters. One
          entry per line: <code>domain.filterKey=value</code> — e.g.{" "}
          <code>tasks.section=In Progress</code>.
        </p>
        <form
          hx-post="/settings/preferences/filter-defaults"
          hx-swap="none"
          hx-target="this"
        >
          <textarea
            name="filterText"
            class="shortcuts-input filter-defaults-textarea"
            rows={6}
            placeholder="tasks.section=In Progress&#10;goals.status=active"
            autocomplete="off"
            spellcheck={false}
          >
            {filterText}
          </textarea>
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

      {/* Keyboard shortcuts */}
      <form id="shortcuts-form">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title} class="shortcuts-group">
            <h2 class="shortcuts-group__title">{group.title}</h2>
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
    </div>
  );
};
