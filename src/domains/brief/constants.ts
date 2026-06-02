// Brief non-UI constants — body keys for serialization, RACI keys.

export const BRIEF_RACI_KEYS = new Set([
  "responsible",
  "accountable",
  "consulted",
  "informed",
]);

export const BRIEF_BODY_KEYS = [
  "id",
  "title",
  "summary",
  "mission",
  "responsible",
  "accountable",
  "consulted",
  "informed",
  "highLevelBudget",
  "highLevelTimeline",
  "culture",
  "changeCapacity",
  "guidingPrinciples",
] as const;
