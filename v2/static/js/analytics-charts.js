// Shared pure-SVG chart renderer for /analytics. Each chart is an empty
// container `<div class="analytics__chart" data-chart="<kind>"
// data-chart-values="<json>">`; this script reads the JSON and builds the SVG
// with createElementNS (no innerHTML, no inline style= — CSP-safe).
//
// Colors come from CSS classes (`.analytics__chart-bar { fill: var(--…) }`),
// never from JS, so charts stay theme-reactive on a dark/light toggle without
// re-rendering. Geometry is the only thing computed here.
//
// Re-renders on every htmx body swap (filter bar + customize panel both
// re-render the entire <main id="analytics-content">), mirroring
// analytics-jump-bar.js.

const SVG_NS = "http://www.w3.org/2000/svg";

// Bar chart layout (user units; the SVG scales to container width via CSS).
const BAR_SLOT = 48; // horizontal space per bar (bar + gutter)
const BAR_WIDTH = 28;
const CHART_H = 160;
const PAD_TOP = 16; // room for value labels above the tallest bar
const PAD_BOTTOM = 22; // room for category labels below the baseline

function el(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  for (const key in attrs) node.setAttribute(key, String(attrs[key]));
  return node;
}

function text(value, x, y, cls) {
  const node = el("text", { x: x, y: y, class: cls });
  node.textContent = String(value);
  return node;
}

function renderBar(container, items) {
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + plotH;
  const width = items.length * BAR_SLOT;
  const max = items.reduce((m, d) => (d.value > m ? d.value : m), 0) || 1;

  const svg = el("svg", {
    viewBox: "0 0 " + width + " " + CHART_H,
    class: "analytics__chart-svg",
    role: "presentation",
  });

  items.forEach((d, i) => {
    const cx = i * BAR_SLOT + BAR_SLOT / 2;
    const barH = (d.value / max) * plotH;
    const y = baseline - barH;

    svg.appendChild(el("rect", {
      class: "analytics__chart-bar",
      x: cx - BAR_WIDTH / 2,
      y: y,
      width: BAR_WIDTH,
      height: barH,
      rx: 2,
    }));
    svg.appendChild(text(d.value, cx, y - 5, "analytics__chart-value"));
    svg.appendChild(text(d.label, cx, CHART_H - 6, "analytics__chart-label"));
  });

  container.appendChild(svg);
}

// Line chart layout (user units; the SVG scales to container width via CSS).
const POINT_STEP = 20; // horizontal space per data point
const PAD_X = 8; // left/right room so end dots aren't clipped
const MAX_X_LABELS = 6; // sampled date labels along the baseline

function renderLine(container, items) {
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + plotH;
  const n = items.length;
  const span = (n - 1) * POINT_STEP;
  const width = span + PAD_X * 2;
  const max = items.reduce((m, d) => (d.value > m ? d.value : m), 0) || 1;
  const x = (i) => PAD_X + (n > 1 ? i * POINT_STEP : span / 2);
  const y = (v) => baseline - (v / max) * plotH;

  const svg = el("svg", {
    viewBox: "0 0 " + width + " " + CHART_H,
    class: "analytics__chart-svg",
    role: "presentation",
  });

  svg.appendChild(el("polyline", {
    class: "analytics__chart-line",
    points: items.map((d, i) => x(i) + "," + y(d.value)).join(" "),
  }));

  const labelEvery = Math.ceil(n / MAX_X_LABELS);
  items.forEach((d, i) => {
    const point = el("circle", {
      class: "analytics__chart-point",
      cx: x(i),
      cy: y(d.value),
      r: 2.5,
    });
    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = d.label + ": " +
      (d.display != null ? d.display : d.value);
    point.appendChild(title);
    svg.appendChild(point);

    if (i % labelEvery === 0 || i === n - 1) {
      svg.appendChild(
        text(d.label, x(i), CHART_H - 6, "analytics__chart-label"),
      );
    }
  });

  container.appendChild(svg);
}

const RENDERERS = { bar: renderBar, line: renderLine };

function renderChart(container) {
  const kind = container.getAttribute("data-chart");
  const renderer = RENDERERS[kind];
  if (!renderer) return;

  let items;
  try {
    items = JSON.parse(container.getAttribute("data-chart-values") || "[]");
  } catch {
    items = [];
  }

  container.textContent = ""; // idempotent: clear before (re)rendering
  if (!Array.isArray(items) || items.length === 0) return;
  renderer(container, items);
}

function renderCharts(root) {
  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll("[data-chart]").forEach(renderChart);
}

document.addEventListener("DOMContentLoaded", () => renderCharts(document));

document.addEventListener("htmx:afterSettle", (e) => {
  const target = e.detail && e.detail.target ? e.detail.target : null;
  if (!target) return;
  if (
    target.id === "analytics-content" ||
    target.querySelector("#analytics-content")
  ) {
    renderCharts(target);
  }
});
