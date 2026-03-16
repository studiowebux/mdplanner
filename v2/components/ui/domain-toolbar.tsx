import type { FC } from "hono/jsx";
import { FilterBar } from "./filter-bar.tsx";
import { ColumnToggle } from "./column-toggle.tsx";
import { ViewToggle } from "./view-toggle.tsx";
import type { FilterDef } from "./filter-bar.tsx";

type Props = {
  domain: string;
  filters?: FilterDef[];
  columns?: { key: string; label: string }[];
  searchPlaceholder?: string;
  completedStatus?: string;
};

// Unified toolbar: search + filters + hide completed + view toggle + column toggle.
// Renders below the page header in every domain view.
export const DomainToolbar: FC<Props> = ({ domain, filters, columns, searchPlaceholder, completedStatus }) => (
  <div class="domain-toolbar">
    <div class="domain-toolbar__left">
      <input
        type="search"
        class="domain-toolbar__search"
        placeholder={searchPlaceholder ?? "Search..."}
        data-search-domain={domain}
        aria-label="Search"
      />
      {filters && filters.length > 0 && (
        <FilterBar domain={domain} filters={filters} />
      )}
    </div>
    <div class="domain-toolbar__right">
      {completedStatus && (
        <label class="domain-toolbar__toggle">
          <input
            type="checkbox"
            data-hide-completed={domain}
            data-completed-status={completedStatus}
          />
          <span class="domain-toolbar__toggle-label">Hide completed</span>
        </label>
      )}
      <ViewToggle domain={domain} />
      {columns && columns.length > 0 && (
        <ColumnToggle domain={domain} columns={columns} />
      )}
    </div>
  </div>
);
