/**
 * Portfolio external status badges (CI/CD/pipeline shields images).
 * Covers the array-table form parse (badges field) and the ExternalBadges
 * renderer:
 *  - array-table rows → PortfolioBadge[] {imageUrl, linkUrl?, alt?}
 *  - empty per-row fields are dropped (bare image keeps only imageUrl)
 *  - renderer emits <img src> and wraps in <a href> only when linkUrl is set
 */

import { assert, assertEquals } from "@std/assert";
import { portfolioConfig } from "../../src/domains/portfolio/config.tsx";
import { ExternalBadges } from "../../src/components/ui/status-badge.tsx";
import type { PortfolioItem } from "../../src/types/portfolio.types.ts";

async function render(
  node: ReturnType<typeof ExternalBadges>,
): Promise<string> {
  if (node == null) return "";
  return String(await node.toString());
}

Deno.test("parseCreate parses array-table badge rows into PortfolioBadge[]", () => {
  const parsed = portfolioConfig.parseCreate({
    name: "Acme",
    "portfolio_badges[0].imageUrl":
      "https://example.com/api/badges/9/status.svg",
    "portfolio_badges[0].linkUrl": "https://example.com/repos/9",
    "portfolio_badges[0].alt": "status-badge",
    "portfolio_badges[1].imageUrl": "https://img.shields.io/badge/x.svg",
  }) as PortfolioItem;

  assertEquals(parsed.badges, [
    {
      imageUrl: "https://example.com/api/badges/9/status.svg",
      linkUrl: "https://example.com/repos/9",
      alt: "status-badge",
    },
    { imageUrl: "https://img.shields.io/badge/x.svg" },
  ]);
});

Deno.test("parseCreate drops a completely empty badge row", () => {
  const parsed = portfolioConfig.parseCreate({
    name: "Acme",
    "portfolio_badges[0].imageUrl": "",
    "portfolio_badges[0].linkUrl": "",
    "portfolio_badges[0].alt": "",
  }) as PortfolioItem;

  assertEquals(parsed.badges, []);
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
