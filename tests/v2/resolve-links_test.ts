/**
 * Unit tests for `resolveLinkedItems` (v2/utils/resolve-links.ts).
 *
 * Covers the five canonical cases listed in the ticket Acceptance:
 * undefined input, empty array, all-resolve, mixed nulls (filter + order
 * preserved), all nulls. Decision note: `note_1780091635523_nvyef6`.
 */

import { assertEquals } from "@std/assert";
import { resolveLinkedItems } from "../../v2/utils/resolve-links.ts";

type FakeEntity = { id: string; title: string };

function makeRegistry(entities: FakeEntity[]): {
  getById: (id: string) => Promise<FakeEntity | null>;
} {
  const byId = new Map(entities.map((e) => [e.id, e]));
  return {
    getById: (id) => Promise.resolve(byId.get(id) ?? null),
  };
}

Deno.test("resolveLinkedItems — undefined input returns []", async () => {
  const { getById } = makeRegistry([{ id: "a", title: "A" }]);
  const result = await resolveLinkedItems(undefined, getById);
  assertEquals(result, []);
});

Deno.test("resolveLinkedItems — empty array returns []", async () => {
  const { getById } = makeRegistry([{ id: "a", title: "A" }]);
  const result = await resolveLinkedItems([], getById);
  assertEquals(result, []);
});

Deno.test("resolveLinkedItems — all resolve, order preserved", async () => {
  const entities: FakeEntity[] = [
    { id: "a", title: "Alpha" },
    { id: "b", title: "Beta" },
    { id: "c", title: "Gamma" },
  ];
  const { getById } = makeRegistry(entities);
  const result = await resolveLinkedItems(["c", "a", "b"], getById);
  assertEquals(result, [
    { id: "c", title: "Gamma" },
    { id: "a", title: "Alpha" },
    { id: "b", title: "Beta" },
  ]);
});

Deno.test("resolveLinkedItems — mixed nulls filtered, survivor order preserved", async () => {
  const entities: FakeEntity[] = [
    { id: "a", title: "Alpha" },
    { id: "c", title: "Gamma" },
  ];
  const { getById } = makeRegistry(entities);
  const result = await resolveLinkedItems(
    ["a", "missing", "c", "also-missing"],
    getById,
  );
  assertEquals(result, [
    { id: "a", title: "Alpha" },
    { id: "c", title: "Gamma" },
  ]);
});

Deno.test("resolveLinkedItems — all nulls returns []", async () => {
  const { getById } = makeRegistry([{ id: "a", title: "A" }]);
  const result = await resolveLinkedItems(["x", "y", "z"], getById);
  assertEquals(result, []);
});
