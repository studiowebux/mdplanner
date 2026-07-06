/**
 * Unit tests for src/utils/billing-parse.ts — line-item normalization and the
 * billing body (title + trailing notes) convention shared by invoices/quotes.
 */

import { assertEquals } from "@std/assert";
import {
  parseBillingBody,
  parseLineItems,
} from "../../src/utils/billing-parse.ts";

Deno.test("parseLineItems — non-array input yields empty array", () => {
  assertEquals(parseLineItems(undefined), []);
  assertEquals(parseLineItems(null), []);
  assertEquals(parseLineItems("nope"), []);
  assertEquals(parseLineItems([]), []);
});

Deno.test("parseLineItems — applies defaults for a bare item", () => {
  assertEquals(parseLineItems([{}]), [{
    id: "",
    type: "service",
    description: "",
    group: undefined,
    quantity: undefined,
    unit: undefined,
    unitRate: undefined,
    discount: undefined,
    discountType: undefined,
    taxable: undefined,
    optional: undefined,
    rateId: undefined,
    taskId: undefined,
    notes: undefined,
    amount: 0,
  }]);
});

Deno.test("parseLineItems — maps snake_case frontmatter keys to camelCase", () => {
  const items = parseLineItems([{
    id: "li1",
    type: "service",
    description: "Consulting",
    quantity: 10,
    unit_rate: 150,
    taxable: true,
    amount: 1500,
  }]);
  assertEquals(items.length, 1);
  const li = items[0];
  assertEquals(li.id, "li1");
  assertEquals(li.description, "Consulting");
  assertEquals(li.quantity, 10);
  assertEquals(li.unitRate, 150); // unit_rate → unitRate
  assertEquals(li.taxable, true);
  assertEquals(li.amount, 1500);
});

Deno.test("parseLineItems — coerces numeric and boolean fields", () => {
  const [li] = parseLineItems([{
    id: 42, // coerced to string
    amount: "250", // coerced to number
    quantity: "3",
    discount: "10",
    optional: 1, // truthy → true
  }]);
  assertEquals(li.id, "42");
  assertEquals(li.amount, 250);
  assertEquals(li.quantity, 3);
  assertEquals(li.discount, 10);
  assertEquals(li.optional, true);
});

Deno.test("parseBillingBody — frontmatter title wins, notes follow the heading", () => {
  const r = parseBillingBody("Invoice #5", "# Heading\nNote line");
  assertEquals(r.title, "Invoice #5");
  assertEquals(r.notes, "Note line");
});

Deno.test("parseBillingBody — falls back to the first # heading for title", () => {
  const r = parseBillingBody(undefined, "# My Title\nbody text");
  assertEquals(r.title, "My Title");
  assertEquals(r.notes, "body text");
});

Deno.test("parseBillingBody — no heading: whole body becomes notes", () => {
  const r = parseBillingBody(undefined, "just some notes");
  assertEquals(r.title, "");
  assertEquals(r.notes, "just some notes");
});

Deno.test("parseBillingBody — heading with no following text yields no notes", () => {
  const r = parseBillingBody("T", "# Heading only");
  assertEquals(r.title, "T");
  assertEquals(r.notes, undefined);
});

Deno.test("parseBillingBody — empty body yields empty title and no notes", () => {
  const r = parseBillingBody(undefined, "");
  assertEquals(r.title, "");
  assertEquals(r.notes, undefined);
});
