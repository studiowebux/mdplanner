// Only `questions` is written to the body (the `## Questions` section).
// Listing a field here excludes it from frontmatter — id/name/etc. must stay
// in frontmatter or parse() loses them on the first create/update.
export const BRAINSTORM_TEMPLATE_BODY_KEYS = [
  "questions",
] as const;
