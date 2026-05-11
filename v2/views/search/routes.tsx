import { Hono } from "hono";
import { SearchView } from "../search.tsx";
import { getSearchEngine } from "../../singletons/services.ts";
import {
  buildNavLinks,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_ROUTES,
} from "../../constants/mod.ts";
import { escapeHtml, escapeSnippetHtml } from "../../utils/html.ts";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";

export const searchRouter = new Hono<{ Variables: AppVariables }>();

// ---------------------------------------------------------------------------
// Fuzzy scoring — Levenshtein-based per-token match, returns 0..1.
// Splits query and candidate into tokens, scores each query token against the
// best matching candidate token, returns the mean. Threshold ≥ 0.45 filters
// garbage while tolerating 1-2 char typos on typical nav link names.
// ---------------------------------------------------------------------------
const FUZZY_THRESHOLD = 0.45;

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from(
    { length: m + 1 },
    (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyScore(query: string, candidate: string): number {
  const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const cTokens = candidate.toLowerCase().split(/\s+/).filter(Boolean);
  if (qTokens.length === 0 || cTokens.length === 0) return 0;
  let total = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const ct of cTokens) {
      const maxLen = Math.max(qt.length, ct.length);
      if (maxLen === 0) continue;
      // Exact substring match scores 1.0
      if (ct.includes(qt) || qt.includes(ct)) {
        best = 1;
        break;
      }
      const score = 1 - levenshtein(qt, ct) / maxLen;
      if (score > best) best = score;
    }
    total += best;
  }
  return total / qTokens.length;
}

function matchNavLinks(
  links: { href: string; label: string }[],
  query: string,
): { href: string; label: string; score: number }[] {
  const scored = links.map((link) => ({
    ...link,
    score: fuzzyScore(query, link.label),
  })).filter((l) => l.score >= FUZZY_THRESHOLD);
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// Full page results
searchRouter.get("/", (c) => {
  const query = c.req.query("q")?.trim() ?? "";
  const engine = getSearchEngine();
  const results = engine ? engine.search(query) : [];
  return c.html(
    <SearchView {...viewProps(c)} query={query} results={results} />,
  );
});

// Fragment endpoint for live search modal (returns <li> items only)
searchRouter.get("/results", (c) => {
  const query = c.req.query("q")?.trim() ?? "";
  const enabledFeatures = c.get("enabledFeatures") ?? [];
  const allNavLinks = buildNavLinks(enabledFeatures);

  if (!query) {
    if (allNavLinks.length === 0) {
      return c.html(`<li class="search-dialog__empty">Type to search...</li>`);
    }
    const items = allNavLinks.map((link) =>
      `<li class="search-dialog__result search-dialog__result--nav" data-href="${
        escapeHtml(link.href)
      }">` +
      `<span class="search-dialog__badge search-dialog__badge--nav">Go</span>` +
      `<span class="search-dialog__result-title">${
        escapeHtml(link.label)
      }</span>` +
      `<span class="search-dialog__result-nav-hint">${
        escapeHtml(link.href)
      }</span>` +
      `</li>`
    ).join("");
    return c.html(
      `<li class="search-dialog__section-label">Navigate to</li>${items}`,
    );
  }

  // Nav links filtered + sorted by fuzzy score
  const matchedNav = matchNavLinks(allNavLinks, query);
  const navHtml = matchedNav.length > 0
    ? `<li class="search-dialog__section-label">Navigate to</li>` +
      matchedNav.map((link) =>
        `<li class="search-dialog__result search-dialog__result--nav" data-href="${
          escapeHtml(link.href)
        }">` +
        `<span class="search-dialog__badge search-dialog__badge--nav">Go</span>` +
        `<span class="search-dialog__result-title">${
          escapeHtml(link.label)
        }</span>` +
        `<span class="search-dialog__result-nav-hint">${
          escapeHtml(link.href)
        }</span>` +
        `</li>`
      ).join("")
    : "";

  // Content search results
  const engine = getSearchEngine();
  const results = engine ? engine.search(query, { limit: 10 }) : [];
  const resultsHtml = results.length > 0
    ? `<li class="search-dialog__section-label">Results</li>` +
      results.map((r) => {
        const label = escapeHtml(ENTITY_TYPE_LABELS[r.type] ?? r.type);
        const title = escapeHtml(r.title);
        const route = ENTITY_TYPE_ROUTES[r.type];
        const href = route ? `${route}/${escapeHtml(r.id)}` : "";
        const snippet = r.snippet && r.snippet !== "null"
          ? escapeSnippetHtml(r.snippet)
          : "";
        return `<li class="search-dialog__result" data-type="${
          escapeHtml(r.type)
        }" data-id="${escapeHtml(r.id)}" data-href="${href}">` +
          `<span class="search-dialog__badge search-dialog__badge--${
            escapeHtml(r.type)
          }">${label}</span>` +
          `<span class="search-dialog__result-title">${title}</span>` +
          `<span class="search-dialog__result-snippet">${snippet}</span>` +
          `</li>`;
      }).join("")
    : "";

  if (!navHtml && !resultsHtml) {
    return c.html(`<li class="search-dialog__empty">No results found</li>`);
  }

  return c.html(navHtml + resultsHtml);
});
