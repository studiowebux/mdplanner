/**
 * Settings → Project persistence (task_1780777186839).
 *
 * Locks the end-to-end save path for every project-config field the project
 * tab submits. Regression: `ProjectService.updateConfig` used to copy only a
 * subset of fields (githubToken yes; currency/locale/port/staleDays/
 * hideCompletedAfterDays/cloudflareToken no), and the POST /settings/project
 * handler never forwarded cloudflareToken — so changing those silently kept the
 * old value. Drives the REAL settingsViewRouter, then reads back via the
 * service.
 *
 * Secrets round-trip as plaintext here (MDPLANNER_SECRET_KEY unset →
 * encrypt/decryptSecret are pass-through), so the token assertion is
 * deterministic.
 *
 * Pattern: tests/v2/task-archived-ui_test.ts (viewRouter.request harness).
 */

import { assertEquals } from "@std/assert";
import { settingsViewRouter } from "../../src/views/settings/routes.tsx";
import {
  getProjectService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("Settings → Project saves every submitted field", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-settings-project-" });
  initServices(dir, { cache: false });

  try {
    const body = new URLSearchParams({
      name: "My Project",
      description: "desc",
      locale: "fr-CA",
      currency: "EUR",
      port: "9123",
      staleDays: "21",
      hideCompletedAfterDays: "7",
      githubToken: "ghp_testtoken",
      cloudflareToken: "cf_testtoken",
    });

    const res = await settingsViewRouter.request(
      new Request("http://localhost/project", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }),
    );
    assertEquals(res.status, 204);

    const config = await getProjectService().getConfig();
    assertEquals(config.name, "My Project");
    assertEquals(config.locale, "fr-CA");
    assertEquals(config.currency, "EUR");
    assertEquals(config.port, 9123);
    assertEquals(config.staleDays, 21);
    assertEquals(config.hideCompletedAfterDays, 7);
    assertEquals(config.githubToken, "ghp_testtoken");
    assertEquals(config.cloudflareToken, "cf_testtoken");

    // SECURITY: the public config (browser/API DTO) never echoes the raw
    // secrets — only presence booleans.
    const pub = await getProjectService().getPublicConfig();
    assertEquals("githubToken" in pub, false);
    assertEquals("cloudflareToken" in pub, false);
    assertEquals(pub.hasGithubToken, true);
    assertEquals(pub.hasCloudflareToken, true);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("Settings → Project clears clearable fields on empty submit", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-settings-clear-" });
  initServices(dir, { cache: false });

  async function post(fields: Record<string, string>) {
    const res = await settingsViewRouter.request(
      new Request("http://localhost/project", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fields).toString(),
      }),
    );
    assertEquals(res.status, 204);
  }

  try {
    // Seed values.
    await post({
      name: "My Project",
      description: "desc",
      locale: "fr-CA",
      currency: "EUR",
      githubToken: "ghp_testtoken",
      cloudflareToken: "cf_testtoken",
    });
    const seeded = await getProjectService().getConfig();
    assertEquals(seeded.cloudflareToken, "cf_testtoken");

    // Re-submit with non-secret fields empty (they're pre-filled, so empty ==
    // clear) but the secret fields blank WITHOUT a clear flag. SECURITY: tokens
    // are no longer echoed into the form, so a blank token submit must KEEP the
    // stored value, not wipe it.
    await post({
      name: "My Project",
      description: "",
      locale: "",
      currency: "",
      githubToken: "",
      cloudflareToken: "",
    });

    const kept = await getProjectService().getConfig();
    assertEquals(kept.name, "My Project"); // required field untouched
    // Non-secret clearable fields read back as undefined (repo truthy-guard).
    assertEquals(kept.description, undefined);
    assertEquals(kept.locale, undefined);
    assertEquals(kept.currency, undefined);
    // Secrets survive a blank submit.
    assertEquals(kept.githubToken, "ghp_testtoken");
    assertEquals(kept.cloudflareToken, "cf_testtoken");

    // Explicit Clear (hidden <field>Clear flag = "1") wipes the token.
    await post({
      name: "My Project",
      githubToken: "",
      githubTokenClear: "1",
      cloudflareToken: "",
      cloudflareTokenClear: "1",
    });
    const cleared = await getProjectService().getConfig();
    assertEquals(cleared.githubToken, undefined);
    assertEquals(cleared.cloudflareToken, undefined);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
