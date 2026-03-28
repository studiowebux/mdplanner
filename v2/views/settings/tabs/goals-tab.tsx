import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import { DEFAULT_KPI_METRICS } from "../../../constants/mod.ts";
import type { ProjectConfig } from "../../../types/project.types.ts";

type GoalsTabProps = {
  config: ProjectConfig;
};

export const GoalsTab: FC<GoalsTabProps> = ({ config }) => (
  <div class="settings-tabs__panel settings-tabs__panel--goals">
    <form
      id="kpi-metrics-form"
      hx-post="/settings/kpi-metrics"
      hx-trigger="submit"
      hx-swap="none"
    >
      <p class="settings-field__hint" style="">
        KPI metric keys available in the goal form. Falls back to defaults when
        empty.
      </p>
      <div id="kpi-metrics-list" class="settings-tag-list">
        {(config.kpiMetrics ?? DEFAULT_KPI_METRICS).map((m, i) => (
          <div key={i} class="settings-tag-row">
            <input
              type="text"
              name="kpiMetrics"
              value={m}
              class="settings-field__input"
            />
            <button
              type="button"
              class="btn btn--danger btn--sm"
              data-remove-kpi-metric
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
          data-add-kpi-metric
        >
          Add metric
        </button>
      </div>

      <FormActions />
    </form>
  </div>
);
