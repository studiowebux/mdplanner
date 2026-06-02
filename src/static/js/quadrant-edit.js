// Quadrant inline editing — CSP-safe event delegation.
// Handles Enter key on add inputs and blur/Enter on edit inputs.
// Dispatches custom events that htmx listens for via hx-trigger.

(function () {
  // Add new item: Enter on [data-quadrant-add] inputs.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var input = e.target;
    if (input.hasAttribute("data-quadrant-add")) {
      e.preventDefault();
      input.dispatchEvent(
        new CustomEvent("quadrant-submit", { bubbles: true }),
      );
      return;
    }
    if (input.hasAttribute("data-quadrant-edit")) {
      e.preventDefault();
      input.blur();
    }
  });

  // Edit existing item: blur on [data-quadrant-edit] inputs.
  document.addEventListener(
    "focusout",
    function (e) {
      var input = e.target;
      if (!input.hasAttribute || !input.hasAttribute("data-quadrant-edit")) {
        return;
      }
      var original = input.defaultValue;
      var current = input.value.trim();
      if (!current || current === original) return;
      input.dispatchEvent(
        new CustomEvent("quadrant-save", { bubbles: true }),
      );
    },
    true,
  );
})();
