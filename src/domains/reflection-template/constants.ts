// Only `prompts` is written to the body (the `## Prompts` section). Listing a
// field here excludes it from frontmatter — id/name/etc. must stay in
// frontmatter or parse() loses them on the first create/update.
export const REFLECTION_TEMPLATE_BODY_KEYS = [
  "prompts",
] as const;
