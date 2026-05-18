/**
 * Unit tests for v2 Brief — form parsing + repository CRUD round-trip.
 *
 * Regression focus: the brief edit form rendered every section (including the
 * RACI fields) as a free-text textarea, and briefConfig parsed the body
 * without `splitTextarea`. Section fields therefore parsed to a plain string
 * while the schema, cache, and `buildBody()` all require `string[]` — so the
 * RACI matrix (and every other section) could not be modified after creation.
 *
 * Fix: RACI sections are `tags` fields backed by the `people-names`
 * autocomplete; briefConfig parses with `splitTextarea: true`. Both the tags
 * and textarea paths now yield `string[]`.
 */

import { assertEquals, assertExists } from "@std/assert";
import { briefConfig } from "../../v2/domains/brief/config.tsx";
import { BriefRepository } from "../../v2/repositories/brief.repository.ts";

async function setup(): Promise<{ repo: BriefRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-brief-test-" });
  const repo = new BriefRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

Deno.test("briefConfig.parseCreate - RACI tags and textarea sections parse to string[]", () => {
  const parsed = briefConfig.parseCreate({
    title: "Beta Launch Brief",
    summary: "Line one\nLine two",
    responsible: "Alice Martin,Bob Lee",
    accountable: "Carol Diaz",
  });
  assertEquals(parsed.title, "Beta Launch Brief");
  assertEquals(parsed.summary, ["Line one", "Line two"]);
  assertEquals(parsed.responsible, ["Alice Martin", "Bob Lee"]);
  assertEquals(parsed.accountable, ["Carol Diaz"]);
});

Deno.test("briefConfig.parseUpdate - RACI fields are editable as string[] after creation", () => {
  const parsed = briefConfig.parseUpdate({
    responsible: "Alice Martin,Carol Diaz",
    consulted: "Dana Reed",
    summary: "Revised summary",
  });
  assertEquals(parsed.responsible, ["Alice Martin", "Carol Diaz"]);
  assertEquals(parsed.consulted, ["Dana Reed"]);
  assertEquals(parsed.summary, ["Revised summary"]);
});

Deno.test("briefConfig.parseUpdate - empty RACI field clears the value", () => {
  const parsed = briefConfig.parseUpdate({ responsible: "" });
  assertEquals(parsed.responsible, null);
});

Deno.test("BriefRepository - RACI sections survive create round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const brief = await repo.create({
      title: "Beta Launch Brief",
      summary: ["Ship the beta"],
      responsible: ["Alice Martin"],
      accountable: ["Bob Lee"],
      consulted: ["Carol Diaz", "Dana Reed"],
      informed: ["Eve Stone"],
    });
    assertExists(brief.id);
    const fetched = await repo.findById(brief.id);
    assertExists(fetched);
    assertEquals(fetched!.responsible, ["Alice Martin"]);
    assertEquals(fetched!.accountable, ["Bob Lee"]);
    assertEquals(fetched!.consulted, ["Carol Diaz", "Dana Reed"]);
    assertEquals(fetched!.informed, ["Eve Stone"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BriefRepository - update modifies RACI matrix and preserves siblings", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Beta Launch Brief",
      summary: ["Ship the beta"],
      responsible: ["Alice Martin"],
      accountable: ["Bob Lee"],
    });
    await repo.update(created.id, {
      responsible: ["Alice Martin", "Carol Diaz"],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.responsible, ["Alice Martin", "Carol Diaz"]);
    assertEquals(fetched!.accountable, ["Bob Lee"]);
    assertEquals(fetched!.summary, ["Ship the beta"]);
  } finally {
    await cleanup(dir);
  }
});
