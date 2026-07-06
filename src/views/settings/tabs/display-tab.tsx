import type { FC } from "hono/jsx";

// Display tab — client-side display preferences (animations, font).
// State persists in localStorage, applied to <html> classes by init.js
// before first paint. JS in animations-toggle.js / font-toggle.js binds
// the checkboxes and syncs `checked` from localStorage on load.

const CLIENT_NOTE =
  "These preferences are stored in your browser — they apply to this device only, not to your account across devices.";

export const DisplayTab: FC = () => (
  <div class="settings-tabs__panel settings-tabs__panel--display">
    <section class="shortcuts-section">
      <h2 class="shortcuts-section__title">Display Preferences</h2>
      <p class="shortcuts-section__scope">{CLIENT_NOTE}</p>

      <section class="shortcuts-group">
        <h3 class="shortcuts-group__title">Animations</h3>
        <p class="shortcuts-group__desc">
          Animate view swaps and transitions. Turn off for reduced motion or
          snappier navigation.
        </p>
        <div class="shortcuts-row">
          <input
            type="checkbox"
            id="pref-animations"
            class="shortcuts-checkbox"
          />
          <label class="shortcuts-row__label" for="pref-animations">
            Enable animations
          </label>
        </div>
      </section>

      <section class="shortcuts-group">
        <h3 class="shortcuts-group__title">Font</h3>
        <p class="shortcuts-group__desc">
          Use JetBrains Mono as the interface font instead of the default Roboto
          sans-serif.
        </p>
        <div class="shortcuts-row">
          <input
            type="checkbox"
            id="pref-font-mono"
            class="shortcuts-checkbox"
          />
          <label class="shortcuts-row__label" for="pref-font-mono">
            Use monospace font
          </label>
        </div>
      </section>

      <section class="shortcuts-group">
        <h3 class="shortcuts-group__title">Columns</h3>
        <p class="shortcuts-group__desc">
          Column visibility is saved per module (Tasks, Goals, Notes, etc.) in
          this browser's local storage. Each module tracks its own visible
          columns independently. The preference does not sync across devices or
          browsers — adjust the column toggle on each list view as needed.
        </p>
      </section>
    </section>
  </div>
);
