// Column toggle — hide/show table columns via checkboxes.
// Persists hidden columns in localStorage per domain.
// Also handles column sort via data-sort-key on <th> elements.

(function () {
  var STORAGE_PREFIX = "hiddenCols_";

  function getHidden(domain) {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_PREFIX + domain)) || [];
    } catch (_e) {
      return [];
    }
  }

  function setHidden(domain, keys) {
    localStorage.setItem(STORAGE_PREFIX + domain, JSON.stringify(keys));
  }

  function applyCols(domain) {
    var hidden = getHidden(domain);
    var cells = document.querySelectorAll(
      '[data-column-table="' + domain + '"] [data-col]'
    );
    for (var i = 0; i < cells.length; i++) {
      var key = cells[i].getAttribute("data-col");
      if (hidden.indexOf(key) >= 0) {
        cells[i].classList.add("is-hidden");
      } else {
        cells[i].classList.remove("is-hidden");
      }
    }
  }

  function syncCheckboxes(domain) {
    var hidden = getHidden(domain);
    var toggle = document.querySelector('[data-column-toggle="' + domain + '"]');
    if (!toggle) return;
    var boxes = toggle.querySelectorAll("[data-column-key]");
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].checked = hidden.indexOf(boxes[i].getAttribute("data-column-key")) < 0;
    }
  }

  // Checkbox change — toggle column visibility instantly.
  document.addEventListener("change", function (e) {
    var box = e.target.closest("[data-column-key]");
    if (!box) return;
    var toggle = box.closest("[data-column-toggle]");
    if (!toggle) return;
    var domain = toggle.getAttribute("data-column-toggle");
    var key = box.getAttribute("data-column-key");
    var hidden = getHidden(domain);
    var idx = hidden.indexOf(key);
    if (box.checked && idx >= 0) hidden.splice(idx, 1);
    if (!box.checked && idx < 0) hidden.push(key);
    setHidden(domain, hidden);
    applyCols(domain);
  });

  // Apply on page load and after htmx swaps (table re-renders).
  function init() {
    var toggles = document.querySelectorAll("[data-column-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      var domain = toggles[i].getAttribute("data-column-toggle");
      syncCheckboxes(domain);
      applyCols(domain);
    }
  }

  // Click outside closes open <details> column toggles.
  document.addEventListener("click", function (e) {
    var toggles = document.querySelectorAll("[data-column-toggle][open]");
    for (var i = 0; i < toggles.length; i++) {
      if (!toggles[i].contains(e.target)) {
        toggles[i].removeAttribute("open");
      }
    }
  });

  init();
  document.addEventListener("htmx:afterSwap", init);
})();
