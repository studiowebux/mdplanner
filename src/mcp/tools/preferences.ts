// MCP tools for PersonPreferences — get and patch per-user preferences.
// Person is resolved by ID when provided, otherwise falls back to the first
// human-type person in the registry.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { z } from "zod";
import { getPeopleService } from "../../singletons/services.ts";
import { resolveActivePerson } from "../../utils/actor.ts";
import { PersonPreferencesSchema } from "../../types/person.types.ts";
import { err, ok } from "../utils.ts";

export function registerPreferenceTools(server: McpServer): void {
  const svc = getPeopleService();

  // ── get_preferences ──────────────────────────────────────────────────
  server.registerTool(
    "get_preferences",
    {
      description:
        "Get PersonPreferences for the current user. Pass personId to scope " +
        "to a specific person; omit to use the first human-type person.",
      inputSchema: {
        personId: z.string().optional().describe(
          "Person ID — omit to use the first human person",
        ),
      },
    },
    async ({ personId }) => {
      const person = await resolveActivePerson(personId);
      if (!person) return err("No person found to resolve preferences for");
      return ok({ personId: person.id, preferences: person.preferences ?? {} });
    },
  );

  // ── update_preferences ───────────────────────────────────────────────
  server.registerTool(
    "update_preferences",
    {
      description:
        "Deep-merge a PersonPreferences patch for the current user. " +
        "Object sub-keys (viewPrefs, keybindings, filterDefaults) are merged " +
        "one level deep; arrays (pinnedNav) replace the existing value. " +
        "Pass personId to scope to a specific person.",
      inputSchema: {
        personId: z.string().optional().describe(
          "Person ID — omit to use the first human person",
        ),
        preferences: PersonPreferencesSchema.unwrap().describe(
          "Partial preferences patch to deep-merge",
        ),
      },
    },
    async ({ personId, preferences }) => {
      const person = await resolveActivePerson(personId);
      if (!person) return err("No person found to update preferences for");
      const updated = await svc.updatePreferences(person.id, preferences);
      if (!updated) return err(`Person '${person.id}' not found after update`);
      return ok({
        personId: updated.id,
        preferences: updated.preferences ?? {},
      });
    },
  );
}

export const preferenceModule = defineMcpModule({
  feature: null,
  register: registerPreferenceTools,
});
