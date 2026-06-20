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

  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    normalized = raw.split(thousandsSep).join("").replace(decimalSep, ".");
  } else if (lastComma >= 0) {
    const commaCount = raw.length - raw.replaceAll(",", "").length;
    const digitsAfter = raw.length - lastComma - 1;
    normalized = commaCount > 1 || (commaCount === 1 && digitsAfter === 3)
      ? raw.replaceAll(",", "")
      : raw.replaceAll(",", ".");
  } else {
    normalized = raw;
  }

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
