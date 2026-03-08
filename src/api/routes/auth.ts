/**
 * Authentication routes — POST /auth, POST /auth/logout, GET /auth/check.
 *
 * Registered only when --api-token is configured.
 */

import { Hono } from "hono";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  parseSessionCookie,
  setSessionCookie,
  validateSession,
  validateToken,
} from "../../lib/auth.ts";

export function createAuthRouter(
  apiToken: string,
): Hono {
  const router = new Hono();

  /** Exchange the API token for a session cookie. */
  router.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    const provided = body?.token;
    if (!provided || !validateToken(provided, apiToken)) {
      return c.json(
        { error: "INVALID_TOKEN", message: "Invalid API token" },
        401,
      );
    }
    const sessionId = createSession();
    c.header("Set-Cookie", setSessionCookie(sessionId));
    return c.json({ ok: true });
  });

  /** Destroy the current session. */
  router.post("/logout", (c) => {
    const cookie = c.req.header("Cookie") ?? "";
    const sessionId = parseSessionCookie(cookie);
    if (sessionId) destroySession(sessionId);
    c.header("Set-Cookie", clearSessionCookie());
    return c.json({ ok: true });
  });

  /** Check whether the caller has a valid session or bearer token. */
  router.get("/check", (c) => {
    // Bearer token check
    const authHeader = c.req.header("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (validateToken(token, apiToken)) {
        return c.json({ authenticated: true });
      }
    }

    // Session cookie check
    const cookie = c.req.header("Cookie") ?? "";
    const sessionId = parseSessionCookie(cookie);
    if (sessionId && validateSession(sessionId)) {
      return c.json({ authenticated: true });
    }

    return c.json(
      { error: "NOT_AUTHENTICATED", message: "Authentication required" },
      401,
    );
  });

  return router;
}
