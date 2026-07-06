// CSP guard: htmx `hx-on:*` handlers compile to new Function(), which our
// nonce-only CSP (no 'unsafe-eval') refuses — they throw EvalError and silently
// do nothing. They were replaced with declarative data-* hooks driven by
// delegated listeners in static/js/htmx-triggers.js. This test prevents any
// hx-on attribute from creeping back into the app source.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { DetailActions } from "../../src/views/components/detail-actions.tsx";

async function collectSource(dir: string, acc: string[]): Promise<void> {
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      if (entry.name === "vendor") continue; // skip vendored libs (htmx etc.)
      await collectSource(path, acc);
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      acc.push(path);
    }
  }
}

Deno.test("no hx-on attributes anywhere in src/ (CSP unsafe-eval)", async () => {
  const files: string[] = [];
  await collectSource(new URL("../../src", import.meta.url).pathname, files);
  const offenders: string[] = [];
  for (const file of files) {
    const text = await Deno.readFile(file);
    if (new TextDecoder().decode(text).includes("hx-on")) offenders.push(file);
  }
  assertEquals(
    offenders,
    [],
    `hx-on found (CSP forbids it — use data-* hooks in htmx-triggers.js): ${
      offenders.join(", ")
    }`,
  );
});

Deno.test("DetailActions emits data-redirect-on-success, never hx-on", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    DetailActions({
      entity: "goals",
      id: "goal_1",
      title: "My Goal",
      formContainerId: "goal-form",
      onDeleteRedirect: "/goals",
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, 'data-redirect-on-success="/goals"');
  assertEquals(html.includes("hx-on"), false);
});
