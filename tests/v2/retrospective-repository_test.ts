/**
 * Unit tests for v2 RetrospectiveRepository (CRUD on disk).
 *
 * Regression focus: id and title live in RETROSPECTIVE_BODY_KEYS, so
 * serialize() writes the id via the filename and the title as the body
 * `# heading` — never to frontmatter. parse() must still recognise such a
 * file. A guard that required fm.id/fm.title made every retrospective
 * unreadable (GET /:id/edit → 404) after its first update.
 */

import { assertEquals, assertExists } from "@std/assert";
import { RetrospectiveRepository } from "../../src/repositories/retrospective.repository.ts";

async function setup(): Promise<
  { repo: RetrospectiveRepository; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-retro-test-" });
  const repo = new RetrospectiveRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

Deno.test("RetrospectiveRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const retro = await repo.create({
      title: "Sprint 1 Retrospective",
      date: "2026-01-31",
      status: "open",
      continue: ["Pairing sessions"],
      stop: ["Late code review"],
      start: ["Daily standup notes"],
      participants: ["Alice Martin"],
    });
    assertExists(retro.id);
    assertEquals(retro.title, "Sprint 1 Retrospective");
    assertEquals(retro.continue, ["Pairing sessions"]);
    assertEquals(retro.participants, ["Alice Martin"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("RetrospectiveRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.findById("retro_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("RetrospectiveRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Q1 Release Retrospective",
      status: "open",
      continue: ["Ship behind flags"],
    });
    // First update — rewrites the file with id/title in the body, not fm.
    const updated = await repo.update(created.id, { status: "closed" });
    assertExists(updated);
    // The bug: re-reading the just-written file returned null → 404.
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Q1 Release Retrospective");
    assertEquals(fetched!.status, "closed");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("RetrospectiveRepository - update preserves continue/stop/start across re-reads", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Sprint 2 Retrospective",
      continue: ["A"],
      stop: ["B"],
      start: ["C"],
    });
    await repo.update(created.id, { continue: ["A", "A2"] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.continue, ["A", "A2"]);
    assertEquals(fetched!.stop, ["B"]);
    assertEquals(fetched!.start, ["C"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("RetrospectiveRepository - parses a slug-named file with id/title only in the body", async () => {
  const { repo, dir } = await setup();
  try {
    // Mimics a v1 slug-named file: no fm.id/fm.title, title in the heading.
    await Deno.mkdir(`${dir}/retrospectives`, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/retrospectives/q1-release.md`,
      "---\nstatus: closed\n---\n# Q1 Release Retrospective\n\n## Continue (Went Well)\n\n- Shipped on time\n",
    );
    const fetched = await repo.findById("q1-release");
    assertExists(fetched);
    assertEquals(fetched!.id, "q1-release");
    assertEquals(fetched!.title, "Q1 Release Retrospective");
    assertEquals(fetched!.continue, ["Shipped on time"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("RetrospectiveRepository - update of slug-named file preserves filename and does not duplicate", async () => {
  const { repo, dir } = await setup();
  try {
    // v1 fixture: slug filename ≠ frontmatter id.
    await Deno.mkdir(`${dir}/retrospectives`, { recursive: true });
    const slugPath = `${dir}/retrospectives/onboarding-revamp.md`;
    const idPath = `${dir}/retrospectives/retro_onboarding_revamp.md`;
    await Deno.writeTextFile(
      slugPath,
      "---\nid: retro_onboarding_revamp\nstatus: open\n---\n# Onboarding Revamp\n\n## Continue (Went Well)\n\n- Pairing sessions\n",
    );

    const updated = await repo.update("retro_onboarding_revamp", {
      status: "closed",
    });
    assertExists(updated);
    assertEquals(updated!.status, "closed");

    // Slug file still exists, no ID-named duplicate was created.
    const slugStat = await Deno.stat(slugPath);
    assertEquals(slugStat.isFile, true);
    let idFileExists = true;
    try {
      await Deno.stat(idPath);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) idFileExists = false;
      else throw err;
    }
    assertEquals(idFileExists, false);

    // Re-read by id still resolves and carries the update.
    const fetched = await repo.findById("retro_onboarding_revamp");
    assertExists(fetched);
    assertEquals(fetched!.status, "closed");
    assertEquals(fetched!.continue, ["Pairing sessions"]);
  } finally {
    await cleanup(dir);
  }
});
