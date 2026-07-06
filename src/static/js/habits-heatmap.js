function scrollHeatmapToToday(heatmap) {
  const todayCell = heatmap.querySelector(".habit-heatmap__cell-num--today");
  if (todayCell) {
    const offset = todayCell.offsetLeft - heatmap.clientWidth / 2 +
      todayCell.offsetWidth / 2;
    heatmap.scrollLeft = Math.max(0, offset);
  } else {
    heatmap.scrollLeft = heatmap.scrollWidth;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const heatmap = document.querySelector(".habit-heatmap");
  if (heatmap) scrollHeatmapToToday(heatmap);
});

document.addEventListener("htmx:afterSettle", (e) => {
  const target = e.detail.target;
  if (!target) return;
  const heatmap = target.querySelector
    ? target.querySelector(".habit-heatmap")
    : null;
  if (heatmap) scrollHeatmapToToday(heatmap);
});
