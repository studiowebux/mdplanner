// Quadrant inline editing — CSP-safe event delegation.
// Explicit Save only (owner requirement: no autosave). An edited
// [data-quadrant-edit] input reveals its paired Save button
// ([data-quadrant-save-for=<inputId>]); clicking it (or pressing Enter in the
// input) commits via the input's hx-trigger="quadrant-save". Blur never saves —
// the global dirty-guard.js warns on leave with unsaved changes. Add inputs
// ([data-quadrant-add]) submit a new item on Enter.

(function () {
  function isDirty(input) {
    var current = input.value.trim();
    return current.length > 0 && input.value !== input.defaultValue;
  }

  function savedBtnFor(input) {
    return input.id
      ? document.querySelector('[data-quadrant-save-for="' + input.id + '"]')
      : null;
  }

  function commit(input) {
    if (input && isDirty(input)) {
      input.dispatchEvent(new CustomEvent("quadrant-save", { bubbles: true }));
    }
  }

  // Reveal / hide an item's Save button as its value changes.
  document.addEventListener("input", function (e) {
    var input = e.target;
    if (!input.hasAttribute || !input.hasAttribute("data-quadrant-edit")) {
      return;
    }
    var btn = savedBtnFor(input);
    if (btn) btn.classList.toggle("is-hidden", !isDirty(input));
  });

  // Commit an edit: click the paired Save button.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest &&
      e.target.closest("[data-quadrant-save-for]");
    if (!btn) return;
    e.preventDefault();
    commit(document.getElementById(btn.getAttribute("data-quadrant-save-for")));
  });

  // Keyboard: Enter adds a new item, or commits an explicit edit.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var input = e.target;
    if (!input.hasAttribute) return;
    if (input.hasAttribute("data-quadrant-add")) {
      e.preventDefault();
      input.dispatchEvent(
        new CustomEvent("quadrant-submit", { bubbles: true }),
      );
    } else if (input.hasAttribute("data-quadrant-edit")) {
      e.preventDefault();
      commit(input);
    }
  });
})();
