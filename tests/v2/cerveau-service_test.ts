/**
 * Cerveau service suite — read-only viewer over the CURRENT cerveau layout
 * (_configs_/brains.json + registry.json, _packages_/<org>/<pkg>/<ver>/<type>/,
 * version.txt). Asserts the redesigned data model (brains reference packages;
 * registry indexes packages with files-by-type) and the traversal guard, over a
 * synthetic fixture. The base dir is resolved from ProjectConfig.cerveauDir.
 */

import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  getCerveauService,
  getProjectService,
  initServices,
} from "../../src/singletons/services.ts";

async function buildFixture(root: string) {
  await Deno.mkdir(join(root, "_configs_"), { recursive: true });
  await Deno.writeTextFile(join(root, "version.txt"), "1.2.0\n");
  await Deno.writeTextFile(
    join(root, "_configs_", "brains.json"),
    JSON.stringify({
      brains: [
        {
          name: "mdplanner",
          path: "_brains_/mdplanner-brain",
          codebase: "/tmp/mdplanner",
          packages: ["studiowebux/core", "_local_/proactive-ai"],
        },
      ],
    }),
  );
  await Deno.writeTextFile(
    join(root, "_configs_", "registry.json"),
    JSON.stringify({
      version: "1.0.0",
      packages: [
        {
          name: "core",
          org: "studiowebux",
          version: "2.0.0",
          path: "_packages_/studiowebux/core/2.0.0",
          description: "Base protocol",
          files: [
            { name: "phase-boot.md", type: "rules" },
            { name: "checkpoint-counter.sh", type: "hooks" },
            { name: "release/SKILL.md", type: "skills" },
          ],
          tags: ["core", "protocol"],
        },
        {
          name: "proactive-ai",
          org: "_local_",
          version: "2.0.0",
          path: "_packages_/_local_/proactive-ai/2.0.0",
          description: "Proactive coding",
          files: [{ name: "proactive-coding.md", type: "rules" }],
          tags: ["ai"],
        },
      ],
    }),
  );
  // A real package file (for readFile) + a brain local-dev.md (for brainMemory).
  const pkgDir = join(
    root,
    "_packages_",
    "studiowebux",
    "core",
    "2.0.0",
    "rules",
  );
  await Deno.mkdir(pkgDir, { recursive: true });
  await Deno.writeTextFile(join(pkgDir, "phase-boot.md"), "# Phase Boot\n");
  const brainWf = join(
    root,
    "_brains_",
    "mdplanner-brain",
    ".claude",
    "rules",
    "workflow",
  );
  await Deno.mkdir(brainWf, { recursive: true });
  await Deno.writeTextFile(
    join(brainWf, "local-dev.md"),
    "# Local Dev\n\nintro\n\n## Brain Memory\n\n- footgun one\n",
  );
}

Deno.test("cerveau service — current registry/packages/brains model", async (t) => {
  const projectDir = await Deno.makeTempDir({
    prefix: "mdplanner-cerveau-proj-",
  });
  const cerveauDir = await Deno.makeTempDir({
    prefix: "mdplanner-cerveau-root-",
  });
  initServices(projectDir, { cache: false });
  await buildFixture(cerveauDir);
  const svc = getCerveauService();

  try {
    await t.step("not configured until cerveauDir is set", async () => {
      assertEquals(await svc.isConfigured(), false);
    });

    await getProjectService().updateConfig({ cerveauDir });

    await t.step("isConfigured + version", async () => {
      assertEquals(await svc.isConfigured(), true);
      assertEquals(await svc.version(), "1.2.0");
    });

    await t.step("brains resolve with package references", async () => {
      const brains = await svc.brains();
      assertEquals(brains.length, 1);
      assertEquals(brains[0].name, "mdplanner");
      assertEquals(brains[0].packages, [
        "studiowebux/core",
        "_local_/proactive-ai",
      ]);
    });

    await t.step("registry + packages", async () => {
      const registry = await svc.registry();
      assert(registry !== null);
      assertEquals(registry!.packages.length, 2);
      const pkgs = await svc.packages();
      assertEquals(pkgs.map((p) => `${p.org}/${p.name}`).sort(), [
        "_local_/proactive-ai",
        "studiowebux/core",
      ]);
    });

    await t.step("packageFiles filters by type", async () => {
      assertEquals(
        await svc.packageFiles("studiowebux", "core", "2.0.0", "rules"),
        ["phase-boot.md"],
      );
      assertEquals(
        await svc.packageFiles("studiowebux", "core", undefined, "hooks"),
        ["checkpoint-counter.sh"],
      );
    });

    await t.step("protocolOverview groups names by type", async () => {
      const overview = await svc.protocolOverview();
      assertEquals(overview.rules, ["phase-boot.md", "proactive-coding.md"]);
      assertEquals(overview.hooks, ["checkpoint-counter.sh"]);
      assertEquals(overview.skills, ["release/SKILL.md"]);
    });

    await t.step("listFiles + readFile within the tree", async () => {
      const top = await svc.listFiles("");
      assert(top.some((e) => e.name === "_configs_" && e.isDir));
      assert(top.some((e) => e.name === "version.txt" && !e.isDir));
      const content = await svc.readFile(
        "_packages_/studiowebux/core/2.0.0/rules/phase-boot.md",
      );
      assertEquals(content, "# Phase Boot\n");
    });

    await t.step("brainMemory extracts the Brain Memory section", async () => {
      const mem = await svc.brainMemory("_brains_/mdplanner-brain");
      assert(mem.startsWith("## Brain Memory"));
      assert(mem.includes("footgun one"));
    });

    await t.step("traversal guard rejects escape", async () => {
      let threw = false;
      try {
        await svc.readFile("../../../etc/passwd");
      } catch {
        threw = true;
      }
      assert(
        threw,
        "readFile must reject path traversal outside the cerveau dir",
      );
    });
  } finally {
    await Deno.remove(projectDir, { recursive: true });
    await Deno.remove(cerveauDir, { recursive: true });
  }
});
