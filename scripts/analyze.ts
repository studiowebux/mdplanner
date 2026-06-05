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
 *   4. Complexity  — heuristic max nesting depth (indent) + longest function
 *                    (brace tracking) per file. HEURISTIC, not AST-accurate.
 *   5. Testing     — test-file count + test:source ratio.
 *   6. Docs        — exported symbols preceded by a doc comment; file headers.
 *   7. Lint/Format — (--deep only) deno lint --json + deno fmt --check counts.
 *
 * The overall grade is a weighted blend of the available dimensions.
 *
 * LIMITATION (be honest): complexity + docs are line/regex heuristics, NOT a
 * type-aware AST walk. They approximate hotspots, they do not certify them. A
 * generated/minified file can skew them — such files are excluded (vendor/,
 * *.min.*). Lint/Format/Duplication are only computed with --deep (subprocess).
 *
 * Usage:
 *   deno run --allow-read scripts/analyze.ts [root]
 *   deno run --allow-read --allow-run scripts/analyze.ts --deep [root]
 *   deno run --allow-read --allow-run --allow-write scripts/analyze.ts \
 *     --deep --json report.json [root]
 *
 * Flags:
 *   --deep            also run deno lint/fmt (+ jscpd if available). Needs --allow-run.
 *   --json <path>     write the full machine-readable report (needs --allow-write).
 *   --min-score <n>   exit non-zero if the overall score is below n (default 0).
 *   root              directory to analyze (default ./src). A sibling tests/
 *                     dir is auto-included for the Testing dimension only.
 */

import { dirname, join } from "@std/path";

// ---------------------------------------------------------------------------
// Tunables — thresholds that define "good". Adjust per project, not per run.
// ---------------------------------------------------------------------------
const CONFIG = {
  godFileLoc: 600, // a single source file over this many lines is a god-file
  maxNesting: 5, // indentation depth (in 2-space steps) considered too deep
  longFunctionLoc: 80, // a function body over this many lines is "long"
  typeEscapePer1k: 2, // tolerated type-escape hatches per 1000 source lines
  minTestRatio: 0.25, // tests-LOC : source-LOC target ratio
  // Weight of each dimension in the overall blend. Dimensions that are not
  // computed (e.g. lint without --deep) are dropped and weights renormalized.
  weights: {
    structure: 1.5,
    typeSafety: 2,
    debt: 1.5,
    complexity: 1.5,
    testing: 1.5,
    docs: 1,
    lintFormat: 2,
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
  // console.* that bypasses the log singleton (logger.ts itself is exempt).
  const consoles = countMatches(
    server,
    /\bconsole\.(log|error|warn|info|debug)\b/,
  ).filter((h) => !/logger\.ts$/.test(h.rel));
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
// Dimension 4 — Complexity (heuristic)
// ---------------------------------------------------------------------------
function analyzeComplexity(files: FileInfo[]): Dimension {
  const src = files.filter((f) => SOURCE_EXT.has(f.ext) && !f.isTest);
  const deepNest: Array<{ rel: string; depth: number; line: number }> = [];
  const longFns: Array<{ rel: string; loc: number; line: number }> = [];

  for (const f of src) {
    const lines = f.text.split("\n");
    // Max indentation depth (2-space steps), ignoring blank/comment lines.
    let maxDepth = 0;
    let maxDepthLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (
        l.trim() === "" || l.trim().startsWith("*") || l.trim().startsWith("//")
      ) {
        continue;
      }
      const indent = l.length - l.trimStart().length;
      const depth = Math.floor(indent / 2);
      if (depth > maxDepth) {
        maxDepth = depth;
        maxDepthLine = i + 1;
      }
    }
    if (maxDepth > CONFIG.maxNesting) {
      deepNest.push({ rel: f.rel, depth: maxDepth, line: maxDepthLine });
    }

    // Longest function body via brace tracking from a function-ish signature.
    const fnRe = /\b(function\b|=>\s*\{|\)\s*\{|\)\s*:\s*[\w<>,.\[\] ]+\{)/;
    for (let i = 0; i < lines.length; i++) {
      if (!fnRe.test(lines[i]) || !lines[i].includes("{")) continue;
      let depth = 0;
      let started = false;
      let bodyLoc = 0;
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === "{") {
            depth++;
            started = true;
          } else if (ch === "}") depth--;
        }
        if (started) bodyLoc++;
        if (started && depth <= 0) break;
      }
      if (bodyLoc > CONFIG.longFunctionLoc) {
        longFns.push({ rel: f.rel, loc: bodyLoc, line: i + 1 });
      }
    }
  }

  deepNest.sort((a, b) => b.depth - a.depth);
  longFns.sort((a, b) => b.loc - a.loc);
  const score = clamp(100 - deepNest.length * 2 - longFns.length * 2.5);
  const findings = [
    ...deepNest.slice(0, 6).map((d) =>
      `deep nesting (${d.depth} levels): ${d.rel}:${d.line}`
    ),
    ...longFns.slice(0, 6).map((d) =>
      `long function (~${d.loc} LOC): ${d.rel}:${d.line}`
    ),
  ];
  return {
    name: "Complexity",
    score,
    grade: grade(score),
    summary: `${deepNest.length} file(s) nest >${CONFIG.maxNesting} deep; ` +
      `${longFns.length} function(s) >${CONFIG.longFunctionLoc} LOC. ` +
      `(heuristic, not AST)`,
    findings,
    recommendations: deepNest.length + longFns.length === 0 ? [] : [
      "Extract guard clauses / helpers to flatten nesting and split long " +
      "functions. Heuristic — confirm hotspots by reading the file.",
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
  const src = files.filter((f) =>
    (f.ext === ".ts" || f.ext === ".tsx") && !f.isTest
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
    summary: `${documented}/${exported} exported symbols documented ` +
      `(${(docRatio * 100).toFixed(0)}%); ${withHeader}/${src.length} files ` +
      `have a header comment.`,
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
