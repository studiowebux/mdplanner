// Task timeline — reads data attributes and applies CSS custom properties
// for bar/marker/chart positioning. CSSOM setProperty() is not blocked by CSP.

function applyTimelinePositions() {
  const inner = document.querySelector(".task-timeline__chart-inner");
  if (inner) {
    inner.style.setProperty("min-width", inner.dataset.minWidth + "px");
  }

  document.querySelectorAll("[data-left]").forEach((el) => {
    el.style.setProperty("left", el.dataset.left);
  });

  document.querySelectorAll("[data-width]").forEach((el) => {
    el.style.setProperty("width", el.dataset.width);
  });
}

applyTimelinePositions();
document.addEventListener("htmx:afterSettle", applyTimelinePositions);
