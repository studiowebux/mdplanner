// Canonical money helpers: the single string ↔ number boundary for monetary
// values. Parsing is decimal-safe (never rounds); formatting delegates to the
// one currency engine (formatCurrency) so there is exactly one money format.

import { formatCurrency } from "./format.ts";

/**
 * Parse a user/string money value into a decimal number. Decimal-safe — never
 * rounds. Strips currency symbols and whitespace, then detects the decimal
 * separator so both dot ("125.50") and comma ("125,50") inputs parse correctly.
 * Returns `undefined` for empty or non-numeric input so callers decide the
 * fallback (0, keep-existing, etc.).
 *
 * Separator heuristic on the digit/separator string:
 * - Both `.` and `,` present → the rightmost is the decimal point, the other is
 *   the thousands separator ("1,234.56" and "1.234,56" both → 1234.56).
 * - Only `,` present → thousands when a single comma groups exactly 3 trailing
 *   digits ("1,234" → 1234) or when there are several commas ("1,234,567"),
 *   otherwise the comma is a decimal point ("125,50" → 125.5).
 * - Only `.` (or no separator) → dot is the decimal point.
 */
/**
 * Resolve the decimal separator on a digits+separator string and return a
 * canonical dot-decimal numeric string (thousands separators stripped). See
 * the parseMoney heuristic doc. Semantics are locked (note_1781968980787).
 */
function normalizeMoneyDigits(raw: string): string {
  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    return raw.split(thousandsSep).join("").replace(decimalSep, ".");
  }
  if (lastComma >= 0) {
    const commaCount = raw.length - raw.replaceAll(",", "").length;
    const digitsAfter = raw.length - lastComma - 1;
    return commaCount > 1 || (commaCount === 1 && digitsAfter === 3)
      ? raw.replaceAll(",", "")
      : raw.replaceAll(",", ".");
  }
  return raw;
}

export function parseMoney(
  input: string | number | null | undefined,
): number | undefined {
  if (input === null || input === undefined) return undefined;
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : undefined;
  }
  const negative = input.includes("-");
  const raw = input.replace(/[^\d.,]/g, "");
  if (raw === "") return undefined;

  const normalized = normalizeMoneyDigits(raw);
  if (normalized === "" || normalized === ".") return undefined;
  const n = Number(normalized) * (negative ? -1 : 1);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Format a number as money: currency-aware, always 2 decimals (the money
 * convention), no rounding loss beyond cent precision. Delegates to the
 * canonical formatCurrency engine. Returns "" for null/undefined.
 */
export function formatMoney(n: number | undefined | null): string {
  return formatCurrency(n, { decimals: 2 });
}

export type CurrencySubtotal = { currency: string; amount: number };

/**
 * Group monetary amounts by their currency code (missing/blank → `fallback`).
 * Returns subtotals sorted by code plus a `mixed` flag set when more than one
 * distinct currency is present. Callers MUST NOT render a single blended total
 * when `mixed` is true — `formatCurrency` renders every value in the one
 * configured project currency, so summing across currencies is silently wrong.
 */
export function sumByCurrency(
  items: Array<{ amount: number; currency?: string | null }>,
  fallback = "",
): { subtotals: CurrencySubtotal[]; mixed: boolean } {
  const map = new Map<string, number>();
  for (const it of items) {
    const currency = (it.currency ?? "").trim() || fallback;
    map.set(currency, (map.get(currency) ?? 0) + it.amount);
  }
  const subtotals = [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
  return { subtotals, mixed: subtotals.length > 1 };
}

/**
 * Format a per-currency subtotal. With no explicit code it falls back to the
 * project-currency formatter; with a code it shows an unambiguous `1234.00 USD`
 * (formatCurrency can't switch currency, so the code is shown explicitly).
 */
export function formatCurrencySubtotal(sub: CurrencySubtotal): string {
  if (!sub.currency) return formatMoney(sub.amount);
  return `${sub.amount.toFixed(2)} ${sub.currency}`;
}
