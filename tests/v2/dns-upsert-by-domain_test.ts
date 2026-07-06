/**
 * Cloudflare sync must UPSERT existing domains, not skip them. upsertByDomain
 * updates a domain that already exists (matched by name), refreshes its fields,
 * and forces provider = "cloudflare" (correcting a prior manual provider).
 */

import { assertEquals } from "@std/assert";
import { DnsRepository } from "../../src/repositories/dns.repository.ts";
import type {
  CreateDnsDomain,
  UpdateDnsDomain,
} from "../../src/types/dns.types.ts";

Deno.test("upsertByDomain updates an existing domain instead of skipping", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-dns-upsert-" });
  const repo = new DnsRepository(dir);
  try {
    await repo.create({
      domain: "example.com",
      provider: "manual",
      renewalCostUsd: 10,
    } as CreateDnsDomain);

    const result = await repo.upsertByDomain("example.com", {
      renewalCostUsd: 25,
      status: "active",
    } as Partial<UpdateDnsDomain>);

    assertEquals(
      result.created,
      false,
      "existing domain is updated, not created",
    );
    assertEquals(
      result.item.provider,
      "cloudflare",
      "provider forced to cloudflare",
    );
    assertEquals(result.item.renewalCostUsd, 25, "fields refreshed from sync");
    assertEquals(result.item.status, "active");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
