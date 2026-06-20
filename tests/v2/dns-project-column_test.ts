/**
 * DNS views must surface the linked portfolio project (QOL).
 * Regression for: DNS table and grid card did not show which project a domain
 * is linked to. The table column (DNS_TABLE_COLUMNS) and the grid card (DnsCard)
 * must render the project name, and must render gracefully when it is empty
 * (blank, never the string "undefined").
 */

import { assert } from "@std/assert";
import { DNS_TABLE_COLUMNS } from "../../src/domains/dns/constants.tsx";
import { DnsCard } from "../../src/views/components/dns-card.tsx";
import type { DnsDomain } from "../../src/types/dns.types.ts";

/**
 * Render a component-root JSX node to its HTML string. Unlike an intrinsic root
 * (which eagerly stringifies), a component root is a lazy JSXFunctionNode whose
 * `toString()` must be invoked (and may resolve asynchronously).
 */
async function render(node: ReturnType<typeof DnsCard>): Promise<string> {
  if (node == null) return "";
  return String(await node.toString());
}

function makeDomain(project?: string): DnsDomain {
  return {
    id: "dns_test_1",
    domain: "example.com",
    status: "active",
    dnsRecords: [],
    project,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as DnsDomain;
}

Deno.test("DNS table has a Project column", () => {
  const col = DNS_TABLE_COLUMNS.find((c) => c.key === "project");
  assert(col, "DNS_TABLE_COLUMNS must include a 'project' column");
  assert(col?.label === "Project", "project column label must be 'Project'");
});

Deno.test("DnsCard renders the project name when set", async () => {
  const html = await render(DnsCard({ item: makeDomain("Acme Portal") }));
  assert(html.includes("Project"), "card shows the Project meta label");
  assert(html.includes("Acme Portal"), "card shows the project name");
});

Deno.test("DnsCard omits project gracefully when empty", async () => {
  const html = await render(DnsCard({ item: makeDomain(undefined) }));
  assert(!html.includes("undefined"), "must not leak 'undefined'");
  assert(
    !html.includes(">Project<"),
    "no Project meta row when project is empty",
  );
});
