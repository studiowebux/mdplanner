// Settings page — tabbed layout: Views, Project, Schedule, Tags, Links.
// Pure CSS tabs via radio buttons.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import { APP_VERSION, ENTITY_TYPE_LABELS, WEEKDAYS } from "../constants/mod.ts";
import type { ProjectConfig } from "../domains/project/types.ts";

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
            id="tab-support"
            class="settings-tabs__radio"
          />
          <label for="tab-support" class="settings-tabs__label">Support</label>

          {/* ---- Views tab ---- */}
          <div class="settings-tabs__panel settings-tabs__panel--views">
            <input
              type="search"
              id="features-search"
              class="settings-page__search"
              placeholder="Filter views..."
              autocomplete="off"
            />

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

              <details class="settings-collapse" open>
                <summary class="settings-collapse__trigger">
                  Enabled ({enabledList.length})
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

              <details class="settings-collapse">
                <summary class="settings-collapse__trigger">
                  Disabled ({disabledList.length})
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
                  Description
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

              <div class="settings-page__form-actions">
                <button type="submit" class="btn btn--primary">Save</button>
              </div>
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

              <div class="settings-page__form-actions">
                <button type="submit" class="btn btn--primary">Save</button>
              </div>
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

              <div class="settings-page__form-actions">
                <button type="submit" class="btn btn--primary">Save</button>
              </div>
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
                  <a href="https://buymeacoffee.com/studiowebux" target="_blank" rel="noopener">
                    Buy Me a Coffee
                  </a>
                </li>
                <li>
                  <a href="https://github.com/sponsors/studiowebux" target="_blank" rel="noopener">
                    GitHub Sponsors
                  </a>
                </li>
                <li>
                  <a href="https://patreon.com/studiowebux" target="_blank" rel="noopener">
                    Patreon
                  </a>
                </li>
              </ul>

              <h3 class="settings-support__subheading">Support</h3>
              <ul class="settings-support__links">
                <li>
                  <a href="https://github.com/studiowebux/mdplanner/issues" target="_blank" rel="noopener">
                    Bug Tracker (GitHub Issues)
                  </a>
                </li>
                <li>
                  <a href="https://discord.gg/BG5Erm9fNv" target="_blank" rel="noopener">
                    Discord
                  </a>
                </li>
              </ul>

              <h3 class="settings-support__subheading">Contact</h3>
              <ul class="settings-support__links">
                <li>
                  <a href="https://studiowebux.com" target="_blank" rel="noopener">
                    Studio Webux
                  </a>
                </li>
              </ul>

              <p class="settings-support__license">
                Licensed under MIT
              </p>
            </section>
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

              <div class="settings-page__form-actions">
                <button type="submit" class="btn btn--primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
