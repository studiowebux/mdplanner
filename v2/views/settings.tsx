// Settings page — tabbed layout.
// Pure CSS tabs via radio buttons.
// Each tab panel lives in v2/views/settings/tabs/.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import {
  DEFAULT_NAV_CATEGORIES,
  ENTITY_TYPE_LABELS,
} from "../constants/mod.ts";
import type { ProjectConfig } from "../types/project.types.ts";
import { ViewsTab } from "./settings/tabs/views-tab.tsx";
import { ProjectTab } from "./settings/tabs/project-tab.tsx";
import { ScheduleTab } from "./settings/tabs/schedule-tab.tsx";
import { TagsTab } from "./settings/tabs/tags-tab.tsx";
import { GoalsTab } from "./settings/tabs/goals-tab.tsx";
import { CachingTab } from "./settings/tabs/caching-tab.tsx";
import { SupportTab } from "./settings/tabs/support-tab.tsx";
import { NavigationTab } from "./settings/tabs/navigation-tab.tsx";
import { SectionsTab } from "./settings/tabs/sections-tab.tsx";
import { LinksTab } from "./settings/tabs/links-tab.tsx";

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
  // Seed from defaults so new features get their intended category,
  // then overlay with user's saved config (takes precedence).
  for (const [cat, keys] of Object.entries(DEFAULT_NAV_CATEGORIES)) {
    for (const key of keys) featureToCategory[key] = cat;
  }
  for (const [cat, keys] of Object.entries(navCategories)) {
    for (const key of keys) featureToCategory[key] = cat;
  }
  const featuresByCategory: Record<string, [string, string][]> = {};
  for (const [key, label] of allFeatures) {
    const cat = featureToCategory[key] ?? categoryNames[0] ?? "Uncategorized";
    if (!featuresByCategory[cat]) featuresByCategory[cat] = [];
    featuresByCategory[cat].push([key, label]);
  }
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
            id="tab-goals"
            class="settings-tabs__radio"
          />
          <label for="tab-goals" class="settings-tabs__label">Goals</label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-caching"
            class="settings-tabs__radio"
          />
          <label for="tab-caching" class="settings-tabs__label">Caching</label>

          <input
            type="radio"
            name="settings-tab"
            id="tab-support"
            class="settings-tabs__radio"
          />
          <label for="tab-support" class="settings-tabs__label">Support</label>

          <ViewsTab enabledList={enabledList} disabledList={disabledList} />
          <ProjectTab config={config} />
          <ScheduleTab config={config} activeWorkingDays={activeWorkingDays} />
          <TagsTab config={config} />
          <LinksTab links={links} />
          <NavigationTab
            groupOrder={groupOrder}
            featuresByCategory={featuresByCategory}
            sortedCategoryOptions={sortedCategoryOptions}
            featureToCategory={featureToCategory}
            categoryNames={categoryNames}
          />
          <SectionsTab />
          <GoalsTab config={config} />
          <CachingTab />
          <SupportTab />
        </div>
      </div>
    </MainLayout>
  );
};
