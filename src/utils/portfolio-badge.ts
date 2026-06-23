// Parse/serialize external status-badge markdown for portfolio items.
// Input surface is markdown (one badge per line); storage is structured
// PortfolioBadge[]. Supports linked badges `[![alt](img)](link)` and bare
// images `![alt](img)`. Malformed lines are skipped, not thrown.

import type { PortfolioBadge } from "../types/portfolio.types.ts";

// [![alt](img)](link)
const LINKED = /^\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)$/;
// ![alt](img)
const BARE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

/** Parse badge markdown (one badge per line) into structured badges. */
export function parseBadgeMarkdown(text: string): PortfolioBadge[] {
  const badges: PortfolioBadge[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const linked = line.match(LINKED);
    if (linked) {
      badges.push({
        alt: linked[1] || undefined,
        imageUrl: linked[2].trim(),
        linkUrl: linked[3].trim(),
      });
      continue;
    }
    const bare = line.match(BARE);
    if (bare) {
      badges.push({ alt: bare[1] || undefined, imageUrl: bare[2].trim() });
    }
  }
  return badges;
}

/** Serialize structured badges back to markdown (one badge per line). */
export function badgesToMarkdown(badges: PortfolioBadge[]): string {
  return badges
    .map((b) => {
      const img = `![${b.alt ?? ""}](${b.imageUrl})`;
      return b.linkUrl ? `[${img}](${b.linkUrl})` : img;
    })
    .join("\n");
}
