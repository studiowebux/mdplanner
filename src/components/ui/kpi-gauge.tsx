import type { FC } from "hono/jsx";

type Props = {
  value: number;
  target: number;
  label?: string;
};

export const KpiGauge: FC<Props> = ({ value, target, label }) => {
  const pct = target > 0
    ? Math.min(100, Math.round((value / target) * 100))
    : 0;

  return (
    <span class="kpi-gauge" data-kpi-gauge>
      <span class="kpi-gauge__track">
        <span class="kpi-gauge__fill" data-pct={pct} />
        <span class="kpi-gauge__label">
          {label ?? `${value} / ${target}`}
        </span>
      </span>
    </span>
  );
};
