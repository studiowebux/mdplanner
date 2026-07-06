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
// re-render the entire <main id="analytics-content">).

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
    const valLabel = d.display != null ? d.display : d.value;
    svg.appendChild(text(valLabel, cx, y - 5, "analytics__chart-value"));
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

// Palette rotation: c0..c4 map to accent/success/warning/danger/info in CSS.
const PALETTE = 5;

// Shared HTML legend (CSP-safe: classes only, no inline style). `entries` are
// { cls, label, value } — cls is a palette class like "analytics__chart-c0".
function legend(container, entries) {
  const list = document.createElement("ul");
  list.className = "analytics__chart-legend";
  entries.forEach((e) => {
    const row = document.createElement("li");
    row.className = "analytics__chart-legend-row";
    const swatch = document.createElement("span");
    swatch.className = "analytics__chart-swatch " + e.cls;
    const label = document.createElement("span");
    label.className = "analytics__chart-legend-label";
    label.textContent = e.label;
    const value = document.createElement("span");
    value.className = "analytics__chart-legend-value";
    value.textContent = String(e.value);
    row.appendChild(swatch);
    row.appendChild(label);
    row.appendChild(value);
    list.appendChild(row);
  });
  container.appendChild(list);
}

// Donut: one arc per item (angle ∝ value), center total, HTML legend below.
function renderDonut(container, items) {
  const cx = 70, cy = 70, r = 52, sw = 24;
  const circ = 2 * Math.PI * r;
  const total = items.reduce((s, d) => s + d.value, 0) || 1;

  const svg = el("svg", {
    viewBox: "0 0 140 140",
    class: "analytics__chart-donut",
    role: "presentation",
  });

  let accum = 0;
  items.forEach((d, i) => {
    const seg = (d.value / total) * circ;
    const arc = el("circle", {
      class: "analytics__chart-arc analytics__chart-c" + (i % PALETTE),
      cx: cx,
      cy: cy,
      r: r,
      "stroke-width": sw,
      "stroke-dasharray": seg + " " + (circ - seg),
      "stroke-dashoffset": -accum,
      transform: "rotate(-90 " + cx + " " + cy + ")",
    });
    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = d.label + ": " +
      (d.display != null ? d.display : d.value);
    arc.appendChild(title);
    svg.appendChild(arc);
    accum += seg;
  });

  svg.appendChild(
    text(
      items.reduce((s, d) => s + d.value, 0),
      cx,
      cy + 5,
      "analytics__chart-donut-total",
    ),
  );
  container.appendChild(svg);

  legend(
    container,
    items.map((d, i) => ({
      cls: "analytics__chart-c" + (i % PALETTE),
      label: d.label,
      value: d.display != null ? d.display : d.value,
    })),
  );
}

// Funnel: horizontal bars in the given order, width ∝ value, left-aligned.
function renderFunnel(container, items) {
  const rowH = 22, gap = 8, fullW = 240;
  const max = items.reduce((m, d) => (d.value > m ? d.value : m), 0) || 1;
  const height = items.length * (rowH + gap);

  const svg = el("svg", {
    viewBox: "0 0 " + fullW + " " + height,
    class: "analytics__chart-svg",
    role: "presentation",
  });

  items.forEach((d, i) => {
    const y = i * (rowH + gap);
    svg.appendChild(el("rect", {
      class: "analytics__chart-funnel-bar analytics__chart-c" + (i % PALETTE),
      x: 0,
      y: y,
      width: (d.value / max) * fullW,
      height: rowH,
      rx: 2,
    }));
    svg.appendChild(
      text(d.label, 4, y + rowH - 7, "analytics__chart-hlabel"),
    );
    svg.appendChild(
      text(
        d.display != null ? d.display : d.value,
        fullW - 4,
        y + rowH - 7,
        "analytics__chart-hvalue",
      ),
    );
  });

  container.appendChild(svg);
}

// Grouped bar: N groups, each with `values[]` sub-bars (series). Used for
// income-vs-expenses. Series colors come from `seriesClasses` on the container.
function renderGroupedBar(container, groups) {
  const seriesCount = groups.reduce(
    (m, g) => (g.values.length > m ? g.values.length : m),
    0,
  );
  const BAR_W = 18, innerGap = 4, sidePad = 8;
  const groupW = seriesCount * BAR_W + (seriesCount - 1) * innerGap;
  const GROUP_SLOT = groupW + 24;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + plotH;
  const width = groups.length * GROUP_SLOT;
  const max = groups.reduce(
    (m, g) => Math.max(m, ...g.values),
    0,
  ) || 1;
  const seriesCls = ["analytics__chart-c1", "analytics__chart-c3"];

  const svg = el("svg", {
    viewBox: "0 0 " + width + " " + CHART_H,
    class: "analytics__chart-svg",
    role: "presentation",
  });

  groups.forEach((g, gi) => {
    const gx = gi * GROUP_SLOT + (GROUP_SLOT - groupW) / 2;
    g.values.forEach((v, si) => {
      const barH = (v / max) * plotH;
      const x = gx + si * (BAR_W + innerGap);
      const rect = el("rect", {
        class: "analytics__chart-bar " +
          (seriesCls[si] || "analytics__chart-c0"),
        x: x,
        y: baseline - barH,
        width: BAR_W,
        height: barH,
        rx: 2,
      });
      const title = document.createElementNS(SVG_NS, "title");
      const disp = g.displays && g.displays[si] != null ? g.displays[si] : v;
      title.textContent = g.label + " " + (si === 0 ? "income" : "expenses") +
        ": " + disp;
      rect.appendChild(title);
      svg.appendChild(rect);
    });
    svg.appendChild(
      text(
        g.label,
        gi * GROUP_SLOT + GROUP_SLOT / 2,
        CHART_H - 6,
        "analytics__chart-label",
      ),
    );
  });

  container.appendChild(svg);
  legend(container, [
    { cls: "analytics__chart-c1", label: "Income", value: "" },
    { cls: "analytics__chart-c3", label: "Expenses", value: "" },
  ]);
}

const RENDERERS = {
  bar: renderBar,
  line: renderLine,
  donut: renderDonut,
  funnel: renderFunnel,
  groupedbar: renderGroupedBar,
};

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
