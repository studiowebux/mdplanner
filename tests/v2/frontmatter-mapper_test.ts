/**
 * Unit tests for v2 frontmatter-mapper helpers. Focused on `parseAuditFields`
 * — the single helper every domain's parse() spreads into its return value to
 * round-trip createdAt/updatedAt/createdBy/updatedBy.
 */

import { assertEquals } from "@std/assert";
import { parseAuditFields } from "../../v2/utils/frontmatter-mapper.ts";

Deno.test("parseAuditFields - reads snake_case (standalone-repo shape)", () => {
  const fm = {
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    created_by: "person_a",
    updated_by: "person_b",
  };
  assertEquals(parseAuditFields(fm), {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    createdBy: "person_a",
    updatedBy: "person_b",
  });
});

Deno.test("parseAuditFields - reads camelCase (post-mapKeysFromFm shape)", () => {
  const fm = {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    createdBy: "person_a",
    updatedBy: "person_b",
  };
  assertEquals(parseAuditFields(fm), {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    createdBy: "person_a",
    updatedBy: "person_b",
  });
});

Deno.test("parseAuditFields - snake_case wins when both forms present", () => {
  const fm = {
    created_at: "snake-win",
    createdAt: "camel-lose",
    updated_at: "snake-win",
    updatedAt: "camel-lose",
    created_by: "snake-win",
    createdBy: "camel-lose",
    updated_by: "snake-win",
    updatedBy: "camel-lose",
  };
  assertEquals(parseAuditFields(fm), {
    createdAt: "snake-win",
    updatedAt: "snake-win",
    createdBy: "snake-win",
    updatedBy: "snake-win",
  });
});

Deno.test("parseAuditFields - omits missing fields from result (clean spread)", () => {
  const fm = { created_at: "only-this" };
  const result = parseAuditFields(fm);
  assertEquals(result, { createdAt: "only-this" });
  // Spreading into a parse() result must not introduce undefined keys.
  assertEquals(Object.keys(result), ["createdAt"]);
});

Deno.test("parseAuditFields - empty frontmatter returns empty object", () => {
  assertEquals(parseAuditFields({}), {});
});

Deno.test("parseAuditFields - coerces non-string values to string", () => {
  // Real-world: YAML may parse a numeric timestamp.
  const fm = { created_at: 1738368000000 };
  const result = parseAuditFields(fm);
  assertEquals(result.createdAt, "1738368000000");
});

Deno.test("parseAuditFields - ignores null and undefined values", () => {
  const fm = {
    created_at: null,
    updated_at: undefined,
    created_by: null,
    updated_by: undefined,
  };
  assertEquals(parseAuditFields(fm), {});
});
