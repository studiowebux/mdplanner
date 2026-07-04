/**
 * MCP feature gating — disabled modules MUST NOT load their tools.
 * Each tools/<domain>.ts exports a self-describing module (feature + register);
 * MCP_MODULES aggregates them and enabledModules() translates the enabled-
 * features config into the set to register. Mirrors the sidebar nav gating.
 * Core infrastructure (context pack, preferences) is always-on (feature: null).
 */

import { assert, assertEquals } from "@std/assert";
import { MCP_MODULES } from "../../src/mcp/server.ts";
import { enabledModules } from "../../src/mcp/module.ts";
import { ENTITY_TYPE_LABELS } from "../../src/constants/mod.ts";

Deno.test("no arg registers every module", () => {
  assertEquals(enabledModules(MCP_MODULES).length, MCP_MODULES.length);
  assert(MCP_MODULES.length > 40, "expected the full module set");
});

Deno.test("every gated module maps to a real ENTITY_TYPE_LABELS key", () => {
  for (const m of MCP_MODULES) {
    if (m.feature === null) continue;
    assert(
      m.feature in ENTITY_TYPE_LABELS,
      `feature "${m.feature}" is not a known ENTITY_TYPE_LABELS key`,
    );
  }
});

Deno.test("enabling one feature loads it + always-on, excludes the rest", () => {
  const features = enabledModules(MCP_MODULES, ["task"]).map((m) => m.feature);
  assert(features.includes("task"), "task tools must load when enabled");
  assert(features.includes(null), "always-on infra tools must still load");
  assert(!features.includes("invoice"), "disabled invoice must NOT load");
  assert(!features.includes("quote"), "disabled quote must NOT load");
});

Deno.test("empty feature list loads only always-on infrastructure", () => {
  const mods = enabledModules(MCP_MODULES, []);
  assert(mods.length > 0, "always-on modules must still register");
  assertEquals(
    mods.every((m) => m.feature === null),
    true,
    "no gated module may load when no feature is enabled",
  );
});

Deno.test("CI (Woodpecker) is gated by its own 'ci' feature", () => {
  const withCi = enabledModules(MCP_MODULES, ["ci"]).map((m) => m.feature);
  assert(withCi.includes("ci"), "CI tools load when 'ci' is enabled");
  const withGithub = enabledModules(MCP_MODULES, ["github"]).map((m) =>
    m.feature
  );
  assert(
    !withGithub.includes("ci"),
    "CI must NOT load just because github is enabled",
  );
});
