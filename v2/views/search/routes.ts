import { Hono } from "hono";
import { SearchView } from "../search.tsx";
import { getSearchEngine } from "../../singletons/services.ts";
import { ENTITY_TYPE_LABELS, ENTITY_TYPE_ROUTES } from "../../constants/mod.ts";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";

export const searchRouter = new Hono<{ Variables: AppVariables }>();

// Full page results
searchRouter.get("/", (c) => {
  const query = c.req.query("q")?.trim() ?? "";
  const engine = getSearchEngine();
  const results = engine ? engine.search(query) : [];
  return c.html(
    SearchView({
      ...viewProps(c),
      query,
      results,
    }) as unknown as string,
  );
});

// Fragment endpoint for live search modal (returns <li> items only)
searchRouter.get("/results", (c) => {
  const query = c.req.query("q")?.trim() ?? "";
  if (!query) {
    return c.html(`<li class="search-dialog__empty">Type to search...</li>`);
  }
  const engine = getSearchEngine();
  const results = engine ? engine.search(query, { limit: 10 }) : [];
  if (results.length === 0) {
    return c.html(`<li class="search-dialog__empty">No results found</li>`);
  }
  const html = results.map((r) => {
    const label = escapeHtml(ENTITY_TYPE_LABELS[r.type] ?? r.type);
    const title = escapeHtml(r.title);
    const route = ENTITY_TYPE_ROUTES[r.type];
    const href = route ? `${route}/${escapeHtml(r.id)}` : "";
    const snippet = r.snippet && r.snippet !== "null" ? r.snippet : "";
    return `<li class="search-dialog__result" data-type="${
      escapeHtml(r.type)
    }" data-id="${escapeHtml(r.id)}" data-href="${href}">` +
      `<span class="search-dialog__badge search-dialog__badge--${
        escapeHtml(r.type)
      }">${label}</span>` +
      `<span class="search-dialog__result-title">${title}</span>` +
      `<span class="search-dialog__result-snippet">${snippet}</span>` +
      `</li>`;
  }).join("");
  return c.html(html);
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
