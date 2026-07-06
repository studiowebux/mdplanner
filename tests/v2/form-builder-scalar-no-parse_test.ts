/**
 * Regression (bug task_1782101138741): FieldControl used to call parseJson on
 * EVERY field's value, even though only array-table fields consume the result.
 * Scalar fields (invoice/quote number, payment method) therefore logged a
 * spurious "[cache] JSON parse failed" warning on every create/edit form render
 * while the owner built quotes/invoices/payments. parseJson now runs only in
 * the array-table branch.
 */

import { assert, assertEquals } from "@std/assert";
import { FormBuilder } from "../../src/components/ui/form-builder.tsx";
import type { FieldDef } from "../../src/components/ui/form-builder.tsx";
import { log } from "../../src/singletons/logger.ts";

async function renderForm(
  fields: FieldDef[],
  values: Record<string, string>,
): Promise<{ html: string; warnings: unknown[][] }> {
  const warnings: unknown[][] = [];
  const original = log.warn;
  log.warn = (...args: unknown[]) => {
    warnings.push(args);
    return undefined as unknown as ReturnType<typeof original>;
  };
  try {
    const node = FormBuilder({
      id: "test-form",
      title: "Test",
      fields,
      values,
      action: "/x",
      method: "post",
    });
    const html = String(await (node as unknown as Promise<unknown>));
    return { html, warnings };
  } finally {
    log.warn = original;
  }
}

Deno.test("scalar text field with a non-JSON value renders without a JSON-parse warning", async () => {
  const { html, warnings } = await renderForm(
    [{ type: "text", name: "number", label: "Number" }],
    { number: "INV-2026-002" },
  );
  assert(html.includes("INV-2026-002"), "the scalar value is rendered");
  assertEquals(warnings, [], "no parse warning for a scalar field");
});

Deno.test("array-table field still parses its JSON rows", async () => {
  const fields: FieldDef[] = [{
    type: "array-table",
    name: "lineItems",
    label: "Line Items",
    section: "Line Items",
    itemFields: [{ name: "description", label: "Description", type: "text" }],
  }];
  const { html, warnings } = await renderForm(fields, {
    lineItems: JSON.stringify([{ description: "Frontend work" }]),
  });
  assert(html.includes("Frontend work"), "array-table renders parsed rows");
  assertEquals(warnings, [], "valid JSON array-table value parses cleanly");
});
