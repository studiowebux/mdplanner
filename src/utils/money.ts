// Canonical money helpers: the single string ↔ number boundary for monetary
// values. Parsing is decimal-safe (never rounds); formatting delegates to the
// one currency engine (formatCurrency) so there is exactly one money format.

import { formatCurrency } from "./format.ts";

/**
 * Parse a user/string money value into a decimal number. Decimal-safe — never
 * rounds. Strips currency symbols, whitespace, and thousands separators, then
 * parses with the dot as the decimal separator (app number inputs are
 * dot-decimal). Returns `undefined` for empty or non-numeric input so callers
 * decide the fallback (0, keep-existing, etc.).
 */
export function parseMoney(
  input: string | number | null | undefined,
): number | undefined {
  if (input === null || input === undefined) return undefined;
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : undefined;
  }
  const cleaned = input.trim().replace(/[^\d.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return undefined;
  const n = Number(cleaned);
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
