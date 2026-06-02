import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";

type NavigationTabProps = {
  groupOrder: string[];
  featuresByCategory: Record<string, [string, string][]>;
  sortedCategoryOptions: string[];
  featureToCategory: Record<string, string>;
  categoryNames: string[];
};

export const NavigationTab: FC<NavigationTabProps> = ({
  groupOrder,
  featuresByCategory,
  sortedCategoryOptions,
  featureToCategory,
  categoryNames,
}) => (
  <div class="settings-tabs__panel settings-tabs__panel--navigation">
    <form
      id="nav-categories-form"
      hx-post="/settings/nav-categories"
      hx-trigger="submit"
      hx-swap="none"
    >
      <div class="settings-nav__add-category">
        <input
          type="text"
          id="nav-category-new-name"
          class="settings-field__input"
          placeholder="New category name..."
        />
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-add-category
        >
          Add category
        </button>
      </div>

      <div class="settings-page__bulk-actions">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-nav-expand-all
        >
          Expand all
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-nav-collapse-all
        >
          Collapse all
        </button>
      </div>
      <nav class="settings-nav__jump-bar" data-nav-jump>
        {groupOrder.map((g) => (
          <a
            key={g}
            class="settings-nav__jump-pill"
            href={`#settings-nav-${g.toLowerCase().replace(/\s+/g, "-")}`}
            data-nav-target={`settings-nav-${
              g.toLowerCase().replace(/\s+/g, "-")
            }`}
          >
            {g} ({featuresByCategory[g].length})
          </a>
        ))}
      </nav>

      {categoryNames.map((cat) => (
        <input key={cat} type="hidden" name="categories" value={cat} />
      ))}

      <div id="nav-categories-list" class="settings-nav__feature-list">
        {groupOrder.map((groupName) => (
          <details
            key={groupName}
            class="settings-collapse"
            id={`settings-nav-${groupName.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <summary class="settings-collapse__trigger">
              {`${groupName} (`}
              <span class="settings-collapse__count">
                {featuresByCategory[groupName].length}
              </span>
              {`)`}
            </summary>
            <div class="settings-nav__group-content">
              {featuresByCategory[groupName].length === 0
                ? (
                  <p class="settings-nav__empty">
                    No features assigned
                  </p>
                )
                : featuresByCategory[groupName].map(([key, label]) => (
                  <div key={key} class="settings-nav__feature-row">
                    <span class="settings-nav__feature-label">
                      {label}
                    </span>
                    <select
                      name={`nav_${key}`}
                      class="form__select settings-nav__select"
                    >
                      <option value="" disabled>Select category</option>
                      {sortedCategoryOptions.map((cat) => (
                        <option
                          key={cat}
                          value={cat}
                          selected={featureToCategory[key] === cat}
                        >
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </details>
        ))}
      </div>

      <FormActions />
    </form>
  </div>
);
