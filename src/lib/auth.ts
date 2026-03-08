/**
 * Cookie-based session authentication for the REST API.
 *
 * When --api-token is set, requests must either:
 *   1. Present a valid session cookie (obtained via POST /api/auth)
 *   2. Present an Authorization: Bearer <token> header
 *
 * Sessions are in-memory — server restart invalidates all sessions.
 */

import { timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "mdplanner_session";
const MAX_AGE = 31536000; // 1 year in seconds

/** In-memory session store. */
const sessions = new Set<string>();

export function createSession(): string {
  const id = crypto.randomUUID();
  sessions.add(id);
  return id;
}

export function validateSession(id: string): boolean {
  return sessions.has(id);
}

export function destroySession(id: string): void {
  sessions.delete(id);
}

/**
 * Constant-time token comparison to prevent timing attacks.
 * Returns false if either value is empty.
 */
export function validateToken(
  provided: string,
  expected: string,
): boolean {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
}

/** Build a Set-Cookie header value that establishes a session. */
export function setSessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}

/** Build a Set-Cookie header value that clears the session cookie. */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Extract the session ID from a Cookie header string. */
export function parseSessionCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
  );
  return match ? match[1] : null;
}

export { COOKIE_NAME };
