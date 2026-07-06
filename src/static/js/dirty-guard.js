// Central unsaved-changes guard.
// A single beforeunload listener fires the browser's native "leave site?"
// prompt whenever ANY edit surface holds unsaved changes — covering
// sidebar/topbar navigation, browser Back (Backspace/history), reload, and tab
// close, all of which are full-document unloads in this app (no hx-boost / SPA
// navigation, so there is nothing to intercept at the htmx layer).
//
// Why beforeunload and not a confirmAction() modal: a real full-page navigation
// cannot be paused for an async dialog — the browser only honors the native
// synchronous beforeunload prompt. confirmAction() stays for in-DOM dismissals
// (e.g. closing a sidenav) where the script controls the flow synchronously.
//
// Dirtiness is detected GENERICALLY by scanning the canonical edit-mode markers,
// so every detail view and every edit field is covered without per-module wiring:
//   1. Inline edit-mode fields — any [data-inline-edit] whose normalized text
//      differs from its data-inline-original (the shared inline-edit pattern).
//   2. Open sidenav forms (Edit / Create) flagged dirty — .sidenav.is-open.is-dirty.
//   3. Bespoke editors (e.g. the note block editor) that declare themselves via
//      a [data-unsaved="true"] attribute on their edit root.

(function () {
  var NBSP = / /g;

  function inlineText(el) {
    return (el.innerText || "").replace(NBSP, " ").replace(/\r/g, "").trim();
  }

  function inlineFieldsDirty() {
    var els = document.querySelectorAll("[data-inline-edit]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (inlineText(el) !== (el.getAttribute("data-inline-original") || "")) {
        return true;
      }
    }
    return false;
  }

  function isDirty() {
    return (
      inlineFieldsDirty() ||
      document.querySelector(".sidenav.is-open.is-dirty") !== null ||
      document.querySelector("[data-unsaved='true']") !== null
    );
  }

  window.dirtyGuard = { isDirty: isDirty };

  window.addEventListener("beforeunload", function (e) {
    if (!isDirty()) return;
    e.preventDefault();
    e.returnValue = "";
  });
})();
