/**
 * scripts/analyze/rules.ts
 *
 * Project-rules dimension for the codebase analyzer: turns the documented
 * footguns (local-dev.md `## Brain Memory`, plus the [constraint]/[decision]/
 * [bug] notes) into concrete `path:line — rule-id — fix` findings. The other
 * analyzer dimensions score *shape* (size, complexity, duplication); this one
 * scores *correctness against house rules* — the things a reviewer would catch
 * but a grade never surfaces.
 *
 * Two confidence tiers (mirrors the Complexity/Dead-Code "CANDIDATES" split):
 *   - "high"      — deterministic, near-zero false positives. Validated to be
 *                   green on the current clean `src/`; SHOULD gate CI.
 *   - "heuristic" — best-effort text signals that need a human to confirm.
 *                   NEVER gate on these (real plain-text fields, dynamic
 *                   classes, and layout-semantic bugs are not statically
 *                   certain).
 *
 * No external parser and no new deps: regex + a tiny brace-aware CSS walk over
 * the FileInfo[] the analyzer already collected (which includes `.css`).
 */

export type RuleConfidence = "high" | "heuristic";

export interface Finding {
  file: string;
  line: number;
  ruleId: string;
  message: string;
  fix: string;
  confidence: RuleConfidence;
}

/** Subset of the analyzer's FileInfo this pass needs. */
export interface RuleFile {
  rel: string;
  ext: string;
  text: string;
  isTest: boolean;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Strip CSS comments, preserving newlines so line numbers stay correct. */
export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/** 1-based line number of a byte offset. */
export function lineAt(text: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// CSS rule walk — yields each declaration with its selector + media context
// ---------------------------------------------------------------------------
export interface CssDecl {
  prop: string;
  value: string;
  line: number;
  selector: string; // nearest rule selector (normalized, lowercased)
  inPrint: boolean; // true when inside an `@media print` block
}

/**
 * Brace-aware walk that emits every declaration alongside the selector it lives
 * under and whether it sits inside an `@media print` container. Good enough for
 * the small component stylesheets here; not a spec-complete CSS parser.
 */
export function walkCssDecls(text: string): CssDecl[] {
  const css = stripCssComments(text);
  const out: CssDecl[] = [];
  // Stack of { selector, isPrint } frames as we descend into nested blocks.
  const stack: Array<{ selector: string; isPrint: boolean }> = [];
  let selStart = 0;

  const emitDecls = (body: string, bodyStart: number, sel: string): void => {
    const inPrint = stack.some((f) => f.isPrint);
    let pos = 0;
    for (const part of body.split(";")) {
      const seg = part;
      const colon = seg.indexOf(":");
      if (colon >= 0) {
        const prop = seg.slice(0, colon).trim().toLowerCase();
        const value = seg.slice(colon + 1).trim();
        if (prop && value && !prop.startsWith("@") && !prop.includes("{")) {
          // Offset of the property within the original text.
          const offset = bodyStart + pos +
            (seg.length - seg.trimStart().length);
          out.push({
            prop,
            value,
            line: lineAt(css, offset),
            selector: sel,
            inPrint,
          });
        }
      }
      pos += part.length + 1; // +1 for the consumed ";"
    }
  };

  for (let p = 0; p < css.length; p++) {
    const ch = css[p];
    if (ch === "{") {
      const rawSel = css.slice(selStart, p).trim().replace(/\s+/g, " ");
      const sel = rawSel.toLowerCase();
      const isAtRule = sel.startsWith("@");
      stack.push({
        selector: isAtRule ? (stack.at(-1)?.selector ?? "") : sel,
        isPrint: (stack.at(-1)?.isPrint ?? false) ||
          (sel.startsWith("@media") && sel.includes("print")),
      });
      // Find the matching close brace to know if this block has nested rules.
      // We only emit declarations for the *innermost* blocks; nested at-rules
      // are handled by continuing the scan (their inner rules push their own
      // frame). Detect "leaf" by scanning ahead for the next brace.
      const nextOpen = css.indexOf("{", p + 1);
      const nextClose = css.indexOf("}", p + 1);
      if (nextClose !== -1 && (nextOpen === -1 || nextClose < nextOpen)) {
        // Leaf rule: body is css[p+1 .. nextClose].
        const frame = stack.at(-1)!;
        if (!isAtRule) {
          emitDecls(css.slice(p + 1, nextClose), p + 1, frame.selector);
        }
      }
      selStart = p + 1;
    } else if (ch === "}") {
      stack.pop();
      selStart = p + 1;
    } else if (ch === ";" && stack.length === 0) {
      selStart = p + 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CSS rules
// ---------------------------------------------------------------------------

/** Parse a font-size literal to px (rem assumed 16px). Returns null if dynamic. */
function fontSizePx(value: string): number | null {
  const v = value.trim();
  let m = v.match(/^(\d*\.?\d+)px$/);
  if (m) return parseFloat(m[1]);
  m = v.match(/^(\d*\.?\d+)rem$/);
  if (m) return parseFloat(m[1]) * 16;
  return null; // var(), em, %, calc(), keywords — not statically below-floor
}

// Properties that legitimately carry a theme-specific value in a `.dark{}` /
// `:root:not(.dark)` block (the COLOR surface). Anything else in those blocks is
// a layout dimension that drops in the opposite theme — the documented leak.
const COLOR_PROP =
  /(color|background|box-shadow|fill|stroke|outline|border|opacity|filter|backdrop-filter|color-scheme|gradient)/;

function ruleFontBelowFloor(f: RuleFile, out: Finding[]): void {
  for (const d of walkCssDecls(f.text)) {
    if (d.prop !== "font-size") continue;
    if (d.inPrint || /print/.test(d.selector)) continue; // print ≠ screen floor
    const px = fontSizePx(d.value);
    if (px !== null && px < 12) {
      out.push({
        file: f.rel,
        line: d.line,
        ruleId: "font-below-floor",
        message: `font-size ${d.value} (~${px}px) is below the 12px floor`,
        fix: "Raise to ≥12px / ≥0.75rem (decision: min font 12px).",
        confidence: "high",
      });
    }
  }
}

function ruleThemeSplitLeak(f: RuleFile, out: Finding[]): void {
  for (const d of walkCssDecls(f.text)) {
    const sel = d.selector;
    const isThemeBlock = /(^|[\s,])\.dark\b/.test(sel) ||
      /:root:not\(\.dark\)/.test(sel);
    if (!isThemeBlock) continue;
    if (COLOR_PROP.test(d.prop)) continue;
    if (d.prop === "content" || d.prop.startsWith("--")) continue; // tokens/pseudo
    out.push({
      file: f.rel,
      line: d.line,
      ruleId: "theme-split-leak",
      message:
        `non-color property '${d.prop}' inside theme block '${d.selector}'`,
      fix:
        "Move layout dims to base :root; keep only color tokens in .dark / :root:not(.dark).",
      confidence: "high",
    });
  }
}

// ---------------------------------------------------------------------------
// TSX / JS rules
// ---------------------------------------------------------------------------

// Client-executed files where fetch() is a sanctioned exception (canvas / DnD /
// editor / @mention / [[wiki-link]] autocomplete) — constraint note_1780201572946.
// Vendor is always exempt.
const FETCH_ALLOW =
  /static[\/\\]js[\/\\](vendor[\/\\]|.*(canvas|mindmap|note-editor|mention|wikilink))/;

function ruleFetchInClient(f: RuleFile, out: Finding[]): void {
  // Only CLIENT code is constrained: server .tsx routes render server-side, so
  // fetch() there is a normal outbound call. Scope to static/js.
  if (!/static[\/\\]js[\/\\]/.test(f.rel)) return;
  if (FETCH_ALLOW.test(f.rel)) return;
  const lines = f.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/\bfetch\s*\(/.test(lines[i])) {
      out.push({
        file: f.rel,
        line: i + 1,
        ruleId: "fetch-in-client",
        message:
          "fetch() in client JS outside the sanctioned canvas/editor set",
        fix:
          "Use htmx for mutations (hx-* + hx-include); fetch is reserved for canvas/@mention/note-editor.",
        confidence: "high",
      });
    }
  }
}

function ruleCspHxValsJs(f: RuleFile, out: Finding[]): void {
  if (f.ext !== ".tsx" && f.ext !== ".ts") return;
  const lines = f.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/hx-vals\s*=\s*["'`]\s*js:/.test(lines[i])) {
      out.push({
        file: f.rel,
        line: i + 1,
        ruleId: "csp-hx-vals-js",
        message: "hx-vals='js:' is blocked by CSP (no inline JS evaluation)",
        fix: "Pass dynamic values via name/value inputs + hx-include instead.",
        confidence: "high",
      });
    }
  }
}

// Heuristic: a markdown-bearing field (.description / .body) rendered as a raw
// JSX expression instead of through MarkdownJsx / MarkdownSection. Many such
// fields are intentionally plain text, so this NEVER gates — confirm by reading.
function ruleRawMarkdownRender(f: RuleFile, out: Finding[]): void {
  if (f.ext !== ".tsx") return;
  if (/print/.test(f.rel)) return; // print views render their own escaped html
  const lines = f.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\{[a-zA-Z_][\w.]*\.(description|body)\}/);
    if (!m) continue;
    out.push({
      file: f.rel,
      line: i + 1,
      ruleId: "raw-markdown-render",
      message: `raw ${m[0]} rendered without MarkdownJsx/MarkdownSection`,
      fix:
        "If the field accepts markdown, render via MarkdownSection; if plain text, ignore.",
      confidence: "heuristic",
    });
  }
}

// Heuristic: hx-params / hx-include / hx-vals on a CONTAINER element — these
// inherit to descendant controls and can silently drop fields (bug d13c000a).
function ruleHtmxAttrInheritance(f: RuleFile, out: Finding[]): void {
  if (f.ext !== ".tsx") return;
  const lines = f.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const tag = lines[i].match(
      /<(div|form|section|table|tbody|ul)\b[^>]*\bhx-(params|include|vals)\b/,
    );
    if (tag) {
      out.push({
        file: f.rel,
        line: i + 1,
        ruleId: "htmx-attr-inheritance",
        message: `hx-${tag[2]} on a <${
          tag[1]
        }> container inherits to descendant controls`,
        fix:
          "Confirm intended; if not, move the attr onto the specific control (inheritance dropped a POST field in d13c000a).",
        confidence: "heuristic",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// undefined-class — a static class token used in TSX that no .css selector
// defines (catches the `.input` footgun). Cross-file: needs the full CSS
// selector set first, so it runs in the driver, not per-file.
//
// HEURISTIC, not gating: a real codebase has many intentionally-unstyled
// classes — JS selector hooks (confirm-dialog__cancel), semantic anchors, and
// BEM modifiers that only tweak a base class. Validated at 205 hits on the
// clean tree, so this reports CANDIDATES for review and never fails CI.
// ---------------------------------------------------------------------------

// Utility/vendor/3rd-party prefixes whose classes are not defined in our CSS.
const CLASS_ALLOW =
  /^(htmx-|sortable-|sortable$|ghost$|chosen|drag|sse-|fa-|fas$|far$|icon-|markdown-)/;

/** Collect every class name that appears in a selector across all CSS files. */
function collectDefinedClasses(files: RuleFile[]): Set<string> {
  const defined = new Set<string>();
  for (const f of files) {
    if (f.ext !== ".css" || f.isTest) continue;
    const css = stripCssComments(f.text);
    for (const m of css.matchAll(/\.([a-zA-Z_][\w-]*)/g)) defined.add(m[1]);
  }
  return defined;
}

function ruleUndefinedClass(
  f: RuleFile,
  defined: Set<string>,
  out: Finding[],
): void {
  if (f.ext !== ".tsx") return;
  const lines = f.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    // Only fully-STATIC class lists: a quoted literal with no template
    // expression. Dynamic `class={`...${x}`}` is skipped (can't resolve).
    for (const attr of lines[i].matchAll(/class=("([^"]*)"|'([^']*)')/g)) {
      const value = attr[2] ?? attr[3] ?? "";
      if (value.includes("${") || value.includes("{")) continue;
      for (const tok of value.split(/\s+/)) {
        if (!tok || tok.includes(":")) continue; // skip pseudo / namespaced
        if (CLASS_ALLOW.test(tok)) continue;
        if (!defined.has(tok)) {
          out.push({
            file: f.rel,
            line: i + 1,
            ruleId: "undefined-class",
            message: `class "${tok}" is used but defined in no .css selector`,
            fix:
              "Add the rule, fix the typo, or ignore if it's a JS hook / base-class BEM modifier.",
            confidence: "heuristic",
          });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/** Run every rule over the (non-test) files and return all findings. */
export function collectRuleFindings(files: RuleFile[]): Finding[] {
  const out: Finding[] = [];
  const defined = collectDefinedClasses(files);
  for (const f of files) {
    if (f.isTest) continue;
    if (f.ext === ".css") {
      ruleFontBelowFloor(f, out);
      ruleThemeSplitLeak(f, out);
    } else if (f.ext === ".tsx" || f.ext === ".ts" || f.ext === ".js") {
      ruleFetchInClient(f, out);
      ruleCspHxValsJs(f, out);
      ruleRawMarkdownRender(f, out);
      ruleHtmxAttrInheritance(f, out);
      ruleUndefinedClass(f, defined, out);
    }
  }
  return out;
}
