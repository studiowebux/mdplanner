/**
 * Validates the committed example/ mindmaps demo data.
 *
 * Guards the hqi5 enrichment: every mindmap must have a real title, a node
 * tree with actual depth (not a flat single level), non-empty node text, and a
 * project that resolves to a real portfolio item. Also asserts >= 2 distinct
 * projects so the data-derived project filter has options. Files are copied
 * into a temp dir so the cached repository never writes its cache back into the
 * source tree.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { MindmapRepository } from "../../src/repositories/mindmap.repository.ts";
import { PortfolioRepository } from "../../src/repositories/portfolio.repository.ts";
import type { MindmapNode } from "../../src/types/mindmap.types.ts";

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;

async function copyDir(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      await Deno.copyFile(join(src, entry.name), join(dest, entry.name));
    }
  }
}

/** Max depth of a node tree (root nodes = depth 1). */
function treeDepth(nodes: MindmapNode[]): number {
  if (nodes.length === 0) return 0;
  return 1 + Math.max(0, ...nodes.map((n) => treeDepth(n.children)));
}

/** Assert every node in the tree has non-empty text. */
function assertNodeText(nodes: MindmapNode[], title: string): void {
  for (const n of nodes) {
    assert(n.text.trim().length > 0, `mindmap "${title}" has an empty node`);
    assertNodeText(n.children, title);
  }
}

Deno.test("example mindmaps — valid deep trees and project refs", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-mindmap-" });
  await copyDir(join(EXAMPLE_DIR, "mindmaps"), join(dir, "mindmaps"));
  await copyDir(join(EXAMPLE_DIR, "portfolio"), join(dir, "portfolio"));
  try {
    const all = await new MindmapRepository(dir).findAll();
    const projectNames = new Set(
      (await new PortfolioRepository(dir).findAll()).map((p) => p.name),
    );

    assert(all.length >= 4, `expected >= 4 mindmaps, got ${all.length}`);

    const projects = new Set<string>();

    for (const m of all) {
      assert(m.title.trim().length > 0, "mindmap has an empty title");

      assert(m.nodes.length > 0, `mindmap "${m.title}" has no nodes`);
      assert(
        treeDepth(m.nodes) >= 3,
        `mindmap "${m.title}" tree is too shallow (depth ${
          treeDepth(m.nodes)
        })`,
      );
      assertNodeText(m.nodes, m.title);

      assert(
        projectNames.has(m.project),
        `mindmap "${m.title}" references unknown project "${m.project}"`,
      );
      projects.add(m.project);
    }

    assert(
      projects.size >= 2,
      `expected >= 2 distinct projects for filter variety, got ${projects.size}`,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
