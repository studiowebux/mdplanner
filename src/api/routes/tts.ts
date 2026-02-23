/* tts.ts — proxy for Chatterbox TTS
 *
 * Browser-to-TTS requests are blocked by CORS since the TTS service
 * runs on a different port. These routes forward requests server-side,
 * bypassing the browser's CORS restriction.
 */
import { Hono } from "hono";

const ttsRouter = new Hono();

// POST /api/tts/synthesize — forward synthesis request to Chatterbox
ttsRouter.post("/synthesize", async (c) => {
  const body = await c.req.json<{
    ttsUrl: string;
    text: string;
    voice?: string;
    exageration?: number;
    cfg_weight?: number;
  }>();

  const { ttsUrl, text, voice, exageration, cfg_weight } = body;

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
ttsRouter.post("/voices", async (c) => {
  const body = await c.req.json<{ ttsUrl: string }>();
  const { ttsUrl } = body;

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
    return c.json(data);
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
