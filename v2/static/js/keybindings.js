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

  var userOverrides = {};
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        userOverrides = parsed;
      }
    }
  } catch (_e) {
    // malformed JSON — silently fall back to defaults
  }

  window.keybindings = mergeDeep(DEFAULTS, userOverrides);
})();
