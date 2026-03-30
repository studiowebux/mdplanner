let _locale = "en-US";

/** Set locale from project config. Call once after boot. */
export function setTimeLocale(locale: string): void {
  _locale = locale;
}

/**
 * Parse a date string safely. Date-only strings (YYYY-MM-DD) are parsed as
 * local midnight instead of UTC midnight to avoid timezone shift that moves
 * the displayed date back by a day in negative-UTC timezones.
 */
export function parseDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

/**
 * Format a date string for display (e.g., "2026-03-15" or "2026-03-15 10:30 PM").
 */
export function formatDate(
  dateStr: string | undefined | null,
  includeTime = false,
): string {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
  if (!includeTime) return date;
  const time = d.toLocaleTimeString(_locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

/**
 * Time until a future date (e.g., "in 5 days", "overdue by 3 days").
 */
export function dueIn(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const ms = parseDate(dateStr).getTime() - Date.now();
  const days = Math.round(ms / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1 && days < 30) return `in ${days} days`;
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return months === 1 ? "in 1 month" : `in ${months} months`;
  }
  const overdue = Math.abs(days);
  if (overdue === 1) return "overdue by 1 day";
  if (overdue < 30) return `overdue by ${overdue} days`;
  const months = Math.floor(overdue / 30);
  return months === 1 ? "overdue by 1 month" : `overdue by ${months} months`;
}

/**
 * Human-readable duration since a date (e.g., "3 days", "2 months").
 */
export function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const ms = Date.now() - parseDate(dateStr).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/**
 * Variance between planned and actual date. Positive = late, negative = early.
 * Returns e.g., "3 days early", "5 days late", "on time".
 */
export function variance(
  plannedStr: string | undefined | null,
  actualStr: string | undefined | null,
): string {
  if (!plannedStr || !actualStr) return "";
  const diffMs = parseDate(actualStr).getTime() -
    parseDate(plannedStr).getTime();
  const days = Math.round(diffMs / 86400000);
  if (days === 0) return "on time";
  const abs = Math.abs(days);
  const unit = abs === 1 ? "day" : "days";
  return days > 0 ? `${abs} ${unit} late` : `${abs} ${unit} early`;
}

/**
 * CSS class for variance text — "text-error" for late, "text-success" for early/on time.
 */
export function varianceClass(
  plannedStr: string | undefined | null,
  actualStr: string | undefined | null,
): string {
  const v = variance(plannedStr, actualStr);
  if (!v) return "";
  if (v.includes("late")) return "text-error";
  return "text-success";
}

/**
 * Duration between two dates (e.g., "completed in 14 days").
 */
export function duration(
  startStr: string | undefined | null,
  endStr: string | undefined | null,
): string {
  if (!startStr || !endStr) return "";
  const ms = parseDate(endStr).getTime() - parseDate(startStr).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "same day";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month";
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year" : `${years} years`;
}
