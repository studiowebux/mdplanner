// Prevent duplicate provider selection in the accounts array-table.
// Disables already-chosen provider options in every sibling row's select.
// Scoped to data-array-table="accounts" so it doesn't affect other array-tables.

(function () {
  "use strict";

  var CONTAINER_SELECTOR = '.array-table[data-array-table="accounts"]';
  var KEY_SELECT_SELECTOR = 'select[name$="[key]"]';

  function syncProviderOptions(container) {
    var selects = Array.prototype.slice.call(
      container.querySelectorAll(KEY_SELECT_SELECTOR),
    );
    var chosen = selects.map(function (s) {
      return s.value;
    });

    selects.forEach(function (sel) {
      Array.prototype.forEach.call(sel.options, function (opt) {
        if (opt.value === "") return;
        // Disable if chosen by a different row; keep own value enabled.
        opt.disabled = opt.value !== sel.value &&
          chosen.indexOf(opt.value) !== -1;
      });
    });
  }

  function getContainer(el) {
    return el ? el.closest(CONTAINER_SELECTOR) : null;
  }

  // Re-sync on provider change.
  document.addEventListener("change", function (e) {
    var container = getContainer(
      e.target.closest(KEY_SELECT_SELECTOR) && e.target,
    );
    if (container) syncProviderOptions(container);
  });

  // Re-sync after row removal (setTimeout lets hx-on--click remove the row first).
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".array-table__remove");
    var container = btn && getContainer(btn);
    if (container) {
      setTimeout(function () {
        syncProviderOptions(container);
      }, 0);
    }
  });

  // Sync on load for pre-filled edit forms.
  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(
      document.querySelectorAll(CONTAINER_SELECTOR),
      syncProviderOptions,
    );
  });
})();
