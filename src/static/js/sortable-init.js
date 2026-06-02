// SortableJS ↔ htmx glue. The drag mechanics come from the vendored SortableJS
// library; the network call is declarative htmx — each [data-sortable] container
// carries hx-post + hx-trigger="end", and SortableJS dispatches the `end` DOM
// event when a drag finishes, so htmx posts the reordered ids on its own.
//
// htmx.onLoad re-runs after every swap, so lists/boards re-initialise
// automatically. The Sortable instance is stashed on a JS property
// (el._sortable) — idiomorph does not reconcile JS properties, so a
// morph-preserved node is never double-initialised (a data attribute would be
// stripped by morph to match the server HTML and cause a re-init).

(function () {
  "use strict";

  function init(root) {
    if (typeof Sortable === "undefined") return;
    var els = root.querySelectorAll("[data-sortable]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el._sortable) continue;
      el._sortable = new Sortable(el, {
        group: el.dataset.sortableGroup || "default",
        draggable: el.dataset.sortableItem || "[data-sortable-item]",
        // Let clicks on interactive children through instead of starting a drag.
        filter: "input, a, button, select, label",
        preventOnFilter: false,
        animation: 150,
        ghostClass: "is-sortable-ghost",
        chosenClass: "is-sortable-chosen",
        // A cross-list drop fires `end` on the source element only; trigger the
        // target too so both lists post their new order/section.
        onEnd: function (evt) {
          if (evt.to !== evt.from && window.htmx) {
            window.htmx.trigger(evt.to, "end");
          }
        },
      });
    }
  }

  if (window.htmx && typeof window.htmx.onLoad === "function") {
    window.htmx.onLoad(init);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      init(document);
    });
  }
})();
