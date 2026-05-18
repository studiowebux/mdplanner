// Retrospective non-UI constants — body keys for serialization.
//
// Body keys are excluded from frontmatter. Only fields buildBody() actually
// writes belong here: the title (as the `# heading`) and the three sections
// (as `## ` lists). id, date, status, and participants must stay in
// frontmatter — listing them here silently dropped them on every update.
export const RETROSPECTIVE_BODY_KEYS = [
  "title",
  "continue",
  "stop",
  "start",
] as const;
