/**
 * scripts/analyze/css.ts
 *
 * Minimal CSS rule scanner for "contextual" duplication: two selectors with the
 * SAME declaration body (`.card{padding:8px;border:1px}` vs
 * `.tile{border:1px;padding:8px}`). The line-window hasher cannot see this — it
 * compares verbatim text and never relates two different class names. Here we
 * drop the selector, normalize + sort the declarations, and fingerprint the
 * BODY, so identical styling under different names collapses together.
 *
 * Brace-balanced scan (comments stripped first, newlines preserved for line
 * numbers). At-rule containers with nested rules (`@media`) are recursed into;
 * keyframe step selectors (`0%`/`from`/`to`) are skipped to avoid animation
 * noise. No external CSS parser — these are small component stylesheets.
 */

export interface CssRule {
  rel: string;
  line: number; // 1-based line of the selector
  selector: string;
  bodyKey: string; // `${declCount}:${hash}` over normalized, sorted declarations
  declCount: number;
}

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

// Replace comment bodies with same-length whitespace so byte offsets (and thus
// line numbers) stay correct.
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

const KEYFRAME_STEP = /^(\d+%|from|to)(\s*,\s*(\d+%|from|to))*$/;

function normalizeBody(body: string): { key: string; count: number } | null {
  const decls = body
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
    .map((d) => {
      const c = d.indexOf(":");
      return c < 0
        ? d
        : `${d.slice(0, c).trim().toLowerCase()}:${d.slice(c + 1).trim()}`;
    })
    .sort();
  if (decls.length === 0) return null;
  return {
    key: `${decls.length}:${hashString(decls.join(";"))}`,
    count: decls.length,
  };
}

/**
 * Parse one stylesheet into its declaration-bearing rules. `minDecls` filters
 * out tiny rules (single-property utilities) that would match by coincidence.
 */
export function collectCssRules(
  rel: string,
  text: string,
  minDecls: number,
): CssRule[] {
  const src = stripComments(text);
  const out: CssRule[] = [];

  const scan = (segment: string, base: number): void => {
    let depth = 0;
    let selStart = 0;
    let openPos = -1;
    let openSel = "";
    for (let p = 0; p < segment.length; p++) {
      const ch = segment[p];
      if (ch === "{") {
        if (depth === 0) {
          openSel = segment.slice(selStart, p);
          openPos = p;
        }
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const body = segment.slice(openPos + 1, p);
          const selector = openSel.trim().replace(/\s+/g, " ");
          if (body.includes("{")) {
            // at-rule container (e.g. @media) — recurse into its inner rules.
            scan(body, base + openPos + 1);
          } else if (selector && !KEYFRAME_STEP.test(selector)) {
            const norm = normalizeBody(body);
            if (norm && norm.count >= minDecls) {
              const absSelStart = base + selStart;
              const line = countNewlines(src, absSelStart) + 1;
              out.push({
                rel,
                line,
                selector,
                bodyKey: norm.key,
                declCount: norm.count,
              });
            }
          }
          selStart = p + 1;
        }
      } else if (ch === ";" && depth === 0) {
        selStart = p + 1;
      }
    }
  };

  scan(src, 0);
  return out;
}

function countNewlines(s: string, end: number): number {
  let n = 0;
  for (let i = 0; i < end && i < s.length; i++) {
    if (s[i] === "\n") n++;
  }
  return n;
}
