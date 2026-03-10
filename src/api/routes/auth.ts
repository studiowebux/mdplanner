/**
 * Authentication routes — POST /auth, POST /auth/logout, GET /auth/check.
 *
 * Registered only when --api-token is configured.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  parseSessionCookie,
  setSessionCookie,
  validateSession,
  validateToken,
} from "../../lib/auth.ts";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
}).openapi("AuthError");

const loginRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Core"],
  summary: "Exchange API token for session cookie",
  operationId: "login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            token: z.string().min(1).openapi({
              description: "API token configured via --api-token",
            }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ ok: z.boolean() }),
        },
      },
      description: "Session created, cookie set",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid API token",
    },
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Core"],
  summary: "Destroy current session",
  operationId: "logout",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ ok: z.boolean() }),
        },
      },
      description: "Session destroyed, cookie cleared",
    },
  },
});

const checkRoute = createRoute({
  method: "get",
  path: "/check",
  tags: ["Core"],
  summary: "Verify authentication status",
  operationId: "authCheck",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ authenticated: z.boolean() }).openapi(
            "AuthCheckResponse",
          ),
        },
      },
      description: "Authenticated",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not authenticated",
    },
  },
});

export function createAuthRouter(
  apiToken: string,
): OpenAPIHono {
  const router = new OpenAPIHono();

  router.openapi(loginRoute, async (c) => {
    const { token } = c.req.valid("json");
    if (!validateToken(token, apiToken)) {
      return c.json(
        { error: "INVALID_TOKEN", message: "Invalid API token" },
        401,
      );
    }
    const sessionId = createSession();
    c.header("Set-Cookie", setSessionCookie(sessionId));
    return c.json({ ok: true }, 200);
  });

  router.openapi(logoutRoute, (c) => {
    const cookie = c.req.header("Cookie") ?? "";
    const sessionId = parseSessionCookie(cookie);
    if (sessionId) destroySession(sessionId);
    c.header("Set-Cookie", clearSessionCookie());
    return c.json({ ok: true }, 200);
  });

  router.openapi(checkRoute, (c) => {
    const authHeader = c.req.header("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (validateToken(token, apiToken)) {
        return c.json({ authenticated: true }, 200);
      }
    }

    const cookie = c.req.header("Cookie") ?? "";
    const sessionId = parseSessionCookie(cookie);
    if (sessionId && validateSession(sessionId)) {
      return c.json({ authenticated: true }, 200);
    }

    return c.json(
      { error: "NOT_AUTHENTICATED", message: "Authentication required" },
      401,
    );
  });

  return router;
}
