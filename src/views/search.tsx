import { Fragment } from "hono/jsx";
import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import type { SearchResult } from "../types/search.types.ts";
import { ENTITY_TYPE_LABELS } from "../constants/mod.ts";
import { parseSnippet } from "../utils/html.ts";

interface SearchViewProps extends ViewProps {
  query: string;
  results: SearchResult[];
}

export const SearchView: FC<SearchViewProps> = ({
  query,
  results,
  ...viewProps
}) => {
  return (
    <MainLayout
      title={query ? `Search: ${query}` : "Search"}
      {...viewProps}
      styles={["/css/views/search.css"]}
    >
      <main class="search-page">
        <h1 class="search-page__title">Search</h1>
        {query && (
          <p class="search-page__summary">
            {results.length} result{results.length !== 1 ? "s" : ""}{" "}
            for "{query}"
          </p>
        )}
        {!query && (
          <p class="search-page__summary">
            Enter a search term in the topbar.
          </p>
        )}
        {results.length > 0 && (
          <ul class="search-results">
            {results.map((r) => (
              <li class="search-results__item">
                <span
                  class={`search-results__badge search-results__badge--${r.type}`}
                >
                  {ENTITY_TYPE_LABELS[r.type] ?? r.type}
                </span>
                <div class="search-results__content">
                  <span class="search-results__title">{r.title}</span>
                  <span class="search-results__snippet">
                    {parseSnippet(r.snippet).map((seg, i) =>
                      seg.mark
                        ? <mark key={i}>{seg.text}</mark>
                        : <Fragment key={String(i)}>{seg.text}</Fragment>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {query && results.length === 0 && (
          <p class="search-page__empty">No results found.</p>
        )}
      </main>
    </MainLayout>
  );
};
