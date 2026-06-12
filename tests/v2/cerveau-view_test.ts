/**
 * Cerveau view suite — locks the SSR fragments. MainLayout is sync-render-unsafe,
 * so we test the exported detail sub-components (BrainDetail/RegistryDetail/
 * FilesDetail/FileContent) via toHtml, and the htmx wiring on each.
 */

import { assert } from "@std/assert";
import { toHtml } from "../../src/utils/html.ts";
import {
  BrainDetail,
  FileContent,
  FilesDetail,
  RegistryDetail,
} from "../../src/views/cerveau.tsx";
import type { CerveauPackage } from "../../src/types/cerveau.types.ts";

const corePkg: CerveauPackage = {
  name: "core",
  org: "studiowebux",
  version: "2.0.0",
  path: "_packages_/studiowebux/core/2.0.0",
  description: "Base protocol",
  files: [{ name: "phase-boot.md", type: "rules" }],
  tags: ["core"],
};

Deno.test("BrainDetail — packages resolved + brain memory", async () => {
  const html = await toHtml(
    BrainDetail({
      brain: {
        name: "mdplanner",
        path: "_brains_/mdplanner-brain",
        codebase: "/p/mdplanner",
        packages: ["studiowebux/core", "_local_/missing"],
      },
      resolved: [
        { ref: "studiowebux/core", matches: [corePkg] },
        { ref: "_local_/missing", matches: [] },
      ],
      memory: "## Brain Memory\n\n- one",
    }),
  );
  assert(html.includes("mdplanner"));
  assert(html.includes("studiowebux/core"));
  assert(html.includes("@2.0.0"));
  assert(html.includes("Not found in registry"));
  assert(html.includes("Brain Memory"));
});

Deno.test("RegistryDetail — packages + protocol-by-type", async () => {
  const html = await toHtml(
    RegistryDetail({
      packages: [corePkg],
      protocol: { rules: ["phase-boot.md"] },
    }),
  );
  assert(html.includes("studiowebux/core"));
  assert(html.includes("rules (1)"));
  assert(html.includes("phase-boot.md"));
});

Deno.test("FilesDetail — dir vs file htmx targets + parent up-link", async () => {
  const html = await toHtml(
    FilesDetail({
      path: "_packages_",
      parent: "",
      entries: [
        { name: "studiowebux", path: "_packages_/studiowebux", isDir: true },
        {
          name: "readme.md",
          path: "_packages_/readme.md",
          isDir: false,
          size: 12,
        },
      ],
    }),
  );
  // Directory rows target the whole detail; file rows target the file viewer.
  assert(
    html.includes('hx-get="/cerveau/files?path=_packages_%2Fstudiowebux"'),
  );
  assert(html.includes('hx-target="#cerveau-detail"'));
  assert(html.includes("/cerveau/file?path=_packages_%2Freadme.md"));
  assert(html.includes('hx-target="#cerveau-file-viewer"'));
  // Parent up-link present (parent === "" is not null).
  assert(html.includes('hx-get="/cerveau/files?path="'));
});

Deno.test("FileContent — read-only file body", async () => {
  const html = await toHtml(
    FileContent({ path: "version.txt", content: "1.2.0" }),
  );
  assert(html.includes("version.txt"));
  assert(html.includes("1.2.0"));
});
