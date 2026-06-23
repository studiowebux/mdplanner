/**
 * Portfolio external status badges (CI/CD/pipeline shields images).
 * Covers the markdown parser round-trip and the ExternalBadges renderer:
 *  - linked badge `[![alt](img)](link)` → {alt, imageUrl, linkUrl}
 *  - bare badge `![alt](img)` → {alt, imageUrl}
 *  - malformed lines are skipped, not thrown
 *  - renderer emits <img src> and wraps in <a href> only when linkUrl is set
 */

import { assert, assertEquals } from "@std/assert";
import {
  badgesToMarkdown,
  parseBadgeMarkdown,
} from "../../src/utils/portfolio-badge.ts";
import { ExternalBadges } from "../../src/components/ui/status-badge.tsx";
import type { PortfolioBadge } from "../../src/types/portfolio.types.ts";

async function render(
  node: ReturnType<typeof ExternalBadges>,
): Promise<string> {
  if (node == null) return "";
  return String(await node.toString());
}

Deno.test("parseBadgeMarkdown parses a linked badge", () => {
  const badges = parseBadgeMarkdown(
    "[![status-badge](https://example.com/api/badges/9/status.svg)](https://example.com/repos/9)",
  );
  assertEquals(badges, [{
    alt: "status-badge",
    imageUrl: "https://example.com/api/badges/9/status.svg",
    linkUrl: "https://example.com/repos/9",
  }]);
});

Deno.test("parseBadgeMarkdown parses a bare image badge", () => {
  const badges = parseBadgeMarkdown(
    "![build](https://img.shields.io/badge/x.svg)",
  );
  assertEquals(badges, [{
    alt: "build",
    imageUrl: "https://img.shields.io/badge/x.svg",
  }]);
});

Deno.test("parseBadgeMarkdown skips malformed/blank lines", () => {
  const badges = parseBadgeMarkdown(
    "not a badge\n\n![ok](https://x/y.svg)\n](broken",
  );
  assertEquals(badges, [{ alt: "ok", imageUrl: "https://x/y.svg" }]);
});

Deno.test("badgesToMarkdown round-trips through parseBadgeMarkdown", () => {
  const badges: PortfolioBadge[] = [
    { alt: "a", imageUrl: "https://x/a.svg", linkUrl: "https://x/repo" },
    { alt: "b", imageUrl: "https://x/b.svg" },
  ];
  assertEquals(parseBadgeMarkdown(badgesToMarkdown(badges)), badges);
});

Deno.test("ExternalBadges renders an image wrapped in a link", async () => {
  const html = await render(
    ExternalBadges({
      badges: [{
        alt: "status",
        imageUrl: "https://x/s.svg",
        linkUrl: "https://x/repo",
      }],
    }),
  );
  assert(html.includes('src="https://x/s.svg"'), "renders the image src");
  assert(html.includes('href="https://x/repo"'), "wraps in the link href");
  assert(html.includes('alt="status"'), "renders the alt text");
});

Deno.test("ExternalBadges renders a bare image with no link", async () => {
  const html = await render(
    ExternalBadges({ badges: [{ imageUrl: "https://x/s.svg" }] }),
  );
  assert(html.includes('src="https://x/s.svg"'), "renders the image src");
  assert(!html.includes("<a "), "no anchor when linkUrl is absent");
});

Deno.test("ExternalBadges renders nothing when empty", async () => {
  assertEquals(await render(ExternalBadges({ badges: [] })), "");
  assertEquals(await render(ExternalBadges({ badges: null })), "");
});
