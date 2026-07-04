// MCP module descriptor + translator.
//
// Every MCP tool file declares ONE self-describing module: its feature key
// (the ENTITY_TYPE_LABELS key that gates it) and its register fn. The server
// aggregates the descriptors and this translator filters them by the project's
// enabled-features config — no central feature mapping, no per-domain special
// cases. `feature: null` = always-on infrastructure (context pack, preferences)
// that must load regardless so an agent can boot on a minimal configuration.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface McpModule {
  /** ENTITY_TYPE_LABELS feature key gating this module; null = always-on. */
  feature: string | null;
  /** Registers the module's tools onto the server. */
  register: (server: McpServer) => void;
}

/** Declare a self-describing MCP module (identity helper for co-located defs). */
export function defineMcpModule(module: McpModule): McpModule {
  return module;
}

/**
 * Translate the enabled-features config into the set of modules to register.
 * `enabledFeatures` undefined → all modules (back-compat: tests and callers
 * without a config). When provided, only always-on modules and those whose
 * feature is enabled survive — disabled modules MUST NOT load their tools.
 */
export function enabledModules(
  modules: McpModule[],
  enabledFeatures?: string[],
): McpModule[] {
  if (!enabledFeatures) return modules;
  const enabled = new Set(enabledFeatures);
  return modules.filter((m) => m.feature === null || enabled.has(m.feature));
}
