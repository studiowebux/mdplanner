/**
 * scripts/analyze/style.ts
 *
 * Style-hygiene dimension for the codebase analyzer: turns the owner's CSS/style
 * policy into concrete `path:line — rule-id — fix` findings. Sibling of
 * rules.ts (the project-rules dimension); it reuses the same CSS walker and
 * Finding shape, but answers a different question — "does this code use the
 * design system, or does it hardcode style?".
 *
 * OWNER POLICY (resolved 2026-06-25, task_1782253096020): nothing is allowed
 * except rem/em and CSS variables. Every raw px is a violation (no allowlist,
 * not even 1px borders). Every hardcoded color (hex/rgb/rgba/hsl literal)
 * outside variables.css must become a `var(--token)`. Inline `style=` and inline
 * `<script>` / `on*=` event handlers are CSP violations. variables.css is the
 * token source of truth (the one place literals live). Media-query breakpoint px
 * is a candidate — surfaced, not gated (CSS vars can't appear in @media
 * conditions, so the breakpoint px is a sanctioned-but-flagged exception).
 *
 * REPORT-ONLY: unlike rules.ts (whose "high" findings gate CI), this whole
 * dimension is CANDIDATES — it never gates until the owner promotes it. The
 * confidence tier here only drives scoring weight and the printed [HIGH]/
 * [heuristic] label, not an exit code.
 *
 * No external parser and no new deps: the shared brace-aware CSS walk from
 * rules.ts (declaration-level, comment-stripped) + regex over the TSX text.
 */

import {
  type Finding,
  type RuleFile,
  stripCssComments,
  walkCssDecls,
} from "./rules.ts";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** variables.css is the sanctioned literal store — color + dimension tokens. */
function isTokenSource(rel: string): boolean {
  return /(^|[\/\\])variables\.css$/.test(rel);
}

// Color literals the owner bans outside variables.css: hex, rgb(a), hsl(a).
// Named keywords (white/transparent/currentColor) are out of policy scope.
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

// A px length token in a declaration value (e.g. `1px`, `0.5px`, `-1px`, `44px`).
const PX_VALUE = /(?:^|[\s(,:/-])\d*\.?\d+px\b/;

// ---------------------------------------------------------------------------
// CSS rules — hardcoded color, raw px, media-breakpoint px
// ---------------------------------------------------------------------------

function ruleHardcodedColor(f: RuleFile, out: Finding[]): void {
  if (isTokenSource(f.rel)) return; // tokens are DEFINED here
  for (const d of walkCssDecls(f.text)) {
    if (d.prop.startsWith("--")) continue; // a custom property IS a token def
    if (!COLOR_LITERAL.test(d.value)) continue;
    out.push({
      file: f.rel,
      line: d.line,
      ruleId: "hardcoded-color",
      message: `hardcoded color in '${d.prop}: ${d.value}'`,
      fix:
        "Replace with a var(--color-*) token (literals live in variables.css).",
      confidence: "high",
    });
  }
}

function ruleRawPx(f: RuleFile, out: Finding[]): void {
  if (isTokenSource(f.rel)) return; // dimension tokens are DEFINED here
  for (const d of walkCssDecls(f.text)) {
    if (d.prop.startsWith("--")) continue; // custom-property definition
    // font-size px is owned by the --rules font-below-floor detector; skip here
    // to avoid double-reporting the same line under two dimensions.
    if (d.prop === "font-size") continue;
    if (!PX_VALUE.test(d.value)) continue;
    out.push({
      file: f.rel,
      line: d.line,
      ruleId: "raw-px",
      message: `raw px in '${d.prop}: ${d.value}'`,
      fix:
        "Use rem/em or a var(--*) token; raw px is not allowed (no allowlist).",
      confidence: "high",
    });
  }
}

// Heuristic: px inside an `@media (... : Npx)` condition. CSS variables cannot be
// used in media conditions, so the breakpoint px is a sanctioned-but-flagged
// exception — surfaced for review, never gated (owner suppresses per-line).
function ruleMediaBreakpointPx(f: RuleFile, out: Finding[]): void {
  if (isTokenSource(f.rel)) return;
  const css = stripCssComments(f.text);
  const lines = css.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/@media\b/.test(lines[i])) continue;
    if (!/\d+px/.test(lines[i])) continue;
    out.push({
      file: f.rel,
      line: i + 1,
      ruleId: "media-breakpoint-px",
      message: "px in an @media breakpoint condition",
      fix:
        "Candidate only — CSS vars can't be used in @media; suppress if intended.",
      confidence: "heuristic",
    });
  }
}

// ---------------------------------------------------------------------------
// TSX rules — inline style, inline script / event handler
// ---------------------------------------------------------------------------

// Inline `style=` attribute. Leading boundary (start / whitespace) avoids
// matching identifier suffixes like `borderStyle=` or `sectionStyle=`.
const INLINE_STYLE = /(^|\s)style\s*=/;

// CSS property-name tokens inside a style value (`prop:`), custom props included
// (`[\w-]+` swallows the leading `--`).
const STYLE_PROP = /([\w-]+)\s*:/g;

// Extract the `style=` attribute value starting at line `i`. Handles both the
// `style={…}` (JSX expression, may span lines + contain `${…}`) and
// `style="…"` / `'…'` / `` `…` `` quoted forms via balance/quote scanning over a
// small line window. Returns null when no value can be isolated (e.g. the
// `style=` is a fragment) — callers then fall back to flagging.
function styleAttrValue(lines: string[], i: number): string | null {
  const window = lines.slice(i, i + 8).join("\n");
  const m = window.match(/(?:^|\s)style\s*=\s*/);
  if (!m) return null;
  const open = m.index! + m[0].length;
  const ch = window[open];
  if (ch === "{") {
    let depth = 0;
    for (let k = open; k < window.length; k++) {
      if (window[k] === "{") depth++;
      else if (window[k] === "}" && --depth === 0) {
        return window.slice(open + 1, k);
      }
    }
    return window.slice(open + 1);
  }
  if (ch === '"' || ch === "'" || ch === "`") {
    for (let k = open + 1; k < window.length; k++) {
      if (window[k] === ch && window[k - 1] !== "\\") {
        return window.slice(open + 1, k);
      }
    }
  }
  return null;
}

// An inline style that sets ONLY CSS custom properties (`style={`--ratio:${r}`}`)
// is FEEDING the token system — the var is consumed by a class (the exact
// "dynamic values via a class + CSS var" mechanism this rule recommends). It is
// not a bypass, so it is exempt — parallel to ruleHardcodedColor skipping
// `--`-prefixed declarations. Indirection (`style={someVar}`) parses no props
// and stays flagged.
function isCustomPropOnlyStyle(lines: string[], i: number): boolean {
  const val = styleAttrValue(lines, i);
  if (!val) return false;
  const props = [...val.matchAll(STYLE_PROP)].map((mm) => mm[1]);
  return props.length > 0 && props.every((p) => p.startsWith("--"));
}

function ruleInlineStyle(f: RuleFile, out: Finding[]): void {
  if (f.ext !== ".tsx") return;
  const lines = f.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!INLINE_STYLE.test(lines[i])) continue;
    if (isCustomPropOnlyStyle(lines, i)) continue;
    out.push({
      file: f.rel,
      line: i + 1,
      ruleId: "inline-style",
      message: "inline style= attribute (CSP + bypasses the token system)",
      fix:
        "Move to a CSS class; dynamic values via a class + CSS var, not style=.",
      confidence: "high",
    });
  }
}

// Inline `<script>` content (no `src=`) without a CSP nonce, plus lowercase
// `on<event>="..."` string handlers. The sanctioned mechanism is an external
// `<script src nonce>` (init.js / billing-print.js); inline content + string
// handlers are CSP violations.
const SCRIPT_OPEN = /<script\b([^>]*)>/;
const EVENT_HANDLER =
  /\son(?:click|change|input|submit|keydown|keyup|keypress|focus|blur|mouseover|mouseout|mousedown|mouseup|load|error|scroll|drag\w*|drop|toggle)\s*=\s*["'`]/i;

function ruleInlineScript(f: RuleFile, out: Finding[]): void {
  if (f.ext !== ".tsx") return;
  const lines = f.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const tag = lines[i].match(SCRIPT_OPEN);
    if (tag && !/\bsrc\s*=/.test(tag[1]) && !/\bnonce\b/.test(tag[1])) {
      out.push({
        file: f.rel,
        line: i + 1,
        ruleId: "inline-script",
        message: "inline <script> block without src/nonce (CSP)",
        fix: "Move JS to static/js and load via <script src nonce={nonce}>.",
        confidence: "high",
      });
    }
    if (EVENT_HANDLER.test(lines[i])) {
      out.push({
        file: f.rel,
        line: i + 1,
        ruleId: "inline-script",
        message: "inline on*= event handler (CSP)",
        fix:
          "Use htmx (hx-*) or an addEventListener in static/js, not an inline handler.",
        confidence: "high",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/** Run every style rule over the (non-test) files and return all findings. */
export function collectStyleFindings(files: RuleFile[]): Finding[] {
  const out: Finding[] = [];
  for (const f of files) {
    if (f.isTest) continue;
    if (f.ext === ".css") {
      ruleHardcodedColor(f, out);
      ruleRawPx(f, out);
      ruleMediaBreakpointPx(f, out);
    } else if (f.ext === ".tsx") {
      ruleInlineStyle(f, out);
      ruleInlineScript(f, out);
    }
  }
  return out;
}
