// Mention rendering — detects task IDs, person IDs, and commit hashes in
// plain text and replaces them with HTML links or styled badges.

const TASK_ID_RE = /\b(task_[a-z0-9_]+)\b/g;
const PERSON_ID_RE = /\b(person_[a-z0-9_]+)\b/g;
// 7–12 hex chars not preceded/followed by another hex char (avoids matching
// long hashes mid-string or colliding with CSS colour values).
const COMMIT_RE = /(?<![0-9a-f])([0-9a-f]{7,12})(?![0-9a-f])/gi;

export interface MentionOpts {
  /** Map of person ID → display name for resolving person mentions. */
  personMap?: Map<string, string>;
  /** GitHub repo slug (e.g. "owner/repo") for linking commit hashes. */
  githubRepo?: string;
}

/**
 * Replace task IDs, person IDs, and commit hashes in an HTML string with
 * clickable links or styled badges. Operates on already-escaped HTML — only
 * touch text nodes (content between tags).
 */
export function renderMentions(html: string, opts: MentionOpts = {}): string {
  const { personMap, githubRepo } = opts;

  // Split on HTML tags so we only process text nodes, not attribute values.
  return html
    .split(/(<[^>]+>)/)
    .map((segment) => {
      // Leave HTML tags untouched.
      if (segment.startsWith("<")) return segment;

      // task_* → link to task detail
      let out = segment.replace(
        TASK_ID_RE,
        (_match, id: string) =>
          `<a href="/tasks/${id}" class="mention mention--task">${id}</a>`,
      );

      // person_* → display name badge (falls back to raw ID)
      out = out.replace(
        PERSON_ID_RE,
        (_match, id: string) => {
          const name = personMap?.get(id) ?? id;
          return `<span class="mention mention--person" title="${id}">${name}</span>`;
        },
      );

      // Commit hashes → GitHub link (only when githubRepo is known)
      if (githubRepo) {
        out = out.replace(
          COMMIT_RE,
          (_match, hash: string) =>
            `<a href="https://github.com/${githubRepo}/commit/${hash}" class="mention mention--commit" target="_blank" rel="noopener noreferrer">${hash}</a>`,
        );
      }

      return out;
    })
    .join("");
}
