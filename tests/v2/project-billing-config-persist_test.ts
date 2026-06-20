/**
 * Settings > Billing fields must persist. They were fully wired in the schema,
 * frontmatter, transform, and repo serializer, but UPDATE_CONFIG_KEYS (the
 * whitelist ProjectService.updateConfig copies through) omitted them, so every
 * billing field was silently dropped on save — and the invoice/quote export
 * showed no billing footer. All six billing fields are now whitelisted.
 */

import { assertEquals } from "@std/assert";
import {
  getProjectService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("updateConfig persists all billing fields across a read round-trip", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-billing-cfg-" });
  initServices(dir, { cache: false });
  try {
    await getProjectService().updateConfig({
      billingCompany: "Studio Webux Inc.",
      billingAddress: "123 Main St\nMontreal, QC",
      billingLogoUrl: "https://example.com/logo.png",
      billingDefaultFooter: "Thank you for your business.",
      billingTaxNumber: "TX-12345",
      billingBusinessNumber: "BN-67890",
    });

    const config = await getProjectService().getConfig();
    assertEquals(config.billingCompany, "Studio Webux Inc.");
    assertEquals(config.billingAddress, "123 Main St\nMontreal, QC");
    assertEquals(config.billingLogoUrl, "https://example.com/logo.png");
    assertEquals(config.billingDefaultFooter, "Thank you for your business.");
    assertEquals(config.billingTaxNumber, "TX-12345");
    assertEquals(config.billingBusinessNumber, "BN-67890");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
