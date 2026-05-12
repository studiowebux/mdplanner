// Bandwidth bars — sets fill widths from data-bw-main / data-bw-over via CSSOM (CSP-safe).
(function () {
  function initBars() {
    document.querySelectorAll("[data-bw-main]").forEach(function (el) {
      el.style.setProperty("width", el.getAttribute("data-bw-main") + "%");
    });
    document.querySelectorAll("[data-bw-over]").forEach(function (el) {
      el.style.setProperty("width", el.getAttribute("data-bw-over") + "%");
    });
  }

  // Day-chip sync — keeps hidden workingDays input in sync with chip checkboxes.
  // Chips use data-day-chip="<hiddenInputId>" to identify their target.
  function syncDayChips(container) {
    var chips = (container || document).querySelectorAll(
      "input[type='checkbox'][data-day-chip]",
    );
    var groups = {};
    chips.forEach(function (cb) {
      var id = cb.getAttribute("data-day-chip");
      if (!groups[id]) groups[id] = [];
      groups[id].push(cb);
    });
    Object.keys(groups).forEach(function (id) {
      var hidden = document.getElementById(id);
      if (!hidden) return;
      hidden.value = groups[id]
        .filter(function (cb) {
          return cb.checked;
        })
        .map(function (cb) {
          return cb.value;
        })
        .join(",");
    });
  }

  document.addEventListener("change", function (e) {
    var cb = e.target.closest("input[type='checkbox'][data-day-chip]");
    if (!cb) return;
    syncDayChips(null);
  });

  // Cell popup — fixed positioning so it escapes the overflow-x:auto grid wrapper.
  document.addEventListener("mouseenter", function (e) {
    var wrap = e.target.closest(
      ".capacity-plan-detail__cell-wrap--has-tasks",
    );
    if (!wrap) return;
    var popup = wrap.querySelector(".capacity-plan-detail__cell-popup");
    if (!popup) return;
    var rect = wrap.getBoundingClientRect();
    var popupW = popup.offsetWidth || 224;
    var left = rect.left + rect.width / 2 - popupW / 2;
    // Keep popup inside viewport horizontally
    left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
    popup.style.setProperty("top", (rect.bottom + 6) + "px");
    popup.style.setProperty("left", left + "px");
    popup.classList.add("is-visible");
  }, true);

  document.addEventListener("mouseleave", function (e) {
    var wrap = e.target.closest(
      ".capacity-plan-detail__cell-wrap--has-tasks",
    );
    if (!wrap) return;
    var popup = wrap.querySelector(".capacity-plan-detail__cell-popup");
    if (!popup) return;
    popup.classList.remove("is-visible");
  }, true);

  function initAllocMutex() {
    var pct = document.getElementById("alloc-percentage");
    var hrs = document.getElementById("alloc-hoursPerWeek");
    if (!pct || !hrs) return;
    pct.addEventListener("input", function () {
      if (pct.value) hrs.value = "";
    });
    hrs.addEventListener("input", function () {
      if (hrs.value) pct.value = "";
    });
  }

  function init() {
    initBars();
    syncDayChips(null);
    initAllocMutex();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  document.addEventListener("htmx:afterSettle", init);
})();
