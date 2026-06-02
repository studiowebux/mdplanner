// Renders text with task IDs, person IDs, and commit hashes as clickable
// links/badges — JSX equivalent of renderMentions, no dangerouslySetInnerHTML.

import type { Person } from "../../types/person.types.ts";
import { resolveMentions } from "../../utils/mentions.ts";

const TASK_RE = /\b(task_[a-z0-9_]+)\b/g;
const PERSON_RE = /\b(person_[a-z0-9_]+)\b/g;
const COMMIT_RE = /(?<![0-9a-f])([0-9a-f]{7,12})(?![0-9a-f])/gi;

type Seg =
  | { kind: "text"; text: string }
  | { kind: "task"; id: string }
  | { kind: "person"; id: string; name: string }
  | { kind: "commit"; hash: string; repo: string };

function tokenize(
  text: string,
  personMap: Map<string, string>,
  githubRepo?: string,
): Seg[] {
  const hits: Array<{ start: number; end: number; seg: Seg }> = [];

  for (const m of text.matchAll(new RegExp(TASK_RE.source, "g"))) {
    hits.push({
      start: m.index!,
      end: m.index! + m[0].length,
      seg: { kind: "task", id: m[1] },
    });
  }
  for (const m of text.matchAll(new RegExp(PERSON_RE.source, "g"))) {
    hits.push({
      start: m.index!,
      end: m.index! + m[0].length,
      seg: { kind: "person", id: m[1], name: personMap.get(m[1]) ?? m[1] },
    });
  }
  if (githubRepo) {
    for (const m of text.matchAll(new RegExp(COMMIT_RE.source, "gi"))) {
      hits.push({
        start: m.index!,
        end: m.index! + m[0].length,
        seg: { kind: "commit", hash: m[1], repo: githubRepo },
      });
    }
  }

  hits.sort((a, b) => a.start - b.start);

  const segs: Seg[] = [];
  let pos = 0;
  for (const { start, end, seg } of hits) {
    if (start < pos) continue;
    if (start > pos) segs.push({ kind: "text", text: text.slice(pos, start) });
    segs.push(seg);
    pos = end;
  }
  if (pos < text.length) segs.push({ kind: "text", text: text.slice(pos) });
  return segs;
}

type Props = { text: string; people: Person[]; githubRepo?: string };

export function MentionText({ text, people, githubRepo }: Props) {
  const resolved = resolveMentions(text, people);
  const personMap = new Map(people.map((p) => [p.id, p.name]));
  const segs = tokenize(resolved, personMap, githubRepo);
  return (
    <>
      {segs.map((seg, i) => {
        if (seg.kind === "task") {
          return (
            <a key={i} href={`/tasks/${seg.id}`} class="mention mention--task">
              {seg.id}
            </a>
          );
        }
        if (seg.kind === "person") {
          return (
            <span
              key={i}
              class="mention mention--person"
              title={seg.id}
            >
              {seg.name}
            </span>
          );
        }
        if (seg.kind === "commit") {
          return (
            <a
              key={i}
              href={`https://github.com/${seg.repo}/commit/${seg.hash}`}
              class="mention mention--commit"
              target="_blank"
              rel="noopener noreferrer"
            >
              {seg.hash}
            </a>
          );
        }
        return seg.text;
      })}
    </>
  );
}
