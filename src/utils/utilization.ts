// Utilization band — single source of truth for mapping a utilization percent
// to a qualitative state. 80–100% is the healthy target; <60% underassigned,
// 60–80% ramping, >100% overallocated; null = no figure (e.g. no budget set).
// Shared by the capacity plan bandwidth bars and the analytics utilization chart.

export type UtilizationState = "none" | "under" | "warn" | "ok" | "over";

export function utilizationBand(pct: number | null): UtilizationState {
  if (pct == null) return "none";
  if (pct > 100) return "over";
  if (pct >= 80) return "ok";
  if (pct >= 60) return "warn";
  return "under";
}
