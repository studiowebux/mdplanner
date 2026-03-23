// Settings page — tabbed layout: Views, Project, Schedule, Tags, Links.
// Pure CSS tabs via radio buttons.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import {
  APP_VERSION,
  DEFAULT_NAV_CATEGORIES,
  ENTITY_TYPE_LABELS,
  getSectionOrder,
  WEEKDAYS,
} from "../constants/mod.ts";
import type { ProjectConfig } from "../domains/project/types.ts";
import { FormActions } from "../components/ui/form-actions.tsx";

type SettingsProps = ViewProps & {
  config: ProjectConfig;
};

export const SettingsView: FC<SettingsProps> = ({
  config,
  enabledFeatures,
  ...viewProps
}) => {
  const enabled = new Set(enabledFeatures ?? []);
  const allFeatures = Object.entries(ENTITY_TYPE_LABELS).sort(([, a], [, b]) =>
    a.localeCompare(b)
  );
  const enabledList = allFeatures.filter(([key]) => enabled.has(key));
  const disabledList = allFeatures.filter(([key]) => !enabled.has(key));
  const activeWorkingDays = new Set(config.workingDays ?? []);
  const links = config.links ?? [];
  const navCategories = config.navCategories ?? DEFAULT_NAV_CATEGORIES;
  const categoryNames = Object.keys(navCategories).sort((a, b) =>
    a.localeCompare(b)
  );
  const featureToCategory: Record<string, string> = {};
  for (const [cat, keys] of Object.entries(navCategories)) {
    for (const key of keys) featureToCategory[key] = cat;
  }
  // Group features by current category for display
  const featuresByCategory: Record<string, [string, string][]> = {};
  for (const [key, label] of allFeatures) {
    const cat = featureToCategory[key] ?? categoryNames[0] ?? "Uncategorized";
    if (!featuresByCategory[cat]) featuresByCategory[cat] = [];
    featuresByCategory[cat].push([key, label]);
  }
  // Include empty categories too (they exist in navCategories but have no features)
  for (const cat of categoryNames) {
    if (!featuresByCategory[cat]) featuresByCategory[cat] = [];
  }
  const groupOrder = [
    ...new Set([...categoryNames, ...Object.keys(featuresByCategory)]),
  ];
  const sortedCategoryOptions = [...categoryNames].sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <MainLayout
      title="Settings"
      {...viewProps}
      enabledFeatures={enabledFeatures}
      activePath="/settings"
      styles={["/css/views/settings.css"]}
      scripts={["/js/settings.js"]}
    >
      <div class="settings-page">
        <h1 class="settings-page__title">Settings</h1>

        <div class="settings-tabs">
          {/* Tab radios + labels */}
          <input
            type="radio"
            name="settings-tab"
            id="tab-views"
            class="settings-tabs__radio"
            checked
          />
          <label for="tab-views" class="settings-tabs__label">Views</label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-project"
            class="settings-tabs__radio"
          />
          <label for="tab-project" class="settings-tabs__label">Project</label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-schedule"
            class="settings-tabs__radio"
          />
          <label for="tab-schedule" class="settings-tabs__label">
            Schedule
          </label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-tags"
            class="settings-tabs__radio"
          />
          <label for="tab-tags" class="settings-tabs__label">Tags</label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-links"
            class="settings-tabs__radio"
          />
          <label for="tab-links" class="settings-tabs__label">Links</label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-navigation"
            class="settings-tabs__radio"
          />
          <label for="tab-navigation" class="settings-tabs__label">
            Navigation
          </label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-sections"
            class="settings-tabs__radio"
          />
          <label for="tab-sections" class="settings-tabs__label">
            Sections
          </label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-support"
            class="settings-tabs__radio"
          />
          <label for="tab-support" class="settings-tabs__label">Support</label>

          {/* ---- Views tab ---- */}
          <div class="settings-tabs__panel settings-tabs__panel--views">
            <div class="settings-page__search-row">
              <input
                type="search"
                id="features-search"
                class="settings-page__search"
                placeholder="Filter views..."
                autocomplete="off"
              />
              <span id="features-count" class="domain-page__count"></span>
            </div>

            <form
              id="features-form"
              hx-post="/settings/features"
              hx-trigger="change"
              hx-swap="none"
            >
              <div class="settings-page__bulk-actions">
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  data-check-all
                >
                  Check all
                </button>
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  data-uncheck-all
                >
                  Uncheck all
                </button>
              </div>

              <details id="features-enabled" class="settings-collapse" open>
                <summary class="settings-collapse__trigger">
                  Enabled (<span class="settings-collapse__count">
                    {enabledList.length}
                  </span>)
                </summary>
                <ul class="settings-page__feature-list">
                  {enabledList.map(([key, label]) => (
                    <li key={key} class="settings-page__feature-item">
                      <label class="settings-page__feature-label">
                        <input
                          type="checkbox"
                          name="features"
                          value={key}
                          checked
                          class="settings-page__checkbox"
                        />
                        {label}
                        <span class="settings-page__feature-key">{key}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>

              <details id="features-disabled" class="settings-collapse">
                <summary class="settings-collapse__trigger">
                  Disabled (<span class="settings-collapse__count">
                    {disabledList.length}
                  </span>)
                </summary>
                <ul class="settings-page__feature-list">
                  {disabledList.map(([key, label]) => (
                    <li key={key} class="settings-page__feature-item">
                      <label class="settings-page__feature-label">
                        <input
                          type="checkbox"
                          name="features"
                          value={key}
                          class="settings-page__checkbox"
                        />
                        {label}
                        <span class="settings-page__feature-key">{key}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            </form>
          </div>

          {/* ---- Project tab ---- */}
          <div class="settings-tabs__panel settings-tabs__panel--project">
            <form
              id="project-form"
              hx-post="/settings/project"
              hx-trigger="submit"
              hx-swap="none"
            >
              <div class="settings-field">
                <label class="settings-field__label" for="cfg-name">
                  Project name
                </label>
                <input
                  type="text"
                  id="cfg-name"
                  name="name"
                  value={config.name}
                  class="settings-field__input"
                />
              </div>

              <div class="settings-field">
                <label class="settings-field__label" for="cfg-description">
                  Description (markdown)
                </label>
                <textarea
                  id="cfg-description"
                  name="description"
                  class="settings-field__textarea"
                  rows={4}
                >
                  {config.description ?? ""}
                </textarea>
              </div>

              <div class="settings-field settings-field--row">
                <div class="settings-field">
                  <label class="settings-field__label" for="cfg-locale">
                    Locale (BCP 47)
                  </label>
                  <input
                    type="text"
                    id="cfg-locale"
                    name="locale"
                    value={config.locale ?? "en-US"}
                    placeholder="en-US"
                    class="settings-field__input"
                  />
                </div>
                <div class="settings-field">
                  <label class="settings-field__label" for="cfg-currency">
                    Currency (ISO 4217)
                  </label>
                  <input
                    type="text"
                    id="cfg-currency"
                    name="currency"
                    value={config.currency ?? "USD"}
                    placeholder="USD"
                    class="settings-field__input"
                  />
                </div>
              </div>

              <div class="settings-field">
                <label class="settings-field__label" for="cfg-port">
                  Server port
                </label>
                <input
                  type="number"
                  id="cfg-port"
                  name="port"
                  value={config.port ?? 8003}
                  min={1}
                  max={65535}
                  class="settings-field__input settings-field__input--narrow"
                />
                <span class="settings-field__hint">
                  PORT env var takes precedence. Restart required after change.
                </span>
              </div>

              <div class="settings-field">
                <label class="settings-field__label" for="cfg-github-token">
                  GitHub token (PAT)
                </label>
                <div class="settings-field__input-row">
                  <input
                    type="password"
                    id="cfg-github-token"
                    name="githubToken"
                    value={config.githubToken ?? ""}
                    placeholder="ghp_..."
                    class="settings-field__input"
                    autocomplete="off"
                  />
                  <button
                    type="button"
                    class="btn btn--secondary btn--sm"
                    data-clear-input="cfg-github-token"
                  >
                    Clear
                  </button>
                </div>
                <span class="settings-field__hint">
                  Shared across all portfolio items. Set MDPLANNER_SECRET_KEY to
                  encrypt at rest.
                </span>
              </div>

              <div class="settings-field">
                <label class="settings-field__label" for="cfg-cloudflare-token">
                  Cloudflare token (API Token)
                </label>
                <div class="settings-field__input-row">
                  <input
                    type="password"
                    id="cfg-cloudflare-token"
                    name="cloudflareToken"
                    value={config.cloudflareToken ?? ""}
                    placeholder="Bearer token..."
                    class="settings-field__input"
                    autocomplete="off"
                  />
                  <button
                    type="button"
                    class="btn btn--secondary btn--sm"
                    data-clear-input="cfg-cloudflare-token"
                  >
                    Clear
                  </button>
                </div>
                <span class="settings-field__hint">
                  Used for DNS sync. Requires Zone:Read, DNS:Read permissions.
                  Registrar:Read is optional for expiry data.
                </span>
              </div>

              <FormActions />
            </form>
          </div>

          {/* ---- Schedule tab ---- */}
          <div class="settings-tabs__panel settings-tabs__panel--schedule">
            <form
              id="schedule-form"
              hx-post="/settings/schedule"
              hx-trigger="submit"
              hx-swap="none"
            >
              <div class="settings-field">
                <label class="settings-field__label" for="cfg-start-date">
                  Project start date
                </label>
                <input
                  type="date"
                  id="cfg-start-date"
                  name="startDate"
                  value={config.startDate ?? ""}
                  class="settings-field__input settings-field__input--narrow"
                />
              </div>

              <div class="settings-field">
                <label
                  class="settings-field__label"
                  for="cfg-working-days-per-week"
                >
                  Working days per week
                </label>
                <input
                  type="number"
                  id="cfg-working-days-per-week"
                  name="workingDaysPerWeek"
                  value={config.workingDaysPerWeek ?? 5}
                  min={1}
                  max={7}
                  class="settings-field__input settings-field__input--narrow"
                />
              </div>

              <fieldset class="settings-field settings-field--fieldset">
                <legend class="settings-field__label">Working days</legend>
                <div class="settings-page__day-grid">
                  {WEEKDAYS.map((day) => (
                    <label key={day} class="settings-page__day-label">
                      <input
                        type="checkbox"
                        name="workingDays"
                        value={day}
                        checked={activeWorkingDays.has(day)}
                        class="settings-page__checkbox"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </fieldset>

              <FormActions />
            </form>
          </div>

          {/* ---- Tags tab ---- */}
          <div class="settings-tabs__panel settings-tabs__panel--tags">
            <form
              id="tags-form"
              hx-post="/settings/tags"
              hx-trigger="submit"
              hx-swap="none"
            >
              <div id="tags-list" class="settings-tag-list">
                {(config.tags ?? []).map((tag, i) => (
                  <div key={i} class="settings-tag-row">
                    <input
                      type="text"
                      name="tags"
                      value={tag}
                      class="settings-field__input"
                    />
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      data-remove-tag
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div class="settings-page__bulk-actions">
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  data-add-tag
                >
                  Add tag
                </button>
              </div>

              <FormActions />
            </form>
          </div>

          {/* ---- Support tab ---- */}
          <div class="settings-tabs__panel settings-tabs__panel--support">
            <section class="settings-support">
              <h2 class="settings-support__heading">MDPlanner</h2>
              <p class="settings-support__version">
                Version {APP_VERSION}
              </p>

              <h3 class="settings-support__subheading">Funding</h3>
              <ul class="settings-support__links">
                <li>
                  <a
                    href="https://buymeacoffee.com/studiowebux"
                    target="_blank"
                    rel="noopener"
                  >
                    Buy Me a Coffee
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/sponsors/studiowebux"
                    target="_blank"
                    rel="noopener"
                  >
                    GitHub Sponsors
                  </a>
                </li>
                <li>
                  <a
                    href="https://patreon.com/studiowebux"
                    target="_blank"
                    rel="noopener"
                  >
                    Patreon
                  </a>
                </li>
              </ul>

              <h3 class="settings-support__subheading">Support</h3>
              <ul class="settings-support__links">
                <li>
                  <a
                    href="https://github.com/studiowebux/mdplanner/issues"
                    target="_blank"
                    rel="noopener"
                  >
                    Bug Tracker (GitHub Issues)
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.gg/BG5Erm9fNv"
                    target="_blank"
                    rel="noopener"
                  >
                    Discord
                  </a>
                </li>
              </ul>

              <h3 class="settings-support__subheading">Contact</h3>
              <ul class="settings-support__links">
                <li>
                  <a
                    href="https://studiowebux.com"
                    target="_blank"
                    rel="noopener"
                  >
                    Studio Webux
                  </a>
                </li>
              </ul>

              <p class="settings-support__license">
                Licensed under MIT
              </p>
            </section>
          </div>

          {/* ---- Navigation tab ---- */}
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

              {/* Jump links */}
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
                    href={`#settings-nav-${
                      g.toLowerCase().replace(/\s+/g, "-")
                    }`}
                    data-nav-target={`settings-nav-${
                      g.toLowerCase().replace(/\s+/g, "-")
                    }`}
                  >
                    {g} ({featuresByCategory[g].length})
                  </a>
                ))}
              </nav>

              {/* Hidden inputs to preserve category names (including empty ones) */}
              {categoryNames.map((cat) => (
                <input key={cat} type="hidden" name="categories" value={cat} />
              ))}

              <div id="nav-categories-list" class="settings-nav__feature-list">
                {groupOrder.map((groupName) => (
                  <details
                    key={groupName}
                    class="settings-collapse"
                    id={`settings-nav-${
                      groupName.toLowerCase().replace(/\s+/g, "-")
                    }`}
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

          {/* ---- Sections tab ---- */}
          <div class="settings-tabs__panel settings-tabs__panel--sections">
            <form
              id="sections-form"
              hx-post="/settings/sections"
              hx-trigger="submit"
              hx-swap="none"
            >
              <div id="sections-list" class="settings-section-list">
                {getSectionOrder().map((s, i) => (
                  <div key={i} class="settings-section-row">
                    <span class="settings-section-row__position">{i + 1}</span>
                    <input
                      type="text"
                      name="sections"
                      value={s}
                      class="settings-field__input"
                      readonly
                    />
                    <div class="settings-section-row__actions">
                      <button
                        type="button"
                        class="btn btn--secondary btn--sm"
                        data-section-up
                        disabled={i === 0}
                      >
                        &#9650;
                      </button>
                      <button
                        type="button"
                        class="btn btn--secondary btn--sm"
                        data-section-down
                        disabled={i === getSectionOrder().length - 1}
                      >
                        &#9660;
                      </button>
                      <button
                        type="button"
                        class="btn btn--danger btn--sm"
                        data-section-remove
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div class="settings-section-add">
                <input
                  type="text"
                  id="section-new-name"
                  class="settings-field__input"
                  placeholder="New section name..."
                />
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  data-section-add
                >
                  Add
                </button>
              </div>

              <FormActions />
            </form>
          </div>

          {/* ---- Links tab ---- */}
          <div class="settings-tabs__panel settings-tabs__panel--links">
            <form
              id="links-form"
              hx-post="/settings/links"
              hx-trigger="submit"
              hx-swap="none"
            >
              <div id="links-list">
                {links.map((link, i) => (
                  <div key={i} class="settings-link-row">
                    <input
                      type="text"
                      name={`link_title_${i}`}
                      value={link.title}
                      placeholder="Title"
                      class="settings-field__input"
                    />
                    <input
                      type="url"
                      name={`link_url_${i}`}
                      value={link.url}
                      placeholder="https://..."
                      class="settings-field__input"
                    />
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      data-remove-link
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div class="settings-page__bulk-actions">
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  data-add-link
                >
                  Add link
                </button>
              </div>

              <FormActions />
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
