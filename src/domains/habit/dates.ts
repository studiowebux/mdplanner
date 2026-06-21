// Habit machine-date keys — always UTC so completion keys, the heatmap grid,
// and "today" never drift with the host process timezone. The streak helpers in
// constants.tsx already parse keys as UTC (`T00:00:00Z`); these generators match
// that. Never locale-format a machine key (see Brain Memory date-key rule).

/** Today's date key in UTC (YYYY-MM-DD). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Current-month day cells (UTC) for the habit heatmap row + header. */
export function currentMonthDays(): { date: string; day: number }[] {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mm = String(month + 1).padStart(2, "0");
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return { date: `${year}-${mm}-${String(d).padStart(2, "0")}`, day: d };
  });
}
