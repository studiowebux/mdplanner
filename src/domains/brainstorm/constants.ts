// Only `questions` is written to the body (the `## question` sections).
// Listing a field here excludes it from frontmatter — id/title/etc. must stay
// in frontmatter or parse() loses them on the first create/update.
export const BRAINSTORM_BODY_KEYS = ["questions"] as const;
