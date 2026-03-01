/**
 * SSE Route — GET /api/events
 * Streams change events to connected browsers via Server-Sent Events.
 * Each event: data: {"entity":"tasks","action":"updated","id":"..."}\n\n
 * Keepalive comments are sent every 30 s to prevent proxy timeouts.
 */

import { Hono } from "hono";
import { AppVariables } from "./context.ts";
import { eventBus, SSEEvent } from "../../lib/event-bus.ts";

export const eventsRouter = new Hono<{ Variables: AppVariables }>();

eventsRouter.get("/", (c) => {
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
  };

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
