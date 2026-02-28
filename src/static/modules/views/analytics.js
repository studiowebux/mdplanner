// Analytics View Module
//
// Extension pattern — widget registry:
//   1. Call registerWidget({ id, title, size, dataKey, render }) at module
//      load time.
//   2. render(container, sliceData, fullPayload) receives the slice of the API
//      response identified by dataKey plus the full payload for cross-widget
//      access.
//   3. No other changes needed. The view iterates the registry automatically.
//
// CSS primitives available in analytics.css:
//   .kpi-row / .kpi-card / .kpi-value / .kpi-label
//   .bar-track / .bar-fill / .bar-fill--primary / .bar-fill--alert
//   .data-row / .data-row-label / .data-row-bar / .data-row-value
//   .spark-chart / .spark-bar / .spark-labels / .spark-label
//   .status-badge / .status-badge--success / .status-badge--alert
//   .widget-section-title

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kpiCard(value, label, mod = "") {
  return `<div class="kpi-card">
    <span class="kpi-value${mod ? ` kpi-value--${mod}` : ""}">${value}</span>
    <span class="kpi-label">${label}</span>
  </div>`;
}

function barRow(label, value, total, displayValue = "") {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const shown = displayValue !== "" ? displayValue : String(value);
  return `<div class="data-row">
    <span class="data-row-label">${label}</span>
    <div class="data-row-bar"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>
    <span class="data-row-value">${shown}</span>
  </div>`;
}

function sectionTitle(text) {
  return `<p class="widget-section-title">${text}</p>`;
}

function statusBadge(label, mod = "") {
  return `<span class="status-badge${mod ? ` status-badge--${mod}` : ""}">${label}</span>`;
}

// ---------------------------------------------------------------------------
// Widget registry
// ---------------------------------------------------------------------------

/** @type {Array<{id:string, title:string, size:string, dataKey:string, render:Function}>} */
const WIDGET_REGISTRY = [];

export function registerWidget(widget) {
  WIDGET_REGISTRY.push(widget);
}

// ---------------------------------------------------------------------------
// Widget: Task Health
// ---------------------------------------------------------------------------

registerWidget({
  id: "task-health",
  title: "Task Health",
  size: "medium",
  dataKey: "tasks",
  render(container, data) {
    const overdueClass = data.overdue > 0 ? "alert" : "muted";
    let html = `<div class="kpi-row">
      ${kpiCard(data.total, "Total tasks")}
      ${kpiCard(data.completed, "Completed", "muted")}
      ${kpiCard(data.open, "Open")}
      ${kpiCard(`${data.completionRate}%`, "Complete", data.completionRate >= 80 ? "" : "muted")}
    </div>`;

    if (data.overdue > 0) {
      html += `<div class="kpi-row" style="margin-top:0.75rem">
        ${kpiCard(data.overdue, "Overdue", overdueClass)}
      </div>`;
    }

    if (data.bySection.length > 0) {
      html += sectionTitle("By Section");
      const maxTotal = Math.max(...data.bySection.map((s) => s.total), 1);
      for (const s of data.bySection) {
        html += barRow(s.name, s.total, maxTotal, `${s.completed}/${s.total}`);
      }
    }

    container.innerHTML = html;
  },
});

// ---------------------------------------------------------------------------
// Widget: Task Trend (weekly due dates)
// ---------------------------------------------------------------------------

registerWidget({
  id: "task-trend",
  title: "Task Workload by Week",
  size: "medium",
  dataKey: "tasks",
  render(container, data) {
    const weeks = data.weeklyDue;
    const maxCount = Math.max(...weeks.map((w) => w.count), 1);

    const bars = weeks
      .map((w, i) => {
        const heightPct = Math.max((w.count / maxCount) * 100, 2);
        const isCurrent = i === weeks.length - 1;
        const cls = isCurrent
          ? "spark-bar spark-bar--current"
          : w.count > 0
          ? "spark-bar spark-bar--active"
          : "spark-bar";
        return `<div class="${cls}" style="height:${heightPct}%" title="${w.weekLabel}: ${w.count} task${w.count !== 1 ? "s" : ""}"></div>`;
      })
      .join("");

    const labels = weeks
      .map((w, i) => {
        // Show every 2nd label on desktop to avoid crowding
        const label = i % 2 === 0 || i === weeks.length - 1 ? w.weekLabel : "";
        return `<span class="spark-label">${label}</span>`;
      })
      .join("");

    let html = `<div class="kpi-row" style="margin-bottom:1rem">
      ${kpiCard(data.completed, "Total completed")}
      ${kpiCard(data.total - data.completed, "Still open", "muted")}
    </div>`;
    html += `<div class="spark-chart">${bars}</div>`;
    html += `<div class="spark-labels">${labels}</div>`;

    if (data.byPriority.length > 0) {
      html += sectionTitle("By Priority");
      const maxPri = Math.max(...data.byPriority.map((p) => p.count), 1);
      for (const p of data.byPriority) {
        html += barRow(p.label, p.count, maxPri, String(p.count));
      }
    }

    container.innerHTML = html;
  },
});

// ---------------------------------------------------------------------------
// Widget: Goals
// ---------------------------------------------------------------------------

registerWidget({
  id: "goals",
  title: "Goals",
  size: "medium",
  dataKey: "goals",
  render(container, data) {
    let html = `<div class="kpi-row">
      ${kpiCard(data.total, "Total goals")}
      ${kpiCard(data.complete, "Succeeded", "muted")}
      ${kpiCard(data.healthy, "Healthy")}
      ${kpiCard(data.atRisk, "At risk", data.atRisk > 0 ? "alert" : "muted")}
    </div>`;

    if (data.byStatus.length > 0) {
      html += sectionTitle("By Status");
      const maxStatus = Math.max(...data.byStatus.map((s) => s.count), 1);
      for (const s of data.byStatus) {
        html += barRow(s.label, s.count, maxStatus, String(s.count));
      }
    }

    container.innerHTML = html;
  },
});

// ---------------------------------------------------------------------------
// Widget: Milestones
// ---------------------------------------------------------------------------

registerWidget({
  id: "milestones",
  title: "Milestones",
  size: "medium",
  dataKey: "goals",
  render(container, data) {
    const m = data.milestones;
    let html = `<div class="kpi-row">
      ${kpiCard(m.total, "Total")}
      ${kpiCard(m.completed, "Done", "muted")}
      ${kpiCard(m.open, "Open")}
      ${kpiCard(`${m.completionRate}%`, "Complete")}
    </div>`;

    if (m.list.length > 0) {
      html += sectionTitle("Status");
      for (const ms of m.list) {
        const badge =
          ms.status === "completed"
            ? statusBadge("done", "success")
            : statusBadge("open");
        html += `<div class="data-row">
          <span class="data-row-label">${ms.name}</span>
          <span class="data-row-value">${badge}</span>
        </div>`;
      }
    }

    container.innerHTML = html;
  },
});

// ---------------------------------------------------------------------------
// Widget: Meetings & Action Items
// ---------------------------------------------------------------------------

registerWidget({
  id: "meetings",
  title: "Meetings & Actions",
  size: "small",
  dataKey: "meetings",
  render(container, data) {
    const overdueClass = data.overdueActionItems > 0 ? "alert" : "muted";
    let html = `<div class="kpi-row">
      ${kpiCard(data.total, "Meetings")}
      ${kpiCard(data.last30Days, "Last 30 days", "muted")}
    </div>`;

    html += sectionTitle("Action Items");
    html += `<div class="kpi-row" style="margin-top:0.25rem">
      ${kpiCard(data.openActionItems, "Open")}
      ${kpiCard(data.doneActionItems, "Done", "muted")}
      ${kpiCard(data.overdueActionItems, "Overdue", overdueClass)}
    </div>`;

    container.innerHTML = html;
  },
});

// ---------------------------------------------------------------------------
// Widget: People
// ---------------------------------------------------------------------------

registerWidget({
  id: "people",
  title: "People",
  size: "small",
  dataKey: "people",
  render(container, data) {
    let html = `<div class="kpi-row">
      ${kpiCard(data.total, "Team members")}
      ${kpiCard(data.withDepartment, "In departments", "muted")}
    </div>`;

    if (data.byDepartment.length > 0) {
      html += sectionTitle("By Department");
      const maxDept = Math.max(...data.byDepartment.map((d) => d.count), 1);
      for (const d of data.byDepartment) {
        html += barRow(d.name, d.count, maxDept, String(d.count));
      }
    }

    container.innerHTML = html;
  },
});

// ---------------------------------------------------------------------------
// Widget: Notes
// ---------------------------------------------------------------------------

registerWidget({
  id: "notes",
  title: "Notes",
  size: "small",
  dataKey: "notes",
  render(container, data) {
    container.innerHTML = `<div class="kpi-row">
      ${kpiCard(data.total, "Total notes")}
      ${kpiCard(data.last30Days, "Last 30 days", "muted")}
      ${kpiCard(data.last7Days, "Last 7 days", "muted")}
    </div>`;
  },
});

// ---------------------------------------------------------------------------
// Widget: Storage
// ---------------------------------------------------------------------------

registerWidget({
  id: "storage",
  title: "Upload Storage",
  size: "small",
  dataKey: "storage",
  render(container, data) {
    container.innerHTML = `<div class="kpi-row">
      ${kpiCard(data.formatted, "Used")}
      ${kpiCard(data.fileCount, "Files", "muted")}
    </div>`;
  },
});

// ---------------------------------------------------------------------------
// Analytics view class
// ---------------------------------------------------------------------------

export class AnalyticsModule {
  /** @param {object} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  bindEvents() {
    document
      .getElementById("analyticsRefreshBtn")
      ?.addEventListener("click", () => this.load());
  }

  async load() {
    const grid = document.getElementById("analyticsGrid");
    const ts = document.getElementById("analyticsTimestamp");
    if (!grid) return;

    grid.innerHTML =
      '<p class="analytics-loading">Loading analytics\u2026</p>';

    try {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (ts) {
        const d = new Date(data.generatedAt);
        ts.textContent = `Updated ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }

      this._render(data, grid);
    } catch (err) {
      console.error("[analytics] load error:", err);
      grid.innerHTML =
        '<p class="analytics-error">Failed to load analytics. Check the server logs.</p>';
    }
  }

  /** @param {object} data  @param {HTMLElement} grid */
  _render(data, grid) {
    grid.innerHTML = "";

    for (const widget of WIDGET_REGISTRY) {
      const cell = this._createCell(widget);
      grid.appendChild(cell);

      const body = cell.querySelector(".widget-body");
      const sliceData = data[widget.dataKey];

      try {
        widget.render(body, sliceData, data);
      } catch (err) {
        console.error(`[analytics] widget "${widget.id}" render error:`, err);
        body.innerHTML =
          '<p class="analytics-error">Widget render failed.</p>';
      }
    }
  }

  /** @param {object} widget @returns {HTMLElement} */
  _createCell(widget) {
    const div = document.createElement("div");
    div.className = `analytics-widget analytics-widget--${widget.size}`;
    div.id = `analytics-widget-${widget.id}`;
    div.innerHTML = `<div class="widget-header">
      <h3 class="widget-title">${widget.title}</h3>
    </div>
    <div class="widget-body"></div>`;
    return div;
  }
}
