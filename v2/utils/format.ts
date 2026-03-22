/** Format a number as USD currency (no decimals). Returns "" for 0/undefined. */
export function formatCurrency(n: number | undefined | null): string {
  if (!n) return "";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
