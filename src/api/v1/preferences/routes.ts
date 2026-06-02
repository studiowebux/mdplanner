// Preferences API routes — read and patch PersonPreferences for the current user.
// Person is resolved from the identity cookie (actor.id), falling back to the
// first human-type person when no identity is set.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppVariables } from "../../../types/app.ts";
import { PersonPreferencesSchema } from "../../../types/person.types.ts";
import { getPeopleService } from "../../../singletons/services.ts";
import { jsonContent, notFound } from "../../../types/api.ts";
import type { Person } from "../../../types/person.types.ts";

export const preferencesRouter = new OpenAPIHono<
  { Variables: AppVariables }
>();

const PreferencesResponseSchema = z.object({
  preferences: PersonPreferencesSchema.unwrap(),
}).openapi("PreferencesResponse");

// ---------------------------------------------------------------------------
// Resolve the current person from actor context, fallback to first human.
// ---------------------------------------------------------------------------

async function resolveCurrentPerson(
  actorId: string | undefined,
): Promise<Person | null> {
  const svc = getPeopleService();
  if (actorId) {
    const p = await svc.getById(actorId);
    if (p) return p;
  }
  const all = await svc.list();
  return all.find((p) => p.agentType === "human") ?? null;
}

// ---------------------------------------------------------------------------
// GET / — return current person's preferences
// ---------------------------------------------------------------------------

const getPreferencesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Preferences"],
  summary: "Get current user preferences",
  description:
    "Returns PersonPreferences for the identity-cookie person, or the first " +
    "human person when no identity is set. Returns an empty object when the " +
    "person has no preferences stored.",
  operationId: "getPreferences",
  responses: {
    200: jsonContent(PreferencesResponseSchema, "Current preferences"),
    404: { description: "No person found to resolve preferences for" },
  },
});

preferencesRouter.openapi(getPreferencesRoute, async (c) => {
  const actorId = c.var.actor?.id;
  const person = await resolveCurrentPerson(actorId);
  if (!person) return c.json(notFound("Person", actorId ?? ""), 404);
  return c.json({ preferences: person.preferences ?? {} }, 200);
});

// ---------------------------------------------------------------------------
// PATCH / — deep-merge a preferences patch into the current person's prefs
// ---------------------------------------------------------------------------

const patchPreferencesRoute = createRoute({
  method: "patch",
  path: "/",
  tags: ["Preferences"],
  summary: "Update current user preferences",
  description:
    "Deep-merges the provided patch into the existing preferences. " +
    "Object sub-keys (viewPrefs, keybindings, filterDefaults) are merged one " +
    "level deep. Arrays (pinnedNav) replace the existing value. " +
    "Omitted top-level keys are untouched.",
  operationId: "patchPreferences",
  request: {
    body: {
      content: {
        "application/json": { schema: PersonPreferencesSchema.unwrap() },
      },
      required: true,
    },
  },
  responses: {
    200: jsonContent(PreferencesResponseSchema, "Updated preferences"),
    404: { description: "No person found to update preferences for" },
  },
});

preferencesRouter.openapi(patchPreferencesRoute, async (c) => {
  const actorId = c.var.actor?.id;
  const person = await resolveCurrentPerson(actorId);
  if (!person) return c.json(notFound("Person", actorId ?? ""), 404);

  const patch = c.req.valid("json");
  const updated = await getPeopleService().updatePreferences(person.id, patch);
  if (!updated) return c.json(notFound("Person", person.id), 404);

  return c.json({ preferences: updated.preferences ?? {} }, 200);
});
