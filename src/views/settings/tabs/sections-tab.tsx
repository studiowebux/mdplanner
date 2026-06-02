import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import { getSectionOrder } from "../../../constants/mod.ts";

export const SectionsTab: FC = () => (
  <div class="settings-tabs__panel settings-tabs__panel--sections">
    <form
      id="sections-form"
      hx-post="/settings/sections"
      hx-trigger="submit"
      hx-swap="none"
    >
      <div id="sections-list" class="settings-section-list">
        {getSectionOrder().map((s, i) => (
          <div key={i} class="settings-section-row">
            <span class="settings-section-row__position">{i + 1}</span>
            <input
              type="text"
              name="sections"
              value={s}
              class="settings-field__input"
              readonly
            />
            <div class="settings-section-row__actions">
              <button
                type="button"
                class="btn btn--secondary btn--sm"
                data-section-up
                disabled={i === 0}
              >
                &#9650;
              </button>
              <button
                type="button"
                class="btn btn--secondary btn--sm"
                data-section-down
                disabled={i === getSectionOrder().length - 1}
              >
                &#9660;
              </button>
              <button
                type="button"
                class="btn btn--danger btn--sm"
                data-section-remove
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div class="settings-section-add">
        <input
          type="text"
          id="section-new-name"
          class="settings-field__input"
          placeholder="New section name..."
        />
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-section-add
        >
          Add
        </button>
      </div>

      <FormActions />
    </form>
  </div>
);
