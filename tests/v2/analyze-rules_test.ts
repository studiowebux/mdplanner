/**
 * tests/v2/analyze-rules_test.ts
 *
 * Per-rule fixtures for the analyzer's project-rules dimension
 * (scripts/analyze/rules.ts). Each test feeds a tiny in-memory file and asserts
 * the expected rule fires (and a clean sample fires nothing). Guards the
 * confidence tiers: only font/theme/fetch/csp are "high" (gateable); the noisy
 * detectors (undefined-class, raw-markdown-render) stay "heuristic".
 */

import { assertEquals } from "@std/assert";
import {
  collectRuleFindings,
  type Finding,
  type RuleFile,
} from "../../scripts/analyze/rules.ts";

function file(rel: string, text: string): RuleFile {
  const dot = rel.lastIndexOf(".");
  return { rel, ext: rel.slice(dot), text, isTest: false };
}

function ids(findings: Finding[]): string[] {
  return findings.map((f) => f.ruleId).sort();
}

function fire(files: RuleFile[], ruleId: string): Finding[] {
  return collectRuleFindings(files).filter((f) => f.ruleId === ruleId);
}

Deno.test("font-below-floor: flags sub-12px screen font, high-confidence", () => {
  const hits = fire(
    [file("static/css/x.css", ".a { font-size: 10px; }")],
    "font-below-floor",
  );
  assertEquals(hits.length, 1);
  assertEquals(hits[0].confidence, "high");
  assertEquals(hits[0].line, 1);
});

Deno.test("font-below-floor: exempts @media print and *-print selectors", () => {
  const css = [
    "@media print { .a { font-size: 9px; } }",
    ".invoice-print__row { font-size: 8px; }",
    ".ok { font-size: 0.75rem; }",
  ].join("\n");
  assertEquals(fire([file("static/css/p.css", css)], "font-below-floor"), []);
});

Deno.test("theme-split-leak: flags non-color prop in a .dark block", () => {
  const css = ".dark { padding: 8px; color: white; }";
  const hits = fire([file("static/css/t.css", css)], "theme-split-leak");
  assertEquals(hits.length, 1);
  assertEquals(hits[0].confidence, "high");
});

Deno.test("theme-split-leak: color props in theme block are clean", () => {
  const css =
    ":root:not(.dark) { color: #000; background: #fff; border: 1px solid var(--x); }";
  assertEquals(fire([file("static/css/t.css", css)], "theme-split-leak"), []);
});

Deno.test("fetch-in-client: flags fetch in non-exempt static/js", () => {
  const hits = fire(
    [file("static/js/widget.js", "function go(){ fetch('/x'); }")],
    "fetch-in-client",
  );
  assertEquals(hits.length, 1);
  assertEquals(hits[0].confidence, "high");
});

Deno.test("fetch-in-client: exempts canvas/editor/mention + server .tsx", () => {
  const files = [
    file("static/js/note-editor.js", "fetch('/save')"),
    file("static/js/sticky-note-canvas.js", "fetch('/board')"),
    file("static/js/mention-autocomplete.js", "fetch('/m')"),
    file("views/people/routes.tsx", "await fetch('https://api')"),
  ];
  assertEquals(fire(files, "fetch-in-client"), []);
});

Deno.test("csp-hx-vals-js: flags hx-vals='js:'", () => {
  const tsx = `<button hx-vals='js:{a:1}'>x</button>`;
  const hits = fire([file("views/x.tsx", tsx)], "csp-hx-vals-js");
  assertEquals(hits.length, 1);
  assertEquals(hits[0].confidence, "high");
});

Deno.test("raw-markdown-render: heuristic only (never gates)", () => {
  const tsx = `<p>{item.description}</p>`;
  const hits = fire([file("views/x.tsx", tsx)], "raw-markdown-render");
  assertEquals(hits.length, 1);
  assertEquals(hits[0].confidence, "heuristic");
});

Deno.test("htmx-attr-inheritance: heuristic flag on container hx-params", () => {
  const tsx = `<div hx-params="a,b"><input name="a"/></div>`;
  const hits = fire([file("views/x.tsx", tsx)], "htmx-attr-inheritance");
  assertEquals(hits.length, 1);
  assertEquals(hits[0].confidence, "heuristic");
});

Deno.test("undefined-class: heuristic; flags static class with no CSS rule", () => {
  const files = [
    file("static/css/a.css", ".known { color: red; }"),
    file("views/x.tsx", `<div class="known mystery-class"></div>`),
  ];
  const hits = fire(files, "undefined-class");
  assertEquals(hits.length, 1);
  assertEquals(hits[0].message.includes("mystery-class"), true);
  assertEquals(hits[0].confidence, "heuristic");
});

Deno.test("undefined-class: skips dynamic ${} class lists and known classes", () => {
  const files = [
    file("static/css/a.css", ".known { color: red; }"),
    file("views/x.tsx", "<div class={`known ${dyn}`}></div>"),
    file("views/y.tsx", `<div class="known htmx-indicator"></div>`),
  ];
  assertEquals(fire(files, "undefined-class"), []);
});

Deno.test("clean sample produces zero findings of any rule", () => {
  const files = [
    file("static/css/clean.css", ".ok { font-size: 1rem; color: var(--c); }"),
    file("views/clean.tsx", `<div class="ok"><p>plain</p></div>`),
    file("static/js/clean.js", "function go(){ htmx.trigger('#x','e'); }"),
  ];
  assertEquals(ids(collectRuleFindings(files)), []);
});
