/**
 * WebDAV HTTP primitives — error type, CORS headers, plain-text error
 * responses, the advertised method list, and constant-time string compare
 * (used by Basic-auth checks). All pure: no config, no state.
 */

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export const ALLOWED_METHODS =
  "OPTIONS, HEAD, GET, PUT, DELETE, MKCOL, COPY, MOVE, PROPFIND, PROPPATCH, LOCK, UNLOCK";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "OPTIONS, HEAD, GET, PUT, DELETE, MKCOL, COPY, MOVE, PROPFIND, PROPPATCH, LOCK, UNLOCK",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Depth, Destination, If, Lock-Token, Overwrite, Timeout",
    "Access-Control-Expose-Headers": "DAV, Lock-Token, ETag, Content-Range",
  };
}

export function httpErr(
  status: number,
  msg: string,
  extra?: Record<string, string>,
): Response {
  return new Response(msg, {
    status,
    headers: { "Content-Type": "text/plain", ...corsHeaders(), ...extra },
  });
}

export function safeEqual(a: string, b: string): boolean {
  const ae = new TextEncoder().encode(a);
  const be = new TextEncoder().encode(b);
  let diff = ae.length ^ be.length;
  const len = Math.max(ae.length, be.length);
  for (let i = 0; i < len; i++) diff |= (ae[i] ?? 0) ^ (be[i] ?? 0);
  return diff === 0;
}
