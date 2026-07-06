/**
 * Guards CiStatusBadge (aiqfzt): the repo card footer surfaces the latest CI
 * (Woodpecker) pipeline as a status-colored pill linking to its forge URL, and
 * renders nothing when there is no pipeline. Status → variant mirrors the
 * shared badgeClass map (success=green, failure/error/killed=red,
 * running/pending=amber, everything else=neutral). Label is generic "CI".
 */

import { assert, assertEquals } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { CiStatusBadge } from "../../src/views/github/cards.tsx";
import type {
  WoodpeckerPipeline,
  WoodpeckerPipelineStatus,
} from "../../src/types/woodpecker.types.ts";

function pipeline(status: WoodpeckerPipelineStatus): WoodpeckerPipeline {
  return {
    number: 42,
    status,
    event: "push",
    branch: "main",
    message: "ci",
    author: "tommy",
    commit: "abc1234",
    createdAt: null,
    startedAt: null,
    finishedAt: null,
    forgeUrl: "https://ci.example.dev/repos/9",
  };
}

Deno.test("no pipeline renders nothing", () => {
  assertEquals(renderToString(CiStatusBadge({ pipeline: null })), "");
});

Deno.test("success pipeline renders a green CI pill linking to the forge", () => {
  const html = renderToString(CiStatusBadge({ pipeline: pipeline("success") }));
  assert(html.includes("badge--success"), "success → success variant");
  assert(html.includes("CI: success"), "label is generic CI + status");
  assert(
    html.includes('href="https://ci.example.dev/repos/9"'),
    "links to the pipeline forge URL",
  );
});

Deno.test("failure/error/killed render the red error variant", () => {
  for (const s of ["failure", "error", "killed"] as const) {
    const html = renderToString(CiStatusBadge({ pipeline: pipeline(s) }));
    assert(html.includes("badge--error"), `${s} → error variant`);
  }
});

Deno.test("running/pending render the amber warning variant", () => {
  for (const s of ["running", "pending"] as const) {
    const html = renderToString(CiStatusBadge({ pipeline: pipeline(s) }));
    assert(html.includes("badge--warning"), `${s} → warning variant`);
  }
});

Deno.test("unmapped status falls back to neutral", () => {
  const html = renderToString(CiStatusBadge({ pipeline: pipeline("skipped") }));
  assert(html.includes("badge--neutral"), "skipped → neutral default");
});
