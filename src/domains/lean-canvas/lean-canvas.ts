// Lean Canvas domain enrichment — pure functions, no I/O.

import type { LeanCanvas } from "../../types/lean-canvas.types.ts";
import { LEAN_CANVAS_SECTIONS } from "../../types/lean-canvas.types.ts";

/** Compute derived fields for a single lean canvas item. */
export function enrichLeanCanvas(item: LeanCanvas): LeanCanvas {
  let completedSections = 0;
  let sectionCount = 0;

  for (const section of LEAN_CANVAS_SECTIONS) {
    const values = item[section.key as keyof LeanCanvas];
    if (Array.isArray(values) && values.length > 0) {
      completedSections++;
      sectionCount += values.length;
    }
  }

  const completionPct = Math.round((completedSections / 12) * 100);

  return { ...item, completedSections, sectionCount, completionPct };
}

/** Enrich a batch of lean canvas items. */
export function enrichLeanCanvases(items: LeanCanvas[]): LeanCanvas[] {
  return items.map(enrichLeanCanvas);
}
