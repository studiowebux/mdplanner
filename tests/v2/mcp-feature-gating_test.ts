/**
 * MCP feature gating — disabled modules MUST NOT load their tools.
 * createMcpServer(enabledFeatures) registers only always-on infrastructure
 * (context pack, preferences) plus modules whose feature key is enabled,
 * mirroring the sidebar nav gating. No arg → all modules (back-compat).
 * Bug: the server previously registered every domain unconditionally.
 */

import { assert, assertEquals } from "@std/assert";
import { enabledToolModules } from "../../src/mcp/server.ts";
import { ENTITY_TYPE_LABELS } from "../../src/constants/mod.ts";

Deno.test("no arg registers every tool module", () => {
  const all = enabledToolModules();
  assert(all.length > 40, "expected the full module set");
});

Deno.test("every gated module maps to a real ENTITY_TYPE_LABELS key", () => {
  for (const m of enabledToolModules()) {
    if (m.feature === null) continue;
    assert(
      m.feature in ENTITY_TYPE_LABELS,
      `feature "${m.feature}" is not a known ENTITY_TYPE_LABELS key`,
    );
  }
});

Deno.test("enabling one feature loads it + always-on, excludes the rest", () => {
  const features = enabledToolModules(["task"]).map((m) => m.feature);
  assert(features.includes("task"), "task tools must load when enabled");
  assert(features.includes(null), "always-on infra tools must still load");
  assert(!features.includes("invoice"), "disabled invoice must NOT load");
  assert(!features.includes("quote"), "disabled quote must NOT load");
});

Deno.test("empty feature list loads only always-on infrastructure", () => {
  const mods = enabledToolModules([]);
  assert(mods.length > 0, "always-on modules must still register");
  assertEquals(
    mods.every((m) => m.feature === null),
    true,
    "no gated module may load when no feature is enabled",
  );
});
