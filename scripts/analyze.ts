#!/usr/bin/env -S deno run --allow-read --allow-run
/**
 * scripts/analyze.ts
 *
 * Reusable, READ-ONLY codebase quality analyzer + rating. The "tooling before
 * AI" pass: a repeatable, deterministic static-analysis sweep that grades the
 * codebase across classic quality dimensions and emits actionable
 * recommendations. Replaces the ad-hoc manual grep "violation sweeps" with one
 * re-runnable tool (CI gate + pre-release check).
 *
 * Dimensions (each scored 0-100 → letter grade):
 *   1. Structure   — LOC, file count, god-files over a size threshold.
 *   2. Type Safety — any / as any / as unknown as / non-null `!.` /
 *                    @ts-ignore / deno-lint-ignore density per KLOC.
 *   3. Debt        — TODO/FIXME/HACK/XXX markers, console.* bypassing the log
 *                    singleton, empty `catch {}` swallows.
 *   4. Complexity  — cyclomatic (decision-point) count per function via a real
 *                    TypeScript AST walk (counts each real function, including
 *                    those nested inside classic-script IIFEs).
 *   5. Duplication — three layers: line-window hashing (verbatim copy-paste),
 *                    AST structural fingerprints (renamed/reordered clones via
 *                    node-kinds-only hashing), and CSS declaration-body hashing
 *                    (same styles under a different selector).
 *   6. Testing     — test-file count + test:source ratio.
 *   7. Docs        — public-API exports preceded by a doc comment (scoped to
 *                    CONFIG.docApiDirs); file headers.
 *   8. Lint/Format — (--deep only) deno lint --json + deno fmt --check counts.
 *   9. Dead Code   — (--dead only) exported symbols with no cross-file
 *                    reference (unused exports / un-migrated leftovers), via
 *                    in-process TypeScript findReferences.
 *
 * The overall grade is a weighted blend of the available dimensions.
 *
 * LIMITATION (be honest): docs is a regex heuristic, not a type-aware walk.
 * Duplication's line-window pass misses renamed clones, but the AST structural
 * pass catches those (kinds-only — may over-match different logic of identical
 * shape; confirm hotspots by reading). Complexity is a real per-function AST
 * decision count. The structural/CSS passes approximate; they do not certify.
 * Generated/minified files are excluded (vendor/, *.min.*). Lint/Format are
 * only computed with --deep (subprocess).
 *
 * Usage:
 *   deno run --allow-read scripts/analyze.ts [root]
 *   deno run --allow-read --allow-run scripts/analyze.ts --deep [root]
 *   deno run --allow-read --allow-run --allow-write scripts/analyze.ts \
 *     --deep --json report.json [root]
 *
 * Flags:
 *   --deep            also run deno lint + fmt --check (subprocess). Needs --allow-run.
 *   --dead            cross-file unused-export detection (TS findReferences). Needs --allow-env.
 *   --json <path>     write the full machine-readable report (needs --allow-write).
 *   --min-score <n>   exit non-zero if the overall score is below n (default 0).
 *   root              directory to analyze (default ./src). A sibling tests/
 *                     dir is auto-included for the Testing dimension only.
 */

import { dirname, join } from "@std/path";
import { collectComplexity, collectStructuralClones } from "./analyze/ast.ts";
import { collectCssRules, type CssRule } from "./analyze/css.ts";
// Type-only: erased at compile, so the fast default run loads no typescript via
// this path. The runtime module is dynamically imported only under --dead.
import type { DeadExport } from "./analyze/deadcode.ts";

// ---------------------------------------------------------------------------
// Tunables — thresholds that define "good". Adjust per project, not per run.
// ---------------------------------------------------------------------------
const CONFIG = {
  godFileLoc: 600, // a single source file over this many lines is a god-file
  maxCyclomatic: 15, // McCabe-ish decision-point count over which a fn is flagged
  typeEscapePer1k: 2, // tolerated type-escape hatches per 1000 source lines
  minTestRatio: 0.25, // tests-LOC : source-LOC target ratio
  dupWindow: 6, // consecutive meaningful lines that constitute a clone
  maxDupPct: 5, // tolerated % of meaningful lines inside a clone
  minCloneNodes: 40, // min AST node count for a fn to be a structural-clone candidate
  minCssDecls: 3, // min declarations for a CSS rule to be a duplicate-body candidate
  // Documentation is measured over the PUBLIC-API surface only — the reusable
  // library layers where a doc comment earns its keep. Leaf/wiring layers
  // (views, domains config, type decls, route handlers) are excluded: a JSDoc
  // on `export const SomeView` or `export type Row` is noise, not API docs.
  docApiDirs: [
    "services",
    "utils",
    "repositories",
    "factories",
    "components",
    "providers",
  ],
  // Weight of each dimension in the overall blend. Dimensions that are not
  // computed (e.g. lint without --deep) are dropped and weights renormalized.
  weights: {
    structure: 1.5,
    typeSafety: 2,
    debt: 1.5,
    complexity: 1.5,
    duplication: 1.5,
    testing: 1.5,
    docs: 1,
    lintFormat: 2,
    deadCode: 1.5,
  } as Record<string, number>,
};

const SOURCE_EXT = new Set([".ts", ".tsx", ".js"]);
const ALL_EXT = new Set([".ts", ".tsx", ".js", ".css"]);

interface FileInfo {
  path: string;
  rel: string;
  ext: string;
  loc: number;
  text: string;
  isTest: boolean;
}

interface Dimension {
  name: string;
  score: number; // 0-100
  grade: string;
  summary: string;
  findings: string[]; // notable evidence lines (file:metric)
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------
function grade(score: number): string {
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 60) return "D";
  return "F";
}

/** Clamp a raw 0-100 number. */
function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Filesystem walk (read-only)
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set([
  "vendor",
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "example",
  "docs",
  "deploy",
  "TO_MIGRATE",
  "__trash",
]);

async function walk(
  dir: string,
  root: string,
  out: FileInfo[],
): Promise<void> {
  let entries: Deno.DirEntry[];
  try {
    entries = [];
    for await (const e of Deno.readDir(dir)) entries.push(e);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return;
    throw err;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (e.isDirectory) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(join(dir, e.name), root, out);
      continue;
    }
    if (!e.isFile) continue;
    const dot = e.name.lastIndexOf(".");
    const ext = dot === -1 ? "" : e.name.slice(dot);
    if (!ALL_EXT.has(ext)) continue;
    if (e.name.includes(".min.")) continue; // skip minified/generated
    const path = join(dir, e.name);
    const text = await Deno.readTextFile(path);
    out.push({
      path,
      rel: path.startsWith(root)
        ? path.slice(root.length).replace(/^\//, "")
        : path,
      ext,
      loc: text.length === 0 ? 0 : text.split("\n").length,
      text,
      isTest: /(_test\.|\.test\.|[\/\\]tests?[\/\\])/.test(path),
    });
  }
}

/** Count regex matches across all source (non-test) files. */
function countMatches(
  files: FileInfo[],
  re: RegExp,
  opts: { tests?: boolean } = {},
): Array<{ rel: string; line: number; text: string }> {
  const hits: Array<{ rel: string; line: number; text: string }> = [];
  for (const f of files) {
    if (!SOURCE_EXT.has(f.ext)) continue;
    if (f.isTest && !opts.tests) continue;
    const lines = f.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const local = new RegExp(re.source, re.flags.replace("g", ""));
      if (local.test(lines[i])) {
        hits.push({ rel: f.rel, line: i + 1, text: lines[i].trim() });
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Dimension 1 — Structure
// ---------------------------------------------------------------------------
function analyzeStructure(files: FileInfo[]): Dimension {
  const src = files.filter((f) => SOURCE_EXT.has(f.ext) && !f.isTest);
  const totalLoc = src.reduce((n, f) => n + f.loc, 0);
  const god = src
    .filter((f) => f.loc > CONFIG.godFileLoc)
    .sort((a, b) => b.loc - a.loc);
  const godLoc = god.reduce((n, f) => n + f.loc, 0);
  // Score: penalize the share of code trapped in oversized files.
  const share = totalLoc === 0 ? 0 : godLoc / totalLoc;
  const score = clamp(100 - share * 250 - god.length * 1.5);
  return {
    name: "Structure",
    score,
    grade: grade(score),
    summary: `${src.length} source files, ${totalLoc.toLocaleString()} LOC; ` +
      `${god.length} god-file(s) >${CONFIG.godFileLoc} LOC ` +
      `(${(share * 100).toFixed(1)}% of code).`,
    findings: god.slice(0, 10).map((f) => `${f.rel} — ${f.loc} LOC`),
    recommendations: god.length === 0 ? [] : [
      `Decompose the ${god.length} god-file(s); the largest (${god[0].rel}, ` +
      `${god[0].loc} LOC) is the priority. Extract cohesive sub-modules.`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Dimension 2 — Type Safety
// ---------------------------------------------------------------------------
function analyzeTypeSafety(files: FileInfo[]): Dimension {
  const tsFiles = files.filter((f) =>
    (f.ext === ".ts" || f.ext === ".tsx") && !f.isTest
  );
  const loc = tsFiles.reduce((n, f) => n + f.loc, 0) || 1;
  const probes: Array<{ label: string; re: RegExp }> = [
    { label: "as any", re: /\bas any\b/ },
    { label: ": any", re: /:\s*any(\b|\[)/ },
    { label: "as unknown as", re: /\bas unknown as\b/ },
    { label: "non-null assertion (!.)", re: /\w!\.\w/ },
    { label: "@ts-ignore / @ts-nocheck", re: /@ts-(ignore|nocheck)/ },
    { label: "deno-lint-ignore", re: /deno-lint-ignore/ },
  ];
  const findings: string[] = [];
  let total = 0;
  for (const p of probes) {
    const hits = countMatches(tsFiles, p.re);
    if (hits.length > 0) {
      total += hits.length;
      findings.push(
        `${p.label}: ${hits.length}  (e.g. ${hits[0].rel}:${hits[0].line})`,
      );
    }
  }
  const per1k = (total / loc) * 1000;
  const score = clamp(100 - Math.max(0, per1k - CONFIG.typeEscapePer1k) * 18);
  return {
    name: "Type Safety",
    score,
    grade: grade(score),
    summary:
      `${total} type-escape hatch(es) across ${tsFiles.length} TS files ` +
      `(${per1k.toFixed(2)}/KLOC, target ≤${CONFIG.typeEscapePer1k}).`,
    findings,
    recommendations: total === 0 ? [] : [
      "Narrow each escape hatch to a concrete type or a guarded `unknown`. " +
      "Centralize unavoidable casts behind a typed helper.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Dimension 3 — Debt markers
// ---------------------------------------------------------------------------
function analyzeDebt(files: FileInfo[]): Dimension {
  const src = files.filter((f) => SOURCE_EXT.has(f.ext) && !f.isTest);
  // The log-singleton + no-silent-swallow conventions are SERVER rules: the
  // `log` singleton is a Deno import browser code cannot use, and static/js has
  // its own sanctioned guarded-diagnostic patterns. Scope those two checks to
  // server source; TODO/FIXME markers apply everywhere.
  const isBrowser = (rel: string) => /static[\/\\]js[\/\\]/.test(rel);
  const server = src.filter((f) => !isBrowser(f.rel));
  const markers = countMatches(src, /\b(TODO|FIXME|HACK|XXX|WIP)\b/);
  // console.* that bypasses the log singleton. Logger transport sinks are
  // exempt — they ARE the output transport: singletons/logger.ts and the
  // self-contained WebDAV logger (api/v1/webdav/log.ts, which keeps JSON
  // request-log mode the text-only app singleton can't express).
  const consoles = countMatches(
    server,
    /\bconsole\.(log|error|warn|info|debug)\b/,
  ).filter((h) => !/(^|[\/\\])(logger|log)\.ts$/.test(h.rel));
  const emptyCatch = countMatches(server, /catch\s*(\([^)]*\))?\s*\{\s*\}/);
  const total = markers.length + consoles.length + emptyCatch.length;
  const score = clamp(
    100 - markers.length * 6 - consoles.length * 3 -
      emptyCatch.length * 5,
  );
  const findings: string[] = [];
  if (markers.length) {
    findings.push(
      `TODO/FIXME/HACK markers: ${markers.length}` +
        (markers[0] ? `  (e.g. ${markers[0].rel}:${markers[0].line})` : ""),
    );
  }
  if (consoles.length) {
    findings.push(
      `console.* bypassing log singleton: ${consoles.length}  ` +
        `(e.g. ${consoles[0].rel}:${consoles[0].line})`,
    );
  }
  if (emptyCatch.length) {
    findings.push(
      `empty catch {} swallows: ${emptyCatch.length}  ` +
        `(e.g. ${emptyCatch[0].rel}:${emptyCatch[0].line})`,
    );
  }
  return {
    name: "Debt Markers",
    score,
    grade: grade(score),
    summary: total === 0
      ? "No debt markers, no console bypass, no empty catches."
      : `${total} debt signal(s).`,
    findings,
    recommendations: total === 0 ? [] : [
      consoles.length
        ? "Route console.* through the log singleton (singletons/logger.ts)."
        : "Resolve or ticket each TODO/FIXME; never ship swallowed errors.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Dimension 4 — Complexity (cyclomatic / decision-point count, per-function AST)
// ---------------------------------------------------------------------------
// McCabe cyclomatic complexity = 1 + decision points in a function body
// (if/for/while/case/catch + && + || + ?? + ternary). Sourced from a real
// TypeScript AST walk (scripts/analyze/ast.ts), NOT line/brace heuristics: each
// real function is scored on its own, so a function inside a classic-script
// IIFE is no longer counted as part of one giant file-wide "function".
function analyzeComplexity(files: FileInfo[]): Dimension {
  const src = files.filter((f) => SOURCE_EXT.has(f.ext) && !f.isTest);
  const complex = src
    .flatMap((f) => collectComplexity(f.rel, f.text))
    .filter((c) => c.cc > CONFIG.maxCyclomatic)
    .sort((a, b) => b.cc - a.cc);

  // Penalize each over-threshold function, weighted by how far over it is.
  const penalty = complex.reduce(
    (n, c) => n + 2 + (c.cc - CONFIG.maxCyclomatic) * 0.6,
    0,
  );
  const score = clamp(100 - penalty);
  return {
    name: "Complexity",
    score,
    grade: grade(score),
    summary:
      `${complex.length} function(s) over cyclomatic ${CONFIG.maxCyclomatic} ` +
      `(per-function AST decision count).` +
      (complex.length
        ? ` Worst: ${complex[0].cc} at ${complex[0].rel}:${complex[0].line} ` +
          `(${complex[0].name}).`
        : ""),
    findings: complex.slice(0, 8).map((c) =>
      `cyclomatic ${c.cc} (~${c.loc} LOC): ${c.name} @ ${c.rel}:${c.line}`
    ),
    recommendations: complex.length === 0 ? [] : [
      "Split high-cyclomatic functions: extract branch groups into helpers, " +
      "replace long condition/switch chains with lookup tables + early returns.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Dimension 5 — Duplication (line-window clone detection)
// ---------------------------------------------------------------------------
// Slide a window of `dupWindow` *meaningful* lines (blank / punctuation-only /
// import / comment lines dropped) over every source file, hash each window, and
// flag windows whose content recurs at ≥2 positions. Reports the % of
// meaningful lines inside a clone + the top hotspots. Line-based, not token-AST:
// it catches copy-paste, misses renamed/reordered clones — documented like the
// other heuristics.
//
// Multi-line `import {…}` / `export {…}` specifier BODIES are dropped whole: the
// continuation lines (`  someSymbol,`) are not code, and 40 domains importing
// the same shared-cache API otherwise dominate the hotspots with pure noise.
function analyzeDuplication(files: FileInfo[]): Dimension {
  const src = files.filter((f) => SOURCE_EXT.has(f.ext) && !f.isTest);
  const W = CONFIG.dupWindow;
  const trivial = (s: string) =>
    s === "" || /^[{}()[\];,.]+$/.test(s) ||
    s.startsWith("//") || s.startsWith("*") || s.startsWith("/*") ||
    /^(import|export)\b/.test(s);

  type PerFile = {
    rel: string;
    entries: { line: number; norm: string }[];
    hashes: string[];
  };
  const perFile: PerFile[] = [];
  const hashLocs = new Map<string, Array<{ rel: string; line: number }>>();
  let totalMeaningful = 0;

  for (const f of src) {
    const lines = f.text.split("\n");
    const entries: { line: number; norm: string }[] = [];
    let inSpecifierBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const norm = lines[i].trim().replace(/\s+/g, " ");
      // Inside a multi-line import/export specifier block: skip every line up to
      // and including the closing brace.
      if (inSpecifierBlock) {
        if (norm.includes("}")) inSpecifierBlock = false;
        continue;
      }
      // Open one: starts with import/export, opens `{`, no close on the same line.
      if (
        /^(import|export)\b/.test(norm) && norm.includes("{") &&
        !norm.includes("}")
      ) {
        inSpecifierBlock = true;
        continue;
      }
      if (trivial(norm)) continue;
      entries.push({ line: i + 1, norm });
    }
    totalMeaningful += entries.length;
    const hashes: string[] = [];
    for (let i = 0; i + W <= entries.length; i++) {
      const hash = entries.slice(i, i + W).map((e) => e.norm).join("\n");
      hashes.push(hash);
      const arr = hashLocs.get(hash) ?? [];
      arr.push({ rel: f.rel, line: entries[i].line });
      hashLocs.set(hash, arr);
    }
    perFile.push({ rel: f.rel, entries, hashes });
  }

  // Mark meaningful-line indices covered by any clone window (hash seen ≥2×).
  let dupLines = 0;
  for (const pf of perFile) {
    const covered = new Array(pf.entries.length).fill(false);
    for (let i = 0; i < pf.hashes.length; i++) {
      if ((hashLocs.get(pf.hashes[i]) ?? []).length < 2) continue;
      for (let k = 0; k < W; k++) covered[i + k] = true;
    }
    dupLines += covered.filter(Boolean).length;
  }

  // Top clone hotspots by occurrence count (distinct content blocks).
  const hotspots = [...hashLocs.entries()]
    .filter(([, locs]) => locs.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);

  const dupPct = totalMeaningful === 0 ? 0 : (dupLines / totalMeaningful) * 100;

  // Structural clones (TS/JS): functions with the same AST shape but different
  // identifier names — the renamed copies the line-hasher cannot see.
  const structByKey = new Map<
    string,
    Array<{ rel: string; name: string; line: number; size: number }>
  >();
  for (const f of src) {
    for (
      const c of collectStructuralClones(f.rel, f.text, CONFIG.minCloneNodes)
    ) {
      const arr = structByKey.get(c.key) ?? [];
      arr.push({ rel: c.rel, name: c.name, line: c.line, size: c.size });
      structByKey.set(c.key, arr);
    }
  }
  const structClones = [...structByKey.values()]
    .filter((locs) => locs.length >= 2)
    .sort((a, b) => b[0].size - a[0].size)
    .slice(0, 6);

  // CSS contextual duplication: identical declaration body under ≥2 selectors.
  const cssByBody = new Map<string, CssRule[]>();
  for (const f of files.filter((f) => f.ext === ".css" && !f.isTest)) {
    for (const r of collectCssRules(f.rel, f.text, CONFIG.minCssDecls)) {
      const arr = cssByBody.get(r.bodyKey) ?? [];
      arr.push(r);
      cssByBody.set(r.bodyKey, arr);
    }
  }
  const cssDups = [...cssByBody.values()]
    .filter((rules) => new Set(rules.map((r) => r.selector)).size >= 2)
    .sort((a, b) => b[0].declCount - a[0].declCount)
    .slice(0, 6);

  const score = clamp(
    100 - Math.max(0, dupPct - CONFIG.maxDupPct) * 9 - dupPct -
      structClones.length * 2 - cssDups.length * 2,
  );
  return {
    name: "Duplication",
    score,
    grade: grade(score),
    summary: `${dupPct.toFixed(1)}% of meaningful lines inside a ${W}-line ` +
      `clone (target ≤${CONFIG.maxDupPct}%); ${hotspots.length} line + ` +
      `${structClones.length} structural + ${cssDups.length} CSS hotspot(s).`,
    findings: [
      ...hotspots.map(([, locs]) =>
        `line ×${locs.length}: ${locs[0].rel}:${locs[0].line} ↔ ` +
        `${locs[1].rel}:${locs[1].line}`
      ),
      ...structClones.map((locs) =>
        `struct ×${locs.length} (~${locs[0].size} nodes): ` +
        `${locs[0].name} ${locs[0].rel}:${locs[0].line} ↔ ` +
        `${locs[1].name} ${locs[1].rel}:${locs[1].line}`
      ),
      ...cssDups.map((rules) =>
        `css ×${rules.length} (${rules[0].declCount} decls): ` +
        rules.slice(0, 2).map((r) => `${r.selector} ${r.rel}:${r.line}`).join(
          " ↔ ",
        )
      ),
    ],
    recommendations: [
      ...(dupPct > CONFIG.maxDupPct
        ? [
          "Extract the recurring blocks into a shared helper/component. " +
          "Parse/format logic belongs in utils/, not copy-pasted per module.",
        ]
        : []),
      ...(structClones.length
        ? [
          "Structural clones (same shape, renamed names): factor into a " +
          "generic helper/factory instead of copy-paste-then-rename.",
        ]
        : []),
      ...(cssDups.length
        ? [
          "CSS rules share a declaration body under different selectors: " +
          "consolidate to one class or a shared utility/token.",
        ]
        : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Dimension 5 — Testing
// ---------------------------------------------------------------------------
function analyzeTesting(files: FileInfo[]): Dimension {
  const src = files.filter((f) => SOURCE_EXT.has(f.ext) && !f.isTest);
  const tests = files.filter((f) => SOURCE_EXT.has(f.ext) && f.isTest);
  const srcLoc = src.reduce((n, f) => n + f.loc, 0) || 1;
  const testLoc = tests.reduce((n, f) => n + f.loc, 0);
  const ratio = testLoc / srcLoc;
  const score = clamp((ratio / CONFIG.minTestRatio) * 100);
  return {
    name: "Testing",
    score,
    grade: grade(score),
    summary:
      `${tests.length} test file(s), ${testLoc.toLocaleString()} test LOC ` +
      `(ratio ${(ratio * 100).toFixed(0)}% of source, target ` +
      `${(CONFIG.minTestRatio * 100).toFixed(0)}%).`,
    findings: tests.length === 0
      ? ["No test files found under the analyzed root."]
      : [],
    recommendations: ratio >= CONFIG.minTestRatio ? [] : [
      `Raise test coverage: ratio ${(ratio * 100).toFixed(0)}% is below the ` +
      `${
        (CONFIG.minTestRatio * 100).toFixed(0)
      }% target. Prioritize untested services/utils.`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Dimension 6 — Documentation (heuristic)
// ---------------------------------------------------------------------------
function analyzeDocs(files: FileInfo[]): Dimension {
  const inApiLayer = (rel: string) =>
    CONFIG.docApiDirs.some((d) =>
      rel === d || rel.startsWith(d + "/") || rel.startsWith(d + "\\")
    );
  const src = files.filter((f) =>
    (f.ext === ".ts" || f.ext === ".tsx") && !f.isTest && inApiLayer(f.rel)
  );
  let exported = 0;
  let documented = 0;
  let withHeader = 0;
  for (const f of src) {
    const lines = f.text.split("\n");
    // File header: a comment within the first 3 non-empty lines.
    const head = lines.slice(0, 5).join("\n");
    if (/^\s*(\/\*|\/\/|#!)/.test(head)) withHeader++;
    for (let i = 0; i < lines.length; i++) {
      if (
        /^export\s+(async\s+)?(function|const|class|interface|type|enum)\b/
          .test(lines[i])
      ) {
        exported++;
        const prev = (lines[i - 1] ?? "").trim();
        if (
          prev.endsWith("*/") || prev.startsWith("//") || prev.startsWith("*")
        ) {
          documented++;
        }
      }
    }
  }
  const docRatio = exported === 0 ? 1 : documented / exported;
  const headerRatio = src.length === 0 ? 1 : withHeader / src.length;
  const score = clamp(docRatio * 70 + headerRatio * 30);
  return {
    name: "Documentation",
    score,
    grade: grade(score),
    summary: `${documented}/${exported} public-API exports documented ` +
      `(${(docRatio * 100).toFixed(0)}%); ${withHeader}/${src.length} files ` +
      `have a header comment. Scope: ${CONFIG.docApiDirs.join("/")}.`,
    findings: [],
    recommendations: docRatio >= 0.5 ? [] : [
      "Add doc comments to exported APIs (services, utils, shared components). " +
      "Heuristic — counts a comment directly above the export.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Dimension 7 — Lint / Format (--deep, subprocess)
// ---------------------------------------------------------------------------
async function runDeno(args: string[]): Promise<
  { ok: boolean; code: number; stdout: string; stderr: string } | null
> {
  try {
    const cmd = new Deno.Command("deno", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await cmd.output();
    return {
      ok: code === 0,
      code,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    };
  } catch {
    return null; // deno not found or --allow-run missing
  }
}

async function analyzeLintFormat(root: string): Promise<Dimension | null> {
  const lint = await runDeno(["lint", "--json", root]);
  if (lint === null) return null; // no allow-run → dimension omitted
  let lintCount = 0;
  try {
    const parsed = JSON.parse(lint.stdout) as { diagnostics?: unknown[] };
    lintCount = parsed.diagnostics?.length ?? 0;
  } catch {
    lintCount = lint.ok ? 0 : -1; // -1 = could not determine
  }
  const fmt = await runDeno(["fmt", "--check", root]);
  // fmt --check exits non-zero and lists files needing format on stdout.
  const fmtUnformatted = fmt === null
    ? -1
    : fmt.ok
    ? 0
    : fmt.stdout.split("\n").filter((l) => l.trim().length > 0).length;

  const findings: string[] = [];
  if (lintCount > 0) findings.push(`deno lint: ${lintCount} diagnostic(s).`);
  if (lintCount === 0) findings.push("deno lint: clean.");
  if (fmtUnformatted > 0) {
    findings.push(
      `deno fmt --check: ${fmtUnformatted} file(s) need formatting.`,
    );
  }
  if (fmtUnformatted === 0) findings.push("deno fmt --check: clean.");

  const lintPenalty = lintCount < 0 ? 10 : lintCount * 4;
  const fmtPenalty = fmtUnformatted < 0 ? 10 : fmtUnformatted * 4;
  const score = clamp(100 - lintPenalty - fmtPenalty);
  return {
    name: "Lint / Format",
    score,
    grade: grade(score),
    summary: `lint ${lintCount < 0 ? "?" : lintCount} diagnostic(s), ` +
      `fmt ${fmtUnformatted < 0 ? "?" : fmtUnformatted} unformatted file(s).`,
    findings,
    recommendations: (lintCount > 0 || fmtUnformatted > 0)
      ? ["Run `deno lint` and `deno fmt` and resolve all reported items."]
      : [],
  };
}

// ---------------------------------------------------------------------------
// Dimension 9 — Dead Code (--dead, in-process TS findReferences)
// ---------------------------------------------------------------------------
// Builds the Dimension from the raw dead-export list produced by the (lazily
// imported) deadcode collector. CANDIDATES, not certainties: dynamic
// registration can mask real use — flagged in the summary, never auto-deleted.
function analyzeDeadCodeDimension(dead: DeadExport[]): Dimension {
  const trueDead = dead.filter((d) => !d.testOnly);
  const testOnly = dead.filter((d) => d.testOnly);
  const score = clamp(100 - trueDead.length * 3 - testOnly.length);
  return {
    name: "Dead Code",
    score,
    grade: grade(score),
    summary: `${trueDead.length} unused export(s) + ${testOnly.length} ` +
      `test-only export(s). CANDIDATES — dynamic registration (views, MCP ` +
      `tools, routes) can mask real use; confirm by reading before deleting.`,
    findings: [
      ...trueDead.slice(0, 8).map((d) =>
        `dead: ${d.name} @ ${d.rel}:${d.line}`
      ),
      ...testOnly.slice(0, 4).map((d) =>
        `test-only: ${d.name} @ ${d.rel}:${d.line}`
      ),
    ],
    recommendations: trueDead.length === 0 && testOnly.length === 0 ? [] : [
      "Remove genuinely-unused exports (confirm no dynamic/string-keyed use); " +
      "drop `export` on test-only symbols or delete if the test is obsolete.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------
const BAR_WIDTH = 24;
function bar(score: number): string {
  const filled = Math.round((score / 100) * BAR_WIDTH);
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

function renderDimension(d: Dimension): void {
  console.log(
    `\n  ${d.name.padEnd(16)} ${bar(d.score)} ${
      String(d.score).padStart(3)
    }/100  [${d.grade}]`,
  );
  console.log(`    ${d.summary}`);
  for (const f of d.findings) console.log(`      · ${f}`);
  for (const r of d.recommendations) console.log(`    → ${r}`);
}

interface Report {
  generatedAt: string;
  root: string;
  overall: { score: number; grade: string };
  dimensions: Dimension[];
}

function overallScore(dims: Dimension[]): number {
  let weighted = 0;
  let weightSum = 0;
  for (const d of dims) {
    const key = d.name === "Type Safety"
      ? "typeSafety"
      : d.name === "Debt Markers"
      ? "debt"
      : d.name === "Lint / Format"
      ? "lintFormat"
      : d.name === "Dead Code"
      ? "deadCode"
      : d.name.toLowerCase();
    const w = CONFIG.weights[key] ?? 1;
    weighted += d.score * w;
    weightSum += w;
  }
  return weightSum === 0 ? 0 : clamp(weighted / weightSum);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const args = Deno.args;
  const deep = args.includes("--deep");
  const deadFlag = args.includes("--dead");
  const jsonIdx = args.indexOf("--json");
  const jsonPath = jsonIdx !== -1 ? args[jsonIdx + 1] : null;
  const minIdx = args.indexOf("--min-score");
  const minScore = minIdx !== -1 ? Number(args[minIdx + 1]) : 0;
  const flagValues = new Set([
    jsonPath,
    minIdx !== -1 ? args[minIdx + 1] : null,
  ]);
  const root = args.find((a) => !a.startsWith("--") && !flagValues.has(a)) ??
    "./src";

  const rootAbs = await Deno.realPath(root).catch(() => root);
  console.log("=== CODEBASE QUALITY ANALYSIS ===");
  console.log(`Root:  ${root}`);
  console.log(
    `Mode:  ${deep ? "deep (lint/fmt subprocess)" : "fast (filesystem only)"}`,
  );

  const files: FileInfo[] = [];
  await walk(rootAbs, rootAbs, files);
  // Tests usually live in a sibling dir (e.g. src/ + tests/). Pull it in so the
  // Testing dimension is accurate, without dragging non-app dirs (scripts/,
  // docs/) into the app-scoped metrics. Test files carry isTest=true and are
  // excluded from every other dimension.
  const hasTests = files.some((f) => f.isTest);
  if (!hasTests) {
    for (
      const cand of [join(rootAbs, "tests"), join(dirname(rootAbs), "tests")]
    ) {
      const stat = await Deno.stat(cand).catch(() => null);
      if (stat?.isDirectory) {
        await walk(cand, rootAbs, files);
        break;
      }
    }
  }
  if (files.length === 0) {
    console.error(
      `\nNo analyzable files found under ${root}. Nothing to score.`,
    );
    Deno.exit(2);
  }

  const dims: Dimension[] = [
    analyzeStructure(files),
    analyzeTypeSafety(files),
    analyzeDebt(files),
    analyzeComplexity(files),
    analyzeDuplication(files),
    analyzeTesting(files),
    analyzeDocs(files),
  ];
  if (deep) {
    const lf = await analyzeLintFormat(root);
    if (lf) dims.push(lf);
    else {
      console.log(
        "\n  (lint/format skipped — `deno` unavailable or --allow-run missing)",
      );
    }
  }
  if (deadFlag) {
    // Lazy import: the cross-file findReferences pass (and its typescript load)
    // only happens under --dead, keeping the fast default run dependency-free.
    const { analyzeDeadCode } = await import("./analyze/deadcode.ts");
    const tsFiles = files.map((f) => ({
      path: f.path,
      rel: f.rel,
      text: f.text,
      isTest: f.isTest,
    }));
    dims.push(analyzeDeadCodeDimension(analyzeDeadCode(tsFiles)));
  }

  for (const d of dims) renderDimension(d);

  const overall = overallScore(dims);
  const overallGrade = grade(overall);
  console.log("\n" + "─".repeat(56));
  console.log(
    `  OVERALL  ${bar(overall)} ${
      String(overall).padStart(3)
    }/100  [${overallGrade}]`,
  );
  console.log("─".repeat(56));

  // Top recommendations, worst dimensions first.
  const recs = [...dims]
    .sort((a, b) => a.score - b.score)
    .flatMap((d) => d.recommendations.map((r) => `[${d.name}] ${r}`));
  if (recs.length > 0) {
    console.log("\n=== TOP RECOMMENDATIONS ===");
    for (const r of recs.slice(0, 6)) console.log(`  • ${r}`);
  } else {
    console.log("\nNo recommendations — every dimension at target.");
  }

  if (jsonPath) {
    const report: Report = {
      generatedAt: new Date().toISOString(),
      root,
      overall: { score: overall, grade: overallGrade },
      dimensions: dims,
    };
    await Deno.writeTextFile(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report written to ${jsonPath}`);
  }

  if (overall < minScore) {
    console.error(
      `\nFAIL: overall ${overall} is below --min-score ${minScore}.`,
    );
    Deno.exit(1);
  }
}

await main();
