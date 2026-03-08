/**
 * SSE Route — GET /api/events
 * Streams change events to connected browsers via Server-Sent Events.
 * Each event: data: {"entity":"tasks","action":"updated","id":"..."}\n\n
 * Keepalive comments are sent every 30 s to prevent proxy timeouts.
 * Per-IP connection limit prevents resource exhaustion (max 10 concurrent).
 */

import { Hono } from "hono";
import { AppVariables } from "./context.ts";
import { eventBus, SSEEvent } from "../../lib/event-bus.ts";

export const eventsRouter = new Hono<{ Variables: AppVariables }>();

/** Maximum concurrent SSE connections per IP address. */
const MAX_SSE_PER_IP = 10;

/**
 * Per-IP SSE connection tracker.
 * Each entry stores cleanup functions ordered oldest-first so the oldest
 * connection can be evicted when the limit is exceeded.
 */
const sseConnections = new Map<string, Array<() => void>>();

eventsRouter.get("/", (c) => {
  const ip = c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    c.req.header("X-Real-IP") ?? "unknown";

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const write = (chunk: string): void => {
    writer.write(encoder.encode(chunk)).catch(() => {
      cleanup();
    });
  };

  const handler = (event: SSEEvent): void => {
    write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const keepalive = setInterval(() => {
    write(": keepalive\n\n");
  }, 30_000);

  const cleanup = (): void => {
    clearInterval(keepalive);
    eventBus.unsubscribe(handler);
    writer.close().catch(() => {});

    // Remove this connection from the per-IP tracker
    const conns = sseConnections.get(ip);
    if (conns) {
      const idx = conns.indexOf(cleanup);
      if (idx !== -1) conns.splice(idx, 1);
      if (conns.length === 0) sseConnections.delete(ip);
    }
  };

  // Evict oldest connection if limit exceeded — pattern: connection limiter
  if (!sseConnections.has(ip)) {
    sseConnections.set(ip, []);
  }
  const conns = sseConnections.get(ip)!;
  while (conns.length >= MAX_SSE_PER_IP) {
    const oldest = conns.shift();
    oldest?.();
  }
  conns.push(cleanup);

  eventBus.subscribe(handler);

  c.req.raw.signal.addEventListener("abort", cleanup);

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
