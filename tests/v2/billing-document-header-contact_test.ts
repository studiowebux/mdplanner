/**
 * The shared billing document header (used by both quote and invoice exports)
 * renders the seller's contact email and phone when configured, alongside the
 * existing company/address/tax/business fields. Empty fields render nothing.
 */

import { assert, assertStringIncludes } from "@std/assert";
import { BillingDocumentHeader } from "../../src/views/components/billing-document-header.tsx";
import { toHtml } from "../../src/utils/html.ts";
import type { ProjectConfig } from "../../src/types/project.types.ts";

function cfg(overrides: Partial<ProjectConfig>): ProjectConfig {
  return { features: [], ...overrides } as ProjectConfig;
}

Deno.test("billing header renders seller contact email and phone", async () => {
  const html = await toHtml(
    BillingDocumentHeader({
      config: cfg({
        billingCompany: "Acme Corp",
        billingEmail: "billing@acme.com",
        billingPhone: "+1 514-555-0100",
      }),
    }),
  );
  assertStringIncludes(html, "billing@acme.com");
  assertStringIncludes(html, "+1 514-555-0100");
  assertStringIncludes(html, "billing-document-header__contact");
});

Deno.test("billing header omits the contact block when unset", async () => {
  const html = await toHtml(
    BillingDocumentHeader({ config: cfg({ billingCompany: "Acme Corp" }) }),
  );
  assert(
    !html.includes("billing-document-header__contact"),
    "no contact block when email/phone are unset",
  );
});
