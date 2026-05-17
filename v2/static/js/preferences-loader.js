// preferences-loader.js — load PersonPreferences from server, cache in
// sessionStorage, expose as window.__preferences. Must load before keybindings.js.
// Trigger: window.loadPreferences() called after identity change.

(function () {
  var STORAGE_KEY = "__preferences";
  var READY_EVENT = "preferences-ready";

  function dispatch() {
    document.dispatchEvent(new CustomEvent(READY_EVENT));
  }

  function parse(raw) {
    try {
      var obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : {};
    } catch (_e) {
      return {};
    }
  }

  // On script load: restore from sessionStorage so keybindings.js can read
  // synchronously without a network round-trip.
  var cached = sessionStorage.getItem(STORAGE_KEY);
  window.__preferences = cached ? parse(cached) : {};

  // Fetch from server, update sessionStorage + window.__preferences, dispatch ready.
  window.loadPreferences = function () {
    fetch("/api/v1/preferences", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : Promise.resolve({ preferences: {} });
      })
      .then(function (body) {
        var prefs = body.preferences || {};
        window.__preferences = prefs;
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch (_e) {}
        dispatch();
      })
      .catch(function () {
        window.__preferences = {};
        dispatch();
      });
  };

  // Clear on identity change (logout equivalent).
  window.clearPreferences = function () {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_e) {}
    window.__preferences = {};
  };
})();
