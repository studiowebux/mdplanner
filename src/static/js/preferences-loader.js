// preferences-loader.js — cache PersonPreferences in sessionStorage, expose as
// window.__preferences. Populated from the preferencesLoaded HX-Trigger event
// sent by /settings/identity on person switch — zero extra fetch.

(function () {
  var STORAGE_KEY = "__mdp_preferences";

  function store(prefs) {
    window.__preferences = prefs && typeof prefs === "object" ? prefs : {};
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(window.__preferences));
    } catch (_e) {}
    document.dispatchEvent(new CustomEvent("preferences-ready"));
  }

  // On script load: restore from sessionStorage (synchronous — no network).
  var cached = null;
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch (_e) {}
  window.__preferences = cached && typeof cached === "object" ? cached : {};

  // preferencesLoaded is sent by /settings/identity via HX-Trigger header.
  // htmx dispatches it on the body before HX-Refresh triggers the reload,
  // so sessionStorage is written before the new page load reads it.
  document.addEventListener("preferencesLoaded", function (e) {
    var prefs = e.detail && e.detail.value ? e.detail.value : {};
    store(prefs);
  });

  // Clear when identity is removed (anonymous / logout).
  window.clearPreferences = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_e) {}
    window.__preferences = {};
  };
})();
