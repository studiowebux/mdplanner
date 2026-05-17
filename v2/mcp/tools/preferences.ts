// MCP tools for PersonPreferences — get and patch per-user preferences.
// Person is resolved by ID when provided, otherwise falls back to the first
// human-type person in the registry.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPeopleService } from "../../singletons/services.ts";
import { PersonPreferencesSchema } from "../../types/person.types.ts";
import { err, ok } from "../utils.ts";

async function resolveCurrentPerson(personId?: string) {
  const svc = getPeopleService();
  if (personId) {
    const p = await svc.getById(personId);
    if (p) return p;
  }
  const all = await svc.list();
  return all.find((p) => p.agentType === "human") ?? null;
}

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
      const person = await resolveCurrentPerson(personId);
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
      const person = await resolveCurrentPerson(personId);
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
