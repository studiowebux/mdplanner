/**
 * Cerveau API suite — locks the read-only viewer routes (api/v1/cerveau). The
 * router is always mounted; each handler 404s with CERVEAU_NOT_FOUND until a
 * cerveau dir is configured via ProjectConfig.cerveauDir, then serves the
 * current registry/packages/brains model over a synthetic fixture.
 */

import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import { cerveauApiRouter } from "../../src/api/v1/cerveau/routes.ts";
import {
  getProjectService,
  initServices,
} from "../../src/singletons/services.ts";

async function buildFixture(root: string) {
  await Deno.mkdir(join(root, "_configs_"), { recursive: true });
  await Deno.writeTextFile(join(root, "version.txt"), "1.2.0\n");
  await Deno.writeTextFile(
    join(root, "_configs_", "brains.json"),
    JSON.stringify({
      brains: [{
        name: "mdplanner",
        path: "_brains_/mdplanner-brain",
        codebase: "/tmp/mdplanner",
        packages: ["studiowebux/core"],
      }],
    }),
  );
  await Deno.writeTextFile(
    join(root, "_configs_", "registry.json"),
    JSON.stringify({
      version: "1.0.0",
      packages: [{
        name: "core",
        org: "studiowebux",
        version: "2.0.0",
        path: "_packages_/studiowebux/core/2.0.0",
        description: "Base protocol",
        files: [{ name: "phase-boot.md", type: "rules" }],
        tags: ["core"],
      }],
    }),
  );
}

Deno.test("cerveau API — gated read-only viewer routes", async (t) => {
  const projectDir = await Deno.makeTempDir({
    prefix: "mdplanner-cerveau-api-",
  });
  const cerveauDir = await Deno.makeTempDir({
    prefix: "mdplanner-cerveau-root-",
  });
  initServices(projectDir, { cache: false });
  await buildFixture(cerveauDir);

  try {
    await t.step("404 CERVEAU_NOT_FOUND before configuration", async () => {
      const res = await cerveauApiRouter.request("/brains");
      assertEquals(res.status, 404);
      const body = await res.json();
      assertEquals(body.error, "CERVEAU_NOT_FOUND");
    });

    await getProjectService().updateConfig({ cerveauDir });

    await t.step("GET /version", async () => {
      const res = await cerveauApiRouter.request("/version");
      assertEquals(res.status, 200);
      assertEquals((await res.json()).version, "1.2.0");
    });

    await t.step("GET /brains", async () => {
      const res = await cerveauApiRouter.request("/brains");
      assertEquals(res.status, 200);
      const brains = await res.json();
      assertEquals(brains.length, 1);
      assertEquals(brains[0].packages, ["studiowebux/core"]);
    });

    await t.step("GET /registry + /packages + /protocol", async () => {
      const reg = await (await cerveauApiRouter.request("/registry")).json();
      assertEquals(reg.packages.length, 1);
      const pkgs = await (await cerveauApiRouter.request("/packages")).json();
      assertEquals(pkgs[0].org, "studiowebux");
      const proto = await (await cerveauApiRouter.request("/protocol")).json();
      assertEquals(proto.rules, ["phase-boot.md"]);
    });

    await t.step(
      "GET /brains/{name}/memory 404 for unknown brain",
      async () => {
        const res = await cerveauApiRouter.request("/brains/nope/memory");
        assertEquals(res.status, 404);
      },
    );

    await t.step("GET /file?path= returns plain text", async () => {
      const res = await cerveauApiRouter.request(
        "/file?path=" + encodeURIComponent("version.txt"),
      );
      assertEquals(res.status, 200);
      assert(res.headers.get("Content-Type")?.includes("text/plain"));
      assertEquals((await res.text()).trim(), "1.2.0");
    });

    await t.step("GET /files lists the tree root", async () => {
      const res = await cerveauApiRouter.request("/files");
      assertEquals(res.status, 200);
      const entries = await res.json();
      assert(entries.some((e: { name: string }) => e.name === "_configs_"));
    });
  } finally {
    await Deno.remove(projectDir, { recursive: true });
    await Deno.remove(cerveauDir, { recursive: true });
  }
});
