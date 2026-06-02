// Identity resolution — pure functions, no service/repo imports.
// contextMiddleware calls these with already-resolved config data.
//
// Resolution order:
//   1. X-Api-Key header  → matched against project.md api_keys (passed in)
//   2. mdp_identity cookie → verified against MDPLANNER_SECRET_KEY when set,
//                            plain read when no secret is configured
//   3. fallback            → anonymous
//
// Cookie security:
//   When MDPLANNER_SECRET_KEY is set: cookie is HMAC-signed (setSignedCookie /
//   getSignedCookie). A tampered cookie returns false → actor is anonymous.
//   When the key is not set: plain cookie, no tamper detection. Same transparent
//   fallback pattern as encryptSecret/decryptSecret in secrets.ts.

import { getCookie, getSignedCookie } from "hono/cookie";
import { parseJson } from "../database/sqlite/mod.ts";
import type { ApiKey } from "../types/project.types.ts";
import type { AppContext } from "../types/app.ts";
import { type Actor, ANONYMOUS_ACTOR } from "../types/actor.ts";

export const IDENTITY_COOKIE = "mdp_identity";

export function resolveActorFromApiKey(
  key: string,
  apiKeys: ApiKey[],
): Actor | null {
  const match = apiKeys.find((k) => k.key === key);
  if (!match) return null;
  return { name: match.name, source: "apikey" };
}

export async function resolveActorFromCookie(
  c: AppContext,
  secret: string,
): Promise<Actor | null> {
  let raw: string | false | undefined;

  if (secret) {
    // Signed cookie — false means tampered, undefined means not set.
    raw = await getSignedCookie(c, secret, IDENTITY_COOKIE);
    if (raw === false) return null; // tampered → reject
  } else {
    // No secret configured — plain cookie, no tamper detection.
    raw = getCookie(c, IDENTITY_COOKIE);
  }

  if (!raw) return null;

  const parsed = parseJson<{ name?: string; id?: string }>(raw);
  if (!parsed || typeof parsed.name !== "string" || !parsed.name.trim()) {
    return null;
  }

  return {
    name: parsed.name.trim(),
    id: typeof parsed.id === "string" ? parsed.id : undefined,
    source: "cookie",
  };
}

export async function resolveActor(
  c: AppContext,
  apiKeys: ApiKey[],
  secret: string,
): Promise<Actor> {
  const apiKeyHeader = c.req.header("X-Api-Key");
  if (apiKeyHeader) {
    const actor = resolveActorFromApiKey(apiKeyHeader, apiKeys);
    if (actor) return actor;
  }

  const cookieActor = await resolveActorFromCookie(c, secret);
  if (cookieActor) return cookieActor;

  return ANONYMOUS_ACTOR;
}
