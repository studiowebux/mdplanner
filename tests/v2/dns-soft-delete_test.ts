/**
 * Soft-delete acceptance suite — DNS.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerDnsEntity } from "../../v2/domains/dns/cache.ts";
import { DnsRepository } from "../../v2/repositories/dns.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "DNS",
  table: "dns_domains",
  filePath: (dir, id) => `${dir}/dns/${id}.md`,
  makeRepo: (dir) => new DnsRepository(dir),
  registerEntity: (repo) => registerDnsEntity(repo as DnsRepository),
  seedTarget: () => ({ domain: "archive-me.example.com" }),
  seedControl: () => ({ domain: "keep-me.example.com" }),
});
