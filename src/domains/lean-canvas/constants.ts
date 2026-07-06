// Lean Canvas non-UI constants — body keys for serialization.

export const LEAN_CANVAS_BODY_KEYS = [
  // Derived from filename on parse — not stored in frontmatter
  "id",
  // 12 canvas sections — stored as ## Heading body blocks, not frontmatter
  "problem",
  "solution",
  "uniqueValueProp",
  "unfairAdvantage",
  "customerSegments",
  "existingAlternatives",
  "keyMetrics",
  "highLevelConcept",
  "channels",
  "earlyAdopters",
  "costStructure",
  "revenueStreams",
  // Computed on enrichment — not stored
  "completedSections",
  "sectionCount",
  "completionPct",
] as const;
