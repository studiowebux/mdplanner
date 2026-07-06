/**
 * tests/v2/analyze-style_test.ts
 *
 * Per-rule fixtures for the analyzer's style dimension (scripts/analyze/style.ts).
 * Each test feeds a tiny in-memory file and asserts the expected rule fires (and
 * a clean sample fires nothing). Locks the owner policy: rem/em + var(--*) only,
 * variables.css is the sanctioned literal store, breakpoint px is heuristic.
 */

import { assertEquals } from "@std/assert";
import { collectStyleFindings } from "../../scripts/analyze/style.ts";
import type { Finding, RuleFile } from "../../scripts/analyze/rules.ts";

function file(rel: string, text: string): RuleFile {
  const dot = rel.lastIndexOf(".");
  return { rel, ext: rel.slice(dot), text, isTest: false };
}

function fire(files: RuleFile[], ruleId: string): Finding[] {
  return collectStyleFindings(files).filter((f) => f.ruleId === ruleId);
}

Deno.test("hardcoded-color: flags hex/rgb in a declaration, high-confidence", () => {
  const css = ".a { color: #ff0000; border: 1px solid rgb(0,0,0); }";
  const hits = fire([file("static/css/a.css", css)], "hardcoded-color");
  assertEquals(hits.length, 2);
  assertEquals(hits[0].confidence, "high");
});

Deno.test("hardcoded-color: exempts variables.css and var()/--token defs", () => {
  const tokens = ":root { --color-x: #ff0000; }";
  const consumer = ".a { color: var(--color-x); }";
  assertEquals(
    fire([file("static/css/variables.css", tokens)], "hardcoded-color"),
    [],
  );
  assertEquals(
    fire([file("static/css/consumer.css", consumer)], "hardcoded-color"),
    [],
  );
});

Deno.test("raw-px: flags px in a declaration value, high-confidence", () => {
  const css = ".a { padding: 8px; width: 1px; }";
  const hits = fire([file("static/css/a.css", css)], "raw-px");
  assertEquals(hits.length, 2);
  assertEquals(hits[0].confidence, "high");
});

Deno.test("raw-px: exempts variables.css, --token defs, and font-size (font-floor owns)", () => {
  const tokens = ":root { --space: 8px; }";
  const consumer = ".a { font-size: 14px; }"; // owned by --rules font-below-floor
  assertEquals(fire([file("static/css/variables.css", tokens)], "raw-px"), []);
  assertEquals(fire([file("static/css/c.css", consumer)], "raw-px"), []);
});

Deno.test("raw-px: catches negative px (margin: -1px, top: -9999px)", () => {
  const css = ".a { margin: -1px; top: -9999px; }";
  const hits = fire([file("static/css/a.css", css)], "raw-px");
  assertEquals(hits.length, 2);
});

Deno.test("raw-px: rem/em values are clean", () => {
  const css = ".a { padding: 0.5rem; margin: 1em; gap: var(--space); }";
  assertEquals(fire([file("static/css/a.css", css)], "raw-px"), []);
});

Deno.test("media-breakpoint-px: heuristic candidate, never high", () => {
  const css = "@media (max-width: 768px) { .a { display: none; } }";
  const hits = fire([file("static/css/a.css", css)], "media-breakpoint-px");
  assertEquals(hits.length, 1);
  assertEquals(hits[0].confidence, "heuristic");
});

Deno.test("inline-style: flags style= attribute, not identifier suffixes", () => {
  const tsx = `<div style={x}><Card borderStyle={y} /></div>`;
  const hits = fire([file("views/x.tsx", tsx)], "inline-style");
  assertEquals(hits.length, 1);
  assertEquals(hits[0].confidence, "high");
});

Deno.test("inline-style: exempts custom-property-only style (feeds the token system)", () => {
  const tsx = "<span style={`--ratio:${r}`} />";
  assertEquals(fire([file("views/x.tsx", tsx)], "inline-style"), []);
});

Deno.test("inline-style: exempts multi-line custom-prop style, keeps spread untouched", () => {
  const tsx = [
    "<span",
    "  style={ratio !== undefined",
    "    ? `--habit-ratio:${ratio.toFixed(3)}`",
    "    : undefined}",
    '  {...(done ? { "hx-post": "/x" } : {})}',
    "/>",
  ].join("\n");
  assertEquals(fire([file("views/x.tsx", tsx)], "inline-style"), []);
});

Deno.test("inline-style: still flags a standard property and bare indirection", () => {
  const standard = `<span style="color:red" />`;
  const indirect = `<div style={x} />`;
  assertEquals(fire([file("views/a.tsx", standard)], "inline-style").length, 1);
  assertEquals(fire([file("views/b.tsx", indirect)], "inline-style").length, 1);
});

Deno.test("inline-script: flags inline <script> body + on*= handler", () => {
  const tsx = [
    `<script>doThing()</script>`,
    `<button onclick="go()">x</button>`,
  ].join("\n");
  const hits = fire([file("views/x.tsx", tsx)], "inline-script");
  assertEquals(hits.length, 2);
  assertEquals(hits[0].confidence, "high");
});

Deno.test("inline-script: exempts external src + nonce'd <script>", () => {
  const tsx = [
    `<script src={asset("/js/init.js")} nonce={nonce} />`,
    `<script src="/js/x.js" />`,
  ].join("\n");
  assertEquals(fire([file("views/x.tsx", tsx)], "inline-script"), []);
});

Deno.test("clean sample produces zero style findings", () => {
  const files = [
    file("static/css/clean.css", ".ok { padding: 0.5rem; color: var(--c); }"),
    file("views/clean.tsx", `<div class="ok"><p>plain</p></div>`),
  ];
  assertEquals(collectStyleFindings(files), []);
});
