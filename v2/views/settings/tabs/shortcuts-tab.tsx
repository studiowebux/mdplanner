import type { FC } from "hono/jsx";

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
    title: "View mode keys",
    desc: "Press leader + key to switch view mode.",
    fields: [
      { name: "modes.g", label: "Grid", defaultVal: "g" },
      { name: "modes.l", label: "Table (list)", defaultVal: "l" },
      { name: "modes.t", label: "Timeline", defaultVal: "t" },
      { name: "modes.b", label: "Board", defaultVal: "b" },
      { name: "modes.o", label: "Org chart", defaultVal: "o" },
      { name: "modes.c", label: "Card", defaultVal: "c" },
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

export const ShortcutsTab: FC = () => (
  <div class="settings-tabs__panel settings-tabs__panel--shortcuts">
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
