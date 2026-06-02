// Vacation calendar — reads data-left and data-width attrs, applies via CSSOM.
// CSSOM setProperty() is not blocked by CSP.

function applyVacationCalendarPositions() {
  document.querySelectorAll("[data-days]").forEach(function (el) {
    el.style.setProperty(
      "grid-template-columns",
      "repeat(" + el.dataset.days + ", 1fr)",
    );
  });
  document.querySelectorAll("[data-left]").forEach(function (el) {
    el.style.setProperty("left", el.dataset.left);
  });
  document.querySelectorAll("[data-width]").forEach(function (el) {
    el.style.setProperty("width", el.dataset.width);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyVacationCalendarPositions);
} else {
  applyVacationCalendarPositions();
}

document.addEventListener("htmx:afterSettle", applyVacationCalendarPositions);
