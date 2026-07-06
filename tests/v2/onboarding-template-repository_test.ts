/**
 * Unit tests for v2 OnboardingTemplateRepository (CRUD on disk).
 *
 * Regression guard for the "edit mode 404": ONBOARDING_TEMPLATE_BODY_KEYS once
 * listed `id`+`name`, but serializeStandard excludes body keys from frontmatter
 * and the body is empty — so the first update() dropped id+name from
 * frontmatter and parse()'s `if (!fm.id && !fm.name) return null` guard made
 * getById() 404. Same defect class as the brainstorm fix c4aa355.
 */

import { assertEquals, assertExists } from "@std/assert";
import { OnboardingTemplateRepository } from "../../src/repositories/onboarding-template.repository.ts";

async function setup(): Promise<
  { repo: OnboardingTemplateRepository; dir: string }
> {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-onboarding-template-test-",
  });
  const repo = new OnboardingTemplateRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

Deno.test("OnboardingTemplateRepository - fields survive create round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const steps = [
      { title: "Laptop setup", category: "equipment" as const },
      { title: "Email account", category: "accounts" as const },
    ];
    const created = await repo.create({
      name: "Engineering Onboarding",
      description: "Checklist for engineers",
      role: "Software Engineer",
      tags: ["engineering", "remote"],
      steps,
    });
    assertEquals(created.name, "Engineering Onboarding");
    assertEquals(created.steps, steps);

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.name, "Engineering Onboarding");
    assertEquals(found!.description, "Checklist for engineers");
    assertEquals(found!.role, "Software Engineer");
    assertEquals(found!.tags, ["engineering", "remote"]);
    assertEquals(found!.steps, steps);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("OnboardingTemplateRepository - getById survives an update (no 404)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Sales Onboarding",
      steps: [{ title: "CRM access", category: "accounts" as const }],
    });

    const updated = await repo.update(created.id, {
      description: "Updated description",
      steps: [{ title: "CRM access", category: "accounts" as const }],
    });
    assertExists(updated);
    assertEquals(updated!.id, created.id);
    assertEquals(updated!.name, "Sales Onboarding");

    // The regression: a dropped id/name made this return null → 404.
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.name, "Sales Onboarding");
    assertEquals(found!.description, "Updated description");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("OnboardingTemplateRepository - steps survive an update", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Design Onboarding",
      steps: [{ title: "Figma access", category: "accounts" as const }],
    });

    const edited = [
      { title: "Figma access", category: "accounts" as const },
      { title: "Brand guidelines review", category: "docs" as const },
      { title: "Meet the design team", category: "intro" as const },
    ];
    await repo.update(created.id, { steps: edited });

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.steps, edited);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("OnboardingTemplateRepository - findAll returns templates after update", async () => {
  const { repo, dir } = await setup();
  try {
    const a = await repo.create({ name: "Template A", steps: [] });
    await repo.create({ name: "Template B", steps: [] });
    await repo.update(a.id, {
      steps: [{ title: "Added step", category: "training" as const }],
    });

    const all = await repo.findAll();
    assertEquals(all.length, 2);
    const tplA = all.find((t) => t.name === "Template A");
    assertExists(tplA);
    assertEquals(tplA!.steps, [
      { title: "Added step", category: "training" },
    ]);
  } finally {
    await cleanup(dir);
  }
});
