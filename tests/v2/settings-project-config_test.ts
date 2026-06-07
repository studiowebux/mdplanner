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

    // Re-submit the form with those fields present but empty → they clear.
    await post({
      name: "My Project",
      description: "",
      locale: "",
      currency: "",
      githubToken: "",
      cloudflareToken: "",
    });

    const cleared = await getProjectService().getConfig();
    assertEquals(cleared.name, "My Project"); // required field untouched
    // The repo write omits empty values (truthy guards: `if (config.locale)`,
    // `if (config.description)`, `if (config.githubToken)`…), so every cleared
    // field reads back as undefined — the unset state. The fix's job was to send
    // "" from the handler so updateConfig overwrites the old value with empty;
    // the repo then drops it. Before the fix the handler sent undefined →
    // updateConfig skipped → old value survived.
    assertEquals(cleared.description, undefined);
    assertEquals(cleared.locale, undefined);
    assertEquals(cleared.currency, undefined);
    assertEquals(cleared.githubToken, undefined);
    assertEquals(cleared.cloudflareToken, undefined);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
