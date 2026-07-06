/**
 * Cloudflare DNS sync failures must surface to the user as an error toast
 * (HX-Trigger: showToast), not only a server log. With no Cloudflare token
 * configured, syncCloudflare throws CLOUDFLARE_TOKEN_MISSING; the POST /dns/sync
 * route must map it to a human-readable error toast (machine prefix stripped).
 *
 * Bootstrap mirrors github-routes-error_test.ts: initServices(tempdir) + a
 * parent Hono mounting dnsRouter exactly as views/mod.ts does. No HTTP transport.
 */

import { assert, assertEquals } from "@std/assert";
import { Hono } from "hono";
import { dnsRouter } from "../../src/views/dns/routes.tsx";
import { initServices } from "../../src/singletons/services.ts";

Deno.test("POST /dns/sync with no token surfaces an error toast", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-dns-sync-err-" });
  initServices(dir, { cache: false });
  const app = new Hono();
  app.route("/dns", dnsRouter);

  try {
    const res = await app.request("http://localhost/dns/sync", {
      method: "POST",
    });
    // The route always returns 200 + an HX-Trigger toast (success or error).
    assertEquals(res.status, 200);
    await res.body?.cancel();

    const trigger = res.headers.get("HX-Trigger");
    assert(trigger, "sync failure must emit an HX-Trigger header");
    const payload = JSON.parse(trigger) as {
      showToast?: { type?: string; message?: string };
    };
    assertEquals(payload.showToast?.type, "error", "toast must be an error");
    const message = payload.showToast?.message ?? "";
    assert(
      /Cloudflare token not set/i.test(message),
      `friendly token-missing message expected, got: ${message}`,
    );
    assert(
      !message.includes("CLOUDFLARE_TOKEN_MISSING"),
      "machine error prefix must be stripped from the toast",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
