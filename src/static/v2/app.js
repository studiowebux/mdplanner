// v2 POC — proves view-registry + view-loader architecture end-to-end.
//
// This file is temporary scaffolding. After the POC is validated, the
// view-registry and view-loader modules will be integrated into the
// main app.js and this file will be removed.

import { VIEWS } from "../modules/ui/view-registry.js";
import { ensureView } from "../modules/ui/view-loader.js";
import { AnalyticsModule } from "../modules/views/analytics.js";

// Build a minimal TaskManager stand-in that satisfies the registry's
// bind/load callbacks. AnalyticsModule stores tm but never uses it
// for data loading — it calls AnalyticsAPI.fetch() directly.
const tm = {};
tm.analyticsModule = new AnalyticsModule(tm);

/** @type {Set<string>} Track which views have had bind() called */
const _bound = new Set();

/**
 * Switch to a view: lazy-load its partial, bind events on first load,
 * hide all other views, show the target, and fetch its data.
 * @param {string} viewId
 */
async function switchView(viewId) {
  const def = VIEWS[viewId];
  if (!def) {
    console.error(`[v2] Unknown view: "${viewId}"`);
    return;
  }

  // Reset nav buttons — data-driven from registry
  for (const entry of Object.values(VIEWS)) {
    document.getElementById(entry.navBtnId)
      ?.classList.remove("v2-nav-btn--active");
  }

  // Hide all loaded views
  for (const id of Object.keys(VIEWS)) {
    document.getElementById(`${id}View`)?.classList.add("hidden");
  }

  // Lazy-load partial (no-op if already cached)
  try {
    const firstLoad = await ensureView(viewId);

    // Bind events after DOM elements exist — runs once per view
    if (firstLoad && !_bound.has(viewId)) {
      def.bind?.(tm);
      _bound.add(viewId);
    }
  } catch (err) {
    console.error(`[v2] Failed to load view "${viewId}":`, err);
    const container = document.getElementById("viewContainer");
    if (container) {
      container.insertAdjacentHTML(
        "beforeend",
        `<div class="v2-error">Failed to load view. Check the console.</div>`,
      );
    }
    return;
  }

  // Show view
  document.getElementById(`${viewId}View`)?.classList.remove("hidden");

  // Activate nav button
  document.getElementById(def.navBtnId)
    ?.classList.add("v2-nav-btn--active");

  // Load data — driven by the registry callback
  def.load?.(tm);
}

// Wire nav buttons — delegate via data-view attribute
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".v2-nav")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (btn) switchView(btn.dataset.view);
  });

  // Load default view
  switchView("analytics");
});
