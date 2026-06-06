// Shared date-series helpers for the analytics collectors. Pure functions that
// build 0-filled time series (weekly/daily/monthly) and a date-range filter.
// Date keys are canonical UTC ISO slices (YYYY-MM-DD / YYYY-MM) — never locale
// formatting (display locale is configurable).

// Monday (UTC) of the week containing `d`, as YYYY-MM-DD.
export function weekStartKey(d: Date): string {
  const monday = new Date(d);
  const dow = (monday.getUTCDay() + 6) % 7; // 0=Mon
  monday.setUTCDate(monday.getUTCDate() - dow);
  return monday.toISOString().slice(0, 10);
}

// Build a 0-filled weekly series (oldest first) of `window` weeks ending at the
// week containing `anchorTo` (or today), reading counts from `byWeek` keyed by
// the Monday YYYY-MM-DD.
export function weeklySeries(
  byWeek: Record<string, number>,
  window: number,
  anchorTo?: string,
): Array<{ weekStart: string; count: number }> {
  const cursor = anchorTo ? new Date(anchorTo) : new Date();
  const dow = (cursor.getUTCDay() + 6) % 7;
  cursor.setUTCDate(cursor.getUTCDate() - dow); // Monday of anchor week
  const series: Array<{ weekStart: string; count: number }> = [];
  for (let i = 0; i < window; i++) {
    const key = cursor.toISOString().slice(0, 10);
    series.unshift({ weekStart: key, count: byWeek[key] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return series;
}

// Build a 0-filled daily series (oldest first) of `window` days ending at
// `anchorTo` (or today), reading counts from `byDay` keyed by YYYY-MM-DD.
export function dailySeries(
  byDay: Record<string, number>,
  window: number,
  anchorTo?: string,
): Array<{ date: string; count: number }> {
  const cursor = anchorTo ? new Date(anchorTo) : new Date();
  const series: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < window; i++) {
    const key = cursor.toISOString().slice(0, 10);
    series.unshift({ date: key, count: byDay[key] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return series;
}

// Build a 0-filled monthly series (oldest first) of `window` months ending at
// `anchorTo` (YYYY-MM-DD) or today, reading summed values from `byMonth` keyed
// by YYYY-MM. Cursor is pinned to the first of the month (UTC) to avoid
// end-of-month rollover when stepping back.
export function monthlySeries(
  byMonth: Record<string, number>,
  window: number,
  anchorTo?: string,
): Array<{ month: string; amount: number }> {
  const cursor = anchorTo ? new Date(anchorTo) : new Date();
  cursor.setUTCDate(1);
  const series: Array<{ month: string; amount: number }> = [];
  for (let i = 0; i < window; i++) {
    const month = cursor.toISOString().slice(0, 7); // YYYY-MM
    series.unshift({
      month,
      amount: Math.round((byMonth[month] ?? 0) * 100) / 100,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return series;
}

/** True when `date` falls within [from, to] (inclusive); a null/undefined date always passes. */
export function inDateRange(
  date: string | null | undefined,
  from?: string,
  to?: string,
): boolean {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
