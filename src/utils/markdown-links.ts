// Parse markdown image-links / links into the structured shapes the portfolio
// form-builder array-tables store. Reuses marked's lexer (the same dependency
// the rest of the app renders with) instead of bespoke regex, so any input
// marked renders is parsed identically here.
//
// Supported markdown (any number, anywhere in the text — "array format"):
//   [![alt](img)](href)   → badge { imageUrl: img, linkUrl: href, alt }
//   ![alt](img)           → badge { imageUrl: img, alt }
//   [label](href)         → link  { label, href }

import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type { PortfolioBadge, PortfolioUrl } from "../types/portfolio.types.ts";

/** Walk every inline token (depth-first), invoking `visit` on each. */
function walkInline(
  tokens: Token[] | undefined,
  visit: (t: Token) => void,
): void {
  if (!tokens) return;
  for (const t of tokens) {
    visit(t);
    const children = (t as { tokens?: Token[] }).tokens;
    if (children) walkInline(children, visit);
  }
}

/** All inline tokens across the lexed document (paragraphs, headings, ...). */
function inlineTokens(markdown: string): Token[] {
  const collected: Token[] = [];
  for (const block of marked.lexer(markdown)) {
    walkInline([block], (t) => collected.push(t));
  }
  return collected;
}

/**
 * Parse markdown badges (linked or bare images). Returns [] when the input
 * holds no markdown image — callers treat that as "not markdown, keep as-is".
 */
export function parseMarkdownBadges(markdown: string): PortfolioBadge[] {
  const badges: PortfolioBadge[] = [];
  for (const t of inlineTokens(markdown)) {
    if (t.type === "link") {
      // A link wrapping a single image is a clickable badge.
      const link = t as Tokens.Link;
      const inner = link.tokens?.find((c) => c.type === "image") as
        | Tokens.Image
        | undefined;
      if (inner) {
        badges.push({
          imageUrl: inner.href,
          linkUrl: link.href,
          alt: inner.text || undefined,
        });
      }
    } else if (t.type === "image") {
      // A bare image not already captured as a linked badge above.
      const img = t as Tokens.Image;
      badges.push({ imageUrl: img.href, alt: img.text || undefined });
    }
  }
  // Drop bare images that are actually the inner token of a linked badge: the
  // walk visits both the link and its child image, so de-dup by (imageUrl,
  // linkUrl) keeping the linked variant.
  return dedupeBadges(badges);
}

/** Keep one badge per imageUrl, preferring the linked variant. */
function dedupeBadges(badges: PortfolioBadge[]): PortfolioBadge[] {
  const byImage = new Map<string, PortfolioBadge>();
  for (const b of badges) {
    const existing = byImage.get(b.imageUrl);
    if (!existing || (b.linkUrl && !existing.linkUrl)) {
      byImage.set(b.imageUrl, b);
    }
  }
  return [...byImage.values()];
}

/**
 * Parse markdown links `[label](href)`. Image-links (badges) are skipped — use
 * parseMarkdownBadges for those. Returns [] when no plain link is present.
 */
export function parseMarkdownLinks(markdown: string): PortfolioUrl[] {
  const links: PortfolioUrl[] = [];
  for (const t of inlineTokens(markdown)) {
    if (t.type !== "link") continue;
    const link = t as Tokens.Link;
    // Only explicit `[label](href)` markdown — not gfm-autolinked bare URLs
    // (those are plain values typed into the column, kept as-is by the caller).
    if (!link.raw.startsWith("[")) continue;
    // Skip links that wrap an image (those are badges, not text links).
    if (link.tokens?.some((c) => c.type === "image")) continue;
    links.push({ label: link.text || link.href, href: link.href });
  }
  return links;
}
