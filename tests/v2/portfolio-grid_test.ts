/**
 * Portfolio Grid view — grouping helper + card/category render.
 * The grid groups non-archived items Client → Category as status-coloured
 * cards. Verifies: archived exclusion, "No client" bucket sorted last,
 * alphabetical categories, "Uncategorized" fallback, name-sorted items, and
 * that ProjectCard/CategoryBox render the name, link, status variant class.
 * Build ticket task_1781387420081_u9yph1.
 */

import { assert, assertEquals } from "@std/assert";
import {
  GRID_NO_CLIENT,
  GRID_UNCATEGORIZED,
  groupPortfolioByClient,
} from "../../src/views/portfolio/helpers.ts";
import { CategoryBox, ProjectCard } from "../../src/views/portfolio-grid.tsx";
import type {
  PortfolioItem,
  PortfolioStatus,
} from "../../src/types/portfolio.types.ts";

/** Render an intrinsic-root JSX node (anchor/div) to its HTML string. */
async function render(node: unknown): Promise<string> {
  if (node == null) return "";
  return String(await (node as { toString(): unknown }).toString());
}

function makeItem(
  partial: Partial<PortfolioItem> & { id: string; name: string },
): PortfolioItem {
  return {
    status: "active" as PortfolioStatus,
    category: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  } as PortfolioItem;
}

Deno.test("groupPortfolioByClient excludes archived items", () => {
  const groups = groupPortfolioByClient([
    makeItem({ id: "1", name: "Live", client: "Acme" }),
    makeItem({ id: "2", name: "Gone", client: "Acme", archived: true }),
  ]);
  assertEquals(groups.length, 1);
  const items = groups[0].categories.flatMap((c) => c.items);
  assertEquals(items.map((i) => i.id), ["1"]);
});

Deno.test("groupPortfolioByClient puts 'No client' bucket last", () => {
  const groups = groupPortfolioByClient([
    makeItem({ id: "1", name: "X" }), // no client
    makeItem({ id: "2", name: "Y", client: "Zeta" }),
    makeItem({ id: "3", name: "Z", client: "Acme" }),
  ]);
  assertEquals(groups.map((g) => g.client), [
    "Acme",
    "Zeta",
    GRID_NO_CLIENT,
  ]);
});

Deno.test("groupPortfolioByClient sorts categories alphabetically with Uncategorized fallback", () => {
  const groups = groupPortfolioByClient([
    makeItem({ id: "1", name: "A", client: "Acme", category: "Web" }),
    makeItem({ id: "2", name: "B", client: "Acme" }), // empty category
    makeItem({ id: "3", name: "C", client: "Acme", category: "Mobile" }),
  ]);
  assertEquals(groups.length, 1);
  assertEquals(groups[0].categories.map((c) => c.category), [
    "Mobile",
    GRID_UNCATEGORIZED,
    "Web",
  ]);
});

Deno.test("groupPortfolioByClient sorts items within a category by name", () => {
  const groups = groupPortfolioByClient([
    makeItem({ id: "1", name: "Beta", client: "Acme", category: "Web" }),
    makeItem({ id: "2", name: "Alpha", client: "Acme", category: "Web" }),
  ]);
  assertEquals(
    groups[0].categories[0].items.map((i) => i.name),
    ["Alpha", "Beta"],
  );
});

Deno.test("ProjectCard renders name, detail link, and status variant class", async () => {
  const html = await render(
    ProjectCard({
      item: makeItem({ id: "p1", name: "Acme Portal", status: "active" }),
    }),
  );
  assert(html.includes("Acme Portal"), "card shows the project name");
  assert(
    html.includes('href="/portfolio/p1"'),
    "card links to the detail page",
  );
  assert(
    html.includes("portfolio-grid__card--accent"),
    "active status maps to the accent variant class",
  );
});

Deno.test("CategoryBox renders the category label, count, and its cards", async () => {
  const html = await render(
    CategoryBox({
      category: "Web",
      items: [
        makeItem({ id: "a", name: "One" }),
        makeItem({ id: "b", name: "Two" }),
      ],
    }),
  );
  assert(html.includes("Web"), "shows the category label");
  assert(html.includes(">2<"), "shows the item count");
  assert(html.includes("One") && html.includes("Two"), "renders both cards");
});
