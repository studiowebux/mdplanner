// keybindings-settings.js — shortcuts tab: populate inputs from window.keybindings,
// conflict detection, save to localStorage, reset to defaults.

(function () {
  var STORAGE_KEY = "keybindings";

  // Map input name attr to path in keybindings object.
  function getNestedValue(obj, path) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function setNestedValue(obj, path, value) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") {
        cur[parts[i]] = {};
      }
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function getInputs() {
    var form = document.getElementById("shortcuts-form");
    if (!form) return [];
    return Array.from(form.querySelectorAll(".shortcuts-input"));
  }

  function populateInputs() {
    var kb = window.keybindings || {};
    var inputs = getInputs();
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var val = getNestedValue(kb, input.name);
      input.value = (val !== undefined && val !== null) ? String(val) : "";
    }
  }

  function checkConflicts() {
    var inputs = getInputs();
    var seen = {};
    var conflictMsg = document.getElementById("shortcuts-conflict-msg");

    // Reset state
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("shortcuts-input--conflict");
    }

    // Find duplicates — only flag non-empty values
    for (var j = 0; j < inputs.length; j++) {
      var v = inputs[j].value.trim();
      if (!v) continue;
      if (seen[v] === undefined) {
        seen[v] = j;
      } else {
        // Both the first occurrence and this one are conflicts
        inputs[seen[v]].classList.add("shortcuts-input--conflict");
        inputs[j].classList.add("shortcuts-input--conflict");
      }
    }

    var hasConflict = !!document.querySelector(
      "#shortcuts-form .shortcuts-input--conflict",
    );
    if (conflictMsg) {
      if (hasConflict) {
        conflictMsg.classList.remove("is-hidden");
      } else {
        conflictMsg.classList.add("is-hidden");
      }
    }
    return hasConflict;
  }

  function buildOverrides() {
    var inputs = getInputs();
    var result = {};
    for (var i = 0; i < inputs.length; i++) {
      var val = inputs[i].value.trim();
      if (val) setNestedValue(result, inputs[i].name, val);
    }
    return result;
  }

  function hasEmptyInputs() {
    var inputs = getInputs();
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].value.trim()) return true;
    }
    return false;
  }

  function showToast(type, message) {
    if (window.toast) {
      window.toast({ type: type, message: message });
    }
  }

  function init() {
    var form = document.getElementById("shortcuts-form");
    var resetBtn = document.getElementById("shortcuts-reset");
    if (!form) return;

    populateInputs();
    if (window.settingsTrackForm) window.settingsTrackForm("shortcuts-form");
    checkConflicts();

    form.addEventListener("input", function () {
      checkConflicts();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (checkConflicts()) {
        showToast("error", "Fix conflicting keys before saving");
        return;
      }
      if (hasEmptyInputs()) {
        showToast("error", "All keybinding fields must have a value");
        return;
      }
      var overrides = buildOverrides();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
        showToast("success", "Shortcuts saved — reload any open tab to apply");
      } catch (_e) {
        showToast("error", "Failed to save shortcuts");
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
