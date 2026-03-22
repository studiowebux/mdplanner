let _locale = "en-US";
let _currency = "USD";

/** Set locale and currency from project config. Call once after boot. */
export function setFormatConfig(
  opts: { locale?: string; currency?: string },
): void {
  if (opts.locale) _locale = opts.locale;
  if (opts.currency) _currency = opts.currency;
}

/** Get the active locale. */
export function getLocale(): string {
  return _locale;
}

/** Format a number as currency (no decimals). Returns "" for 0/undefined. */
export function formatCurrency(n: number | undefined | null): string {
  if (!n) return "";
  return n.toLocaleString(_locale, {
    style: "currency",
    currency: _currency,
    maximumFractionDigits: 0,
  });
}
