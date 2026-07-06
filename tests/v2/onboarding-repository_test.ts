/**
 * Unit tests for v2 OnboardingRepository (CRUD on disk).
 *
 * Regression guard for task_1778999577972_ca7k — assignee + per-step owner:
 * `personId` (overall onboardee) and `step.owner` (per-step responsible person)
 * must survive create + update round-trips, alongside the pre-existing
 * id/title/category/status fields.
 */

import { assertEquals, assertExists } from "@std/assert";
import { OnboardingRepository } from "../../src/repositories/onboarding.repository.ts";

async function setup(): Promise<{ repo: OnboardingRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-onboarding-test-" });
  const repo = new OnboardingRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

Deno.test("OnboardingRepository - personId survives create round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      employeeName: "Alex Johnson",
      role: "Software Engineer",
      personId: "alice",
      steps: [],
    });
    assertEquals(created.personId, "alice");

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.personId, "alice");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("OnboardingRepository - step.owner survives create round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      employeeName: "Maria Garcia",
      role: "Product Designer",
      personId: "charlie",
      steps: [
        {
          id: "step_001",
          title: "Laptop setup",
          category: "equipment",
          status: "complete",
          owner: "diana",
        },
        {
          id: "step_002",
          title: "Figma access",
          category: "accounts",
          status: "not_started",
          owner: "member_frontend_lead",
        },
      ],
    });

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.steps.length, 2);
    assertEquals(found!.steps[0].owner, "diana");
    assertEquals(found!.steps[1].owner, "member_frontend_lead");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("OnboardingRepository - step.owner is undefined when missing (back-compat)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      employeeName: "Derek Osei",
      role: "Account Executive",
      steps: [
        {
          id: "step_001",
          title: "Laptop setup",
          category: "equipment",
          status: "complete",
        },
      ],
    });

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.steps[0].owner, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("OnboardingRepository - personId and step.owner survive update", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      employeeName: "Alex Johnson",
      role: "Software Engineer",
      steps: [
        {
          id: "step_001",
          title: "Laptop setup",
          category: "equipment",
          status: "not_started",
        },
      ],
    });

    await repo.update(created.id, {
      personId: "bob",
      steps: [
        {
          id: "step_001",
          title: "Laptop setup",
          category: "equipment",
          status: "complete",
          owner: "diana",
        },
      ],
    });

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.personId, "bob");
    assertEquals(found!.steps[0].owner, "diana");
    assertEquals(found!.steps[0].status, "complete");
    assertEquals(found!.steps[0].id, "step_001");
  } finally {
    await cleanup(dir);
  }
});
