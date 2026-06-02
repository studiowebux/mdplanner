import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import type { ProjectConfig } from "../../../types/project.types.ts";

type TagsTabProps = {
  config: ProjectConfig;
};

export const TagsTab: FC<TagsTabProps> = ({ config }) => (
  <div class="settings-tabs__panel settings-tabs__panel--tags">
    <form
      id="tags-form"
      hx-post="/settings/tags"
      hx-trigger="submit"
      hx-swap="none"
    >
      <div id="tags-list" class="settings-tag-list">
        {(config.tags ?? []).map((tag, i) => (
          <div key={i} class="settings-tag-row">
            <input
              type="text"
              name="tags"
              value={tag}
              class="settings-field__input"
            />
            <button
              type="button"
              class="btn btn--danger btn--sm"
              data-remove-tag
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div class="settings-page__bulk-actions">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-add-tag
        >
          Add tag
        </button>
      </div>

      <FormActions />
    </form>
  </div>
);
