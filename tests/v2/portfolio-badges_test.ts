/**
 * Portfolio links + status badges via the form-builder array-tables.
 * Each array-table row accepts EITHER plain column values OR pasted markdown
 * (one or many entries), parsed through src/utils/markdown-links.ts:
 *  - badge image-link `[![alt](img)](href)` → {imageUrl, linkUrl, alt}
 *  - bare image `![alt](img)`               → {imageUrl, alt}
 *  - link `[label](href)`                   → {label, href}
 * Plus the ExternalBadges renderer (image, optional link wrapper).
 */

import { assert, assertEquals } from "@std/assert";
import { portfolioConfig } from "../../src/domains/portfolio/config.tsx";
import { ExternalBadges } from "../../src/components/ui/status-badge.tsx";
import {
  parseMarkdownBadges,
  parseMarkdownLinks,
} from "../../src/utils/markdown-links.ts";
import type { PortfolioItem } from "../../src/types/portfolio.types.ts";

async function render(
  node: ReturnType<typeof ExternalBadges>,
): Promise<string> {
  if (node == null) return "";
  return String(await node.toString());
}

Deno.test("parseMarkdownBadges parses a linked badge", () => {
  assertEquals(
    parseMarkdownBadges(
      "[![status](https://x/status.svg)](https://x/repo/9)",
    ),
    [{
      imageUrl: "https://x/status.svg",
      linkUrl: "https://x/repo/9",
      alt: "status",
    }],
  );
});

Deno.test("parseMarkdownBadges parses a bare image badge", () => {
  assertEquals(
    parseMarkdownBadges("![build](https://img.shields.io/badge/x.svg)"),
    [{ imageUrl: "https://img.shields.io/badge/x.svg", alt: "build" }],
  );
});

Deno.test("parseMarkdownBadges parses many badges (array format)", () => {
  const badges = parseMarkdownBadges(
    "[![a](https://x/a.svg)](https://x/1) ![b](https://x/b.svg)",
  );
  assertEquals(badges, [
    { imageUrl: "https://x/a.svg", linkUrl: "https://x/1", alt: "a" },
    { imageUrl: "https://x/b.svg", alt: "b" },
  ]);
});

Deno.test("parseMarkdownBadges returns [] for a plain (non-markdown) url", () => {
  assertEquals(parseMarkdownBadges("https://x/plain.svg"), []);
});

Deno.test("parseMarkdownLinks parses links and skips badges", () => {
  const links = parseMarkdownLinks(
    "[Docs](https://x/docs) [![b](https://x/b.svg)](https://x/repo)",
  );
  assertEquals(links, [{ label: "Docs", href: "https://x/docs" }]);
});

Deno.test("parseCreate: structured badge rows pass through unchanged", () => {
  const parsed = portfolioConfig.parseCreate({
    name: "Acme",
    "portfolio_badges[0].imageUrl": "https://x/s.svg",
    "portfolio_badges[0].linkUrl": "https://x/repo",
    "portfolio_badges[0].alt": "status",
  }) as PortfolioItem;
  assertEquals(parsed.badges, [
    { imageUrl: "https://x/s.svg", linkUrl: "https://x/repo", alt: "status" },
  ]);
});

Deno.test("parseCreate: markdown pasted into a badge row expands to badges", () => {
  const parsed = portfolioConfig.parseCreate({
    name: "Acme",
    "portfolio_badges[0].imageUrl":
      "[![a](https://x/a.svg)](https://x/1) ![b](https://x/b.svg)",
  }) as PortfolioItem;
  assertEquals(parsed.badges, [
    { imageUrl: "https://x/a.svg", linkUrl: "https://x/1", alt: "a" },
    { imageUrl: "https://x/b.svg", alt: "b" },
  ]);
});

Deno.test("parseCreate: structured + markdown link rows", () => {
  const parsed = portfolioConfig.parseCreate({
    name: "Acme",
    "portfolio_urls[0].label": "Repo",
    "portfolio_urls[0].href": "https://x/repo",
    "portfolio_urls[1].href": "[Docs](https://x/docs)",
  }) as PortfolioItem;
  assertEquals(parsed.urls, [
    { label: "Repo", href: "https://x/repo" },
    { label: "Docs", href: "https://x/docs" },
  ]);
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
