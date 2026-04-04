// View Loader — lazy HTML partial fetcher with DOM injection and caching.
//
// Usage:
//   const firstLoad = await ensureView("analytics");
//   if (firstLoad) { /* bind events — DOM elements now exist */ }
//
// Partials are fetched once per session. Subsequent calls for the same
// viewId return immediately (no network request, no DOM mutation).

import { VIEWS } from "./view-registry.js";

/** @type {Set<string>} */
const _loaded = new Set();

/**
 * Ensure a view's HTML partial is present in the DOM.
 *
 * On first call for a given viewId: fetches the partial from the server,
 * injects it into #viewContainer, and marks it as loaded.
 *
 * @param {string} viewId — key in the VIEWS registry
 * @returns {Promise<boolean>} true if the partial was freshly loaded,
 *   false if it was already present (cache hit)
 * @throws {Error} if viewId is unknown or the fetch fails
 */
export async function ensureView(viewId) {
  if (_loaded.has(viewId)) return false;

  const def = VIEWS[viewId];
  if (!def) {
    throw new Error(`[view-loader] Unknown view: "${viewId}"`);
  }

  const container = document.getElementById("viewContainer");
  if (!container) {
    throw new Error("[view-loader] #viewContainer not found in DOM");
  }

  const resp = await fetch(def.partial);
  if (!resp.ok) {
    throw new Error(
      `[view-loader] Failed to load view "${viewId}": HTTP ${resp.status}`,
    );
  }

  const html = await resp.text();
  container.insertAdjacentHTML("beforeend", html);
  _loaded.add(viewId);
  return true;
}

/**
 * Check whether a view's partial has been loaded into the DOM.
 * @param {string} viewId
 * @returns {boolean}
 */
export function isViewLoaded(viewId) {
  return _loaded.has(viewId);
}
