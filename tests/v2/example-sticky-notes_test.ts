/**
 * Validates the committed example/ sticky-notes demo data.
 *
 * Guards the hqi5 enrichment: board manifests must have real titles (no
 * "Test123" stub) and resolve any linked project to a real portfolio item;
 * every sticky note across all boards (including the implicit "default" board)
 * must have non-empty, non-junk content, a valid color, and a numeric
 * position. The whole sticky-notes tree (boards + per-board subdirs) is copied
 * into a temp dir so the cached repositories never write back into the source.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { StickyBoardRepository } from "../../src/repositories/sticky-board.repository.ts";
import { StickyNoteRepository } from "../../src/repositories/sticky-note.repository.ts";
import { PortfolioRepository } from "../../src/repositories/portfolio.repository.ts";
import { STICKY_NOTE_COLORS } from "../../src/domains/sticky-note/constants.tsx";

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;

/** Recursively copy a directory tree (boards + per-board sticky subdirs). */
async function copyTree(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory) await copyTree(s, d);
    else if (entry.isFile) await Deno.copyFile(s, d);
  }
}

function isJunk(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t.length < 4 || /^te?st\d*$/.test(t) || t.startsWith("hello world");
}

Deno.test("example sticky-notes — clean boards and non-empty notes", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-sticky-" });
  await copyTree(join(EXAMPLE_DIR, "sticky-notes"), join(dir, "sticky-notes"));
  await copyTree(join(EXAMPLE_DIR, "portfolio"), join(dir, "portfolio"));
  try {
    const boards = await new StickyBoardRepository(dir).findAll();
    const projectNames = new Set(
      (await new PortfolioRepository(dir).findAll()).map((p) => p.name),
    );
    const validColors = new Set<string>(STICKY_NOTE_COLORS);

    assert(boards.length >= 2, `expected >= 2 boards, got ${boards.length}`);

    for (const b of boards) {
      assert(
        !isJunk(b.title),
        `board "${b.title}" has a junk/placeholder title`,
      );
      for (const proj of b.projects) {
        assert(
          projectNames.has(proj),
          `board "${b.title}" references unknown project "${proj}"`,
        );
      }
    }

    // Validate notes across every manifest board plus the implicit "default".
    const boardIds = [...boards.map((b) => b.id), "default"];
    const colorsSeen = new Set<string>();
    let totalNotes = 0;

    for (const boardId of boardIds) {
      const notes = await new StickyNoteRepository(dir, boardId).findAll();
      for (const n of notes) {
        totalNotes++;
        assert(
          n.content.trim().length > 0 && !isJunk(n.content),
          `board "${boardId}" has a junk/empty sticky: "${n.content}"`,
        );
        assert(
          validColors.has(n.color),
          `board "${boardId}" has a sticky with invalid color "${n.color}"`,
        );
        assert(
          typeof n.position.x === "number" && typeof n.position.y === "number",
          `board "${boardId}" has a sticky with a non-numeric position`,
        );
        colorsSeen.add(n.color);
      }
    }

    assert(
      totalNotes >= 15,
      `expected >= 15 sticky notes total, got ${totalNotes}`,
    );
    assert(
      colorsSeen.size >= 3,
      `expected >= 3 distinct sticky colors for variety, got ${colorsSeen.size}`,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
