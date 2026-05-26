// `id` MUST stay in frontmatter — `buildBody()` only writes a decorative
// `# Payment ${reference ?? id}` heading; listing `id` here would exclude it
// from frontmatter via `serializeStandard` and `parse()` would 404 on the
// `if (!fm.id) return null` guard. See bug note on PAYMENT_BODY_KEYS.
export const PAYMENT_BODY_KEYS = ["notes"] as const;
