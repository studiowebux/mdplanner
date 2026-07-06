/**
 * Validates the committed example/ DNS demo data.
 *
 * Guards the hqi5 enrichment: every shipped domain must parse, carry a valid
 * provider, resolve any linked project to a real portfolio item, and expose
 * well-formed inline dns_records (valid type, non-empty name/value, positive
 * ttl). Also asserts demo variety (multiple providers, records present) so the
 * provider filter and records sub-view have something to show. Files are copied
 * into a temp dir so the cached repository never writes back into the source.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { DnsRepository } from "../../src/repositories/dns.repository.ts";
import { PortfolioRepository } from "../../src/repositories/portfolio.repository.ts";
import { DNS_PROVIDERS, DNS_RECORD_TYPES } from "../../src/types/dns.types.ts";

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;

async function copyDir(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      await Deno.copyFile(join(src, entry.name), join(dest, entry.name));
    }
  }
}

Deno.test("example dns — valid domains, records, and project refs", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-dns-" });
  await copyDir(join(EXAMPLE_DIR, "dns"), join(dir, "dns"));
  await copyDir(join(EXAMPLE_DIR, "portfolio"), join(dir, "portfolio"));
  try {
    const all = await new DnsRepository(dir).findAll();
    const projectNames = new Set(
      (await new PortfolioRepository(dir).findAll()).map((p) => p.name),
    );
    const validProviders = new Set<string>(DNS_PROVIDERS);
    const validRecordTypes = new Set<string>(DNS_RECORD_TYPES);

    assert(all.length >= 5, `expected >= 5 dns domains, got ${all.length}`);

    const providers = new Set<string>();
    let domainsWithRecords = 0;

    for (const d of all) {
      assert(d.domain.trim().length > 0, "dns domain has empty name");

      if (d.provider) {
        assert(
          validProviders.has(d.provider),
          `domain "${d.domain}" has invalid provider "${d.provider}"`,
        );
        providers.add(d.provider);
      }

      if (d.project) {
        assert(
          projectNames.has(d.project),
          `domain "${d.domain}" references unknown project "${d.project}"`,
        );
      }

      if (d.dnsRecords && d.dnsRecords.length > 0) {
        domainsWithRecords++;
        for (const r of d.dnsRecords) {
          assert(
            validRecordTypes.has(r.type),
            `domain "${d.domain}" has invalid record type "${r.type}"`,
          );
          assert(
            r.name.trim().length > 0 && r.value.trim().length > 0,
            `domain "${d.domain}" has a record with empty name/value`,
          );
          assert(
            r.ttl > 0,
            `domain "${d.domain}" has a record with non-positive ttl`,
          );
        }
      }
    }

    assert(
      providers.size >= 2,
      `expected >= 2 distinct providers for demo variety, got ${providers.size}`,
    );
    assert(
      domainsWithRecords >= 2,
      `expected >= 2 domains with dns_records, got ${domainsWithRecords}`,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
