// keybindings.js — load default keybinding map, merge localStorage overrides,
// expose as window.keybindings. Must load before view-mode-shortcuts.js,
// table-keyboard-nav.js, and task-list.js.

(function () {
  var STORAGE_KEY = "keybindings";

  var DEFAULTS = {
    chordLeader: "m",
    modes: {
      g: "grid",
      l: "table",
      t: "timeline",
      b: "board",
      o: "org",
      c: "card",
    },
    nav: {
      down: "j",
      up: "k",
      top: "g",
      bottom: "G",
      select: "x",
      selectAll: "a",
    },
  };

  function mergeDeep(target, source) {
    var out = {};
    var key;
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        out[key] = target[key];
      }
    }
    if (!source || typeof source !== "object") return out;
    for (key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key]) &&
        typeof target[key] === "object"
      ) {
        out[key] = mergeDeep(target[key], source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  var localOverrides = {};
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        localOverrides = parsed;
      }
    }
  } catch (_e) {
    // malformed JSON — silently fall back to defaults
  }

  // Server prefs win over localStorage (cross-device persistence).
  // window.__preferences is set synchronously by preferences-loader.js.
  var serverOverrides = {};
  try {
    var sp = window.__preferences;
    if (sp && sp.keybindings && typeof sp.keybindings === "object") {
      serverOverrides = sp.keybindings;
    }
  } catch (_e) {}

  window.keybindings = mergeDeep(
    mergeDeep(DEFAULTS, localOverrides),
    serverOverrides,
  );

  // Re-apply when preferences load after an identity change.
  document.addEventListener("preferences-ready", function () {
    var sp2 = {};
    try {
      if (
        window.__preferences &&
        window.__preferences.keybindings &&
        typeof window.__preferences.keybindings === "object"
      ) {
        sp2 = window.__preferences.keybindings;
      }
    } catch (_e) {}
    window.keybindings = mergeDeep(mergeDeep(DEFAULTS, localOverrides), sp2);
  });
})();
