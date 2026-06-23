// Quote line-item inline editing — CSP-safe event delegation.
// Quote-scoped (qli-*) explicit-save model, intentionally divergent from the
// shared quadrant-edit.js: every open cell shows BOTH a Save (✓) and a Cancel
// (✕) affordance at all times, Escape cancels, and only one cell is ever open
// at a time (focusing a new cell restores any other open cell to its read
// state). This prevents a stranded input on focus change and stops a
// full-section re-render (group/type save) from discarding another cell's
// unsaved text — there is never more than one open cell to lose.
//
// An editing input carries [data-qli-edit] + hx-trigger="qli-save"; its paired
// buttons are [data-qli-save-for=<inputId>] (dispatches qli-save → htmx POST)
// and [data-qli-cancel-for=<inputId>] (an htmx hx-get that swaps the read cell
// back in). No autosave-on-blur (owner hard requirement).

(function () {
  function inputFor(refEl) {
    var id = refEl.getAttribute("data-qli-save-for") ||
      refEl.getAttribute("data-qli-cancel-for");
    return id ? document.getElementById(id) : null;
  }

  function save(input) {
    if (input) {
      input.dispatchEvent(new CustomEvent("qli-save", { bubbles: true }));
    }
  }

  function cancel(input) {
    if (!input || !input.id) return;
    var btn = document.querySelector(
      '[data-qli-cancel-for="' + input.id + '"]',
    );
    if (btn) btn.click(); // htmx hx-get restores the read cell.
  }

  // Click ✓ → commit; click ✕ is handled by htmx directly (no JS needed).
  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var saveBtn = e.target.closest("[data-qli-save-for]");
    if (!saveBtn) return;
    e.preventDefault();
    save(inputFor(saveBtn));
  });

  // Enter commits, Escape cancels — only inside a qli editing input.
  document.addEventListener("keydown", function (e) {
    var input = e.target;
    if (!input.hasAttribute || !input.hasAttribute("data-qli-edit")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      save(input);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel(input);
    }
  });

  // One cell open at a time: focusing a qli input restores every OTHER open
  // qli input to its read cell. The newly-swapped input autofocuses, so this
  // fires automatically when a second cell is opened.
  document.addEventListener("focusin", function (e) {
    var focused = e.target;
    if (!focused.hasAttribute || !focused.hasAttribute("data-qli-edit")) return;
    var open = document.querySelectorAll("[data-qli-edit]");
    for (var i = 0; i < open.length; i++) {
      if (open[i] !== focused) cancel(open[i]);
    }
  });
})();
