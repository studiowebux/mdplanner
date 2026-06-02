import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import { WEEKDAYS } from "../../../constants/mod.ts";
import type { ProjectConfig } from "../../../types/project.types.ts";

type ScheduleTabProps = {
  config: ProjectConfig;
  activeWorkingDays: Set<string>;
};

export const ScheduleTab: FC<ScheduleTabProps> = (
  { config, activeWorkingDays },
) => (
  <div class="settings-tabs__panel settings-tabs__panel--schedule">
    <form
      id="schedule-form"
      hx-post="/settings/schedule"
      hx-trigger="submit"
      hx-swap="none"
    >
      <div class="settings-field">
        <label class="settings-field__label" for="cfg-start-date">
          Project start date
        </label>
        <input
          type="date"
          id="cfg-start-date"
          name="startDate"
          value={config.startDate ?? ""}
          class="settings-field__input settings-field__input--narrow"
        />
      </div>

      <div class="settings-field">
        <label
          class="settings-field__label"
          for="cfg-working-days-per-week"
        >
          Working days per week
        </label>
        <input
          type="number"
          id="cfg-working-days-per-week"
          name="workingDaysPerWeek"
          value={config.workingDaysPerWeek ?? 5}
          min={1}
          max={7}
          class="settings-field__input settings-field__input--narrow"
        />
      </div>

      <fieldset class="settings-field settings-field--fieldset">
        <legend class="settings-field__label">Working days</legend>
        <div class="settings-page__day-grid">
          {WEEKDAYS.map((day) => (
            <label key={day} class="settings-page__day-label">
              <input
                type="checkbox"
                name="workingDays"
                value={day}
                checked={activeWorkingDays.has(day)}
                class="settings-page__checkbox"
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>

      <FormActions />
    </form>
  </div>
);
