/* tts.ts — proxy for Chatterbox TTS
 *
 * Browser-to-TTS requests are blocked by CORS since the TTS service
 * runs on a different port. These routes forward requests server-side,
 * bypassing the browser's CORS restriction.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const SuccessSchema = z.object({ success: z.boolean() });

const ttsRouter = new OpenAPIHono();

// POST /api/tts/synthesize — forward synthesis request to Chatterbox
const synthesizeRoute = createRoute({
  method: "post",
  path: "/synthesize",
  tags: ["TTS"],
  summary: "Synthesize speech via Chatterbox TTS proxy",
  operationId: "ttsSynthesize",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            ttsUrl: z.string(),
            text: z.string(),
            voice: z.string().optional(),
            exageration: z.number().optional(),
            cfg_weight: z.number().optional(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "audio/wav": { schema: z.any() } },
      description: "Audio data from Chatterbox",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing ttsUrl",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Upstream TTS error",
    },
  },
});

ttsRouter.openapi(synthesizeRoute, async (c) => {
  const { ttsUrl, text, voice, exageration, cfg_weight } = c.req.valid("json");

  if (!ttsUrl) {
    return c.json(
      { error: "TTS_URL_REQUIRED", message: "ttsUrl is required" },
      400,
    );
  }

  const base = ttsUrl.replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/tts/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, exageration, cfg_weight }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[tts] upstream ${res.status}: ${errText}`);
      return c.json(
        {
          error: "TTS_REQUEST_FAILED",
          upstream_status: res.status,
          message: errText || `Chatterbox returned ${res.status}`,
        },
        502,
      );
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "audio/wav",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    console.error(`[tts] connection error: ${msg}`);
    return c.json({ error: "TTS_CONNECTION_FAILED", message: msg }, 502);
  }
});

// POST /api/tts/voices — forward voices list request to Chatterbox
const voicesRoute = createRoute({
  method: "post",
  path: "/voices",
  tags: ["TTS"],
  summary: "List available TTS voices from Chatterbox",
  operationId: "ttsListVoices",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            ttsUrl: z.string(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "List of available voices",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing ttsUrl",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Upstream TTS error",
    },
  },
});

ttsRouter.openapi(voicesRoute, async (c) => {
  const { ttsUrl } = c.req.valid("json");

  if (!ttsUrl) {
    return c.json(
      { error: "TTS_URL_REQUIRED", message: "ttsUrl is required" },
      400,
    );
  }

  const base = ttsUrl.replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/tts/voices`);

    if (!res.ok) {
      return c.json({ error: "TTS_REQUEST_FAILED" }, 502);
    }

    const data = await res.json();
    return c.json(data, 200);
  } catch (err) {
    return c.json(
      {
        error: "TTS_CONNECTION_FAILED",
        message: err instanceof Error ? err.message : "Connection failed",
      },
      502,
    );
  }
});

export { ttsRouter };
