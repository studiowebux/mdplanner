/**
 * Format an ISO date string to local timezone (e.g., "2026-03-15 10:30 PM").
 */
export function formatDate(dateStr: string | undefined | null, includeTime = false): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
  if (!includeTime) return date;
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} ${time}`;
}

/**
 * Time until a future date (e.g., "in 5 days", "overdue by 3 days").
 */
export function dueIn(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const ms = new Date(dateStr).getTime() - Date.now();
  const days = Math.round(ms / 86400000);
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days > 1 && days < 30) return `due in ${days} days`;
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return months === 1 ? "due in 1 month" : `due in ${months} months`;
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
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month";
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year" : `${years} years`;
}

/**
 * Variance between planned and actual date. Positive = late, negative = early.
 * Returns e.g., "3 days early", "5 days late", "on time".
 */
export function variance(plannedStr: string | undefined | null, actualStr: string | undefined | null): string {
  if (!plannedStr || !actualStr) return "";
  const diffMs = new Date(actualStr).getTime() - new Date(plannedStr).getTime();
  const days = Math.round(diffMs / 86400000);
  if (days === 0) return "on time";
  const abs = Math.abs(days);
  const unit = abs === 1 ? "day" : "days";
  return days > 0 ? `${abs} ${unit} late` : `${abs} ${unit} early`;
}

/**
 * Duration between two dates (e.g., "completed in 14 days").
 */
export function duration(startStr: string | undefined | null, endStr: string | undefined | null): string {
  if (!startStr || !endStr) return "";
  const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
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
