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

/** Format a number as currency. Returns "" for null/undefined; renders 0 as
 *  the formatted zero (e.g. "$0.00") so totals/balance rows always show. */
export function formatCurrency(
  n: number | undefined | null,
  opts?: { decimals?: number },
): string {
  if (n === undefined || n === null) return "";
  const decimals = opts?.decimals ?? 0;
  return n.toLocaleString(_locale, {
    style: "currency",
    currency: _currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
