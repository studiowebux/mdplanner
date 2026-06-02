import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import { DEFAULT_MILESTONE_STATUSES } from "../../../constants/mod.ts";
import type { ProjectConfig } from "../../../types/project.types.ts";

type MilestonesTabProps = {
  config: ProjectConfig;
};

export const MilestonesTab: FC<MilestonesTabProps> = ({ config }) => (
  <div class="settings-tabs__panel settings-tabs__panel--milestones">
    <form
      id="milestone-statuses-form"
      hx-post="/settings/milestone-statuses"
      hx-trigger="submit"
      hx-swap="none"
    >
      <p class="settings-field__hint">
        Milestone status values shown in the milestone form and filters. Falls
        back to defaults when empty.
      </p>
      <div id="milestone-statuses-list" class="settings-tag-list">
        {(config.milestoneStatuses ?? DEFAULT_MILESTONE_STATUSES).map(
          (s, i) => (
            <div key={i} class="settings-tag-row">
              <input
                type="text"
                name="milestoneStatuses"
                value={s}
                class="settings-field__input"
              />
              <button
                type="button"
                class="btn btn--danger btn--sm"
                data-remove-milestone-status
              >
                Remove
              </button>
            </div>
          ),
        )}
      </div>

      <div class="settings-page__bulk-actions">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-add-milestone-status
        >
          Add status
        </button>
      </div>

      <FormActions />
    </form>
  </div>
);
