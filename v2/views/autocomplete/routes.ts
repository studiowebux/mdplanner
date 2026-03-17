// Autocomplete — server-rendered search results for form fields.
// Returns <li> fragments consumed by htmx in FormBuilder autocomplete fields.
// Sources are registered by name — any domain can add one.

import { Hono } from "hono";
import type { AppVariables } from "../../types/app.ts";

type AutocompleteSource = {
  search: (q: string) => Promise<Record<string, unknown>[]>;
  list: () => Promise<Record<string, unknown>[]>;
  displayKey: string;
  valueKey: string;
};

const sources: Record<string, AutocompleteSource> = {};

export function registerAutocompleteSource(
  name: string,
  source: AutocompleteSource,
) {
  sources[name] = source;
}

export const autocompleteRouter = new Hono<{ Variables: AppVariables }>();

// GET /autocomplete/:source?q=...
autocompleteRouter.get("/:source", async (c) => {
  const name = c.req.param("source");
  const src = sources[name];
  if (!src) return c.text("Unknown source", 404);

  const q = c.req.query("q")?.trim().toLowerCase() ?? "";
  const items = q ? await src.search(q) : await src.list();
  return c.html(renderItems(items, src.displayKey, src.valueKey, q));
});

function renderItems(
  items: Record<string, unknown>[],
  displayKey: string,
  valueKey: string,
  q: string,
): string {
  if (items.length === 0) {
    return `<li class="form__autocomplete-empty">No results</li>`;
  }
  return items.map((item) => {
    const text = String(item[displayKey] ?? "");
    const value = String(item[valueKey] ?? "");
    const highlighted = q ? highlightMatch(text, q) : escapeHtml(text);
    return `<li class="form__autocomplete-item" data-value="${
      escapeAttr(value)
    }">${highlighted}</li>`;
  }).join("");
}

function highlightMatch(text: string, q: string): string {
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return escapeHtml(text);
  return (
    escapeHtml(text.slice(0, idx)) +
    `<strong>${escapeHtml(text.slice(idx, idx + q.length))}</strong>` +
    escapeHtml(text.slice(idx + q.length))
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
