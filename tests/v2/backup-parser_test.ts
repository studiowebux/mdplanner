/**
 * Unit test for the shared backup stream parser (v2/api/v1/backup/parser.ts).
 *
 * `parseBackupStream` is consumed by BOTH POST /import (writes) and the new
 * POST /preview (read-only diff). It reads the export format — version +
 * exportedAt meta lines, then a `domains` object whose every value is a single
 * line `    "key": [...]` — one line at a time without buffering the full JSON.
 *
 * No services or DB are touched: the parser is pure over a byte stream.
 */

import { assertEquals } from "@std/assert";
import {
  type BackupParseEvent,
  parseBackupStream,
} from "../../src/api/v1/backup/parser.ts";

function streamOf(s: string): ReadableStream<Uint8Array> {
  return new Response(s).body!;
}

async function collect(s: string): Promise<BackupParseEvent[]> {
  const events: BackupParseEvent[] = [];
  for await (const ev of parseBackupStream(streamOf(s))) events.push(ev);
  return events;
}

// Mirrors the exact shape produced by GET /export.
const BACKUP = `{
  "version": "9.9.9",
  "exportedAt": "2026-05-22T00:00:00.000Z",
  "domains": {
    "tasks": [{"id":"t1"},{"id":"t2"}],
    "goals": [{"id":"g1"}]
  }
}
`;

Deno.test("parseBackupStream — emits version + exportedAt meta before domains", async () => {
  const events = await collect(BACKUP);
  assertEquals(events[0], { type: "meta", key: "version", value: "9.9.9" });
  assertEquals(events[1], {
    type: "meta",
    key: "exportedAt",
    value: "2026-05-22T00:00:00.000Z",
  });
  assertEquals(events[2], { type: "domains-start" });
});

Deno.test("parseBackupStream — emits one domain event per line with parsed items", async () => {
  const events = await collect(BACKUP);
  const domains = events.filter((e) => e.type === "domain");
  assertEquals(domains.length, 2);
  assertEquals(domains[0], {
    type: "domain",
    key: "tasks",
    items: [{ id: "t1" }, { id: "t2" }],
  });
  assertEquals(domains[1], {
    type: "domain",
    key: "goals",
    items: [{ id: "g1" }],
  });
});

Deno.test("parseBackupStream — strips a defensive trailing comma on a domain line", async () => {
  // A trailing comma after the array (not produced by the exporter, but the
  // parser strips it defensively) must not break JSON.parse.
  const events = await collect(
    `{\n  "domains": {\n    "tasks": [{"id":"t1"}],\n  }\n}\n`,
  );
  const domains = events.filter((e) => e.type === "domain");
  assertEquals(domains.length, 1);
  assertEquals(domains[0], {
    type: "domain",
    key: "tasks",
    items: [{ id: "t1" }],
  });
});

Deno.test("parseBackupStream — skips malformed and non-array domain lines", async () => {
  const events = await collect(
    `{\n  "domains": {\n    "broken": [{"id":,\n    "goals": [{"id":"g1"}]\n  }\n}\n`,
  );
  const domains = events.filter((e) => e.type === "domain");
  // 'broken' fails JSON.parse and is skipped; 'goals' still parses.
  assertEquals(domains.length, 1);
  assertEquals(domains[0].type === "domain" && domains[0].key, "goals");
});

Deno.test("parseBackupStream — yields no domain-start when 'domains' key is absent", async () => {
  const events = await collect(`{\n  "version": "1.0.0"\n}\n`);
  assertEquals(events.some((e) => e.type === "domains-start"), false);
  assertEquals(events.filter((e) => e.type === "domain").length, 0);
});
