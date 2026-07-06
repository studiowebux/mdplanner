// Redundant route-publish sweep (bkr7h7). The service layer is the single SSE
// source: every mutation publishes from its service method (BaseService.publish
// Change or an own publishChange), so per-domain custom routes must NOT publish
// directly. Only three deliberate exceptions remain — events with no covering
// service emission:
//   - dns.synced               (sync has no entity-CRUD equivalent)
//   - sticky-note.board.created (stickyBoard not in SSE_PREFIX_BY_KEY)
//   - task.moved               (same-section reorder; service emits per-row
//                               task.updated which can't reorder other clients)
// See note_1780980899631 + the targeted-task-SSE work.

import { assert, assertEquals } from "@std/assert";
import { subscribe } from "../../src/singletons/event-bus.ts";
import {
  getMeetingService,
  initServices,
} from "../../src/singletons/services.ts";

const ALLOWED = ["dns.synced", "sticky-note.board.created", "task.moved"];

Deno.test("route-publish guard — only the deliberate keeps publish from view routes", async () => {
  const found: string[] = [];
  for await (const entry of Deno.readDir("src/views")) {
    if (!entry.isDirectory) continue;
    const path = `src/views/${entry.name}/routes.tsx`;
    let src: string;
    try {
      src = await Deno.readTextFile(path);
    } catch {
      continue; // domain without a routes.tsx
    }
    for (const line of src.split("\n")) {
      // Skip comment lines (e.g. `// No publish("quote.updated"): ...`).
      if (/^\s*\/\//.test(line)) continue;
      const m = line.match(/\bpublish\(\s*"([^"]+)"/);
      if (m) found.push(m[1]);
    }
  }
  found.sort();
  assertEquals(
    found,
    [...ALLOWED].sort(),
    `Unexpected route-level publish() calls: ${found.join(", ")}. ` +
      `Mutations must publish from the SERVICE, not the route.`,
  );
});

// Subscribe, run a mutation, return the first real `event:` SSE frame.
async function captureEvent(mutate: () => Promise<unknown>): Promise<string> {
  const reader = subscribe().getReader();
  try {
    await mutate();
    for (let i = 0; i < 5; i++) {
      const { value } = await reader.read();
      if (value && value.startsWith("event:")) return value;
    }
    return "";
  } finally {
    reader.cancel();
  }
}

Deno.test("sub-entity service method publishes — MeetingService.addAction emits meeting.updated", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-subentity-sse-" });
  initServices(dir, { cache: false });
  const svc = getMeetingService();
  try {
    const meeting = await svc.create({ title: "Sync", date: "2026-01-01" });
    // addAction routes through this.update now (was this.repo.update), so the
    // service — not the route — emits the live-refresh event.
    const msg = await captureEvent(() =>
      svc.addAction(meeting.id, { description: "Follow up" })
    );
    assert(msg.length > 0, "expected an SSE frame after addAction");
    assertEquals(msg.includes("event: meeting.updated"), true);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
