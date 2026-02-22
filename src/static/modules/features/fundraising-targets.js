/**
 * Fundraising — Targets tab.
 * Shows key metrics vs user-defined targets, derived from the latest KPI period.
 * Targets are stored in localStorage. No API or parser needed.
 * Pattern: View Sub-Module (computed display)
 */

const STORAGE_KEY = "mdplanner_fundraising_targets";

const METRIC_DEFS = [
  {
    key: "arr",
    label: "ARR",
    format: "currency",
    derive: (s) => s.mrr * 12,
    higherIsBetter: true,
  },
  {
    key: "mrr",
    label: "MRR",
    format: "currency",
    derive: (s) => s.mrr,
    higherIsBetter: true,
  },
  {
    key: "active_users",
    label: "Active Users",
    format: "number",
    derive: (s) => s.active_users,
    higherIsBetter: true,
  },
  {
    key: "nrr",
    label: "NRR",
    format: "percent",
    derive: (s) => s.nrr,
    higherIsBetter: true,
  },
  {
    key: "gross_margin",
    label: "Gross Margin",
    format: "percent",
    derive: (s) => s.gross_margin,
    higherIsBetter: true,
  },
  {
    key: "churn_rate",
    label: "Churn Rate",
    format: "percent",
    derive: (s) => s.churn_rate,
    higherIsBetter: false,
  },
];

function fmt(value, format) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (isNaN(n)) return "—";
  if (format === "currency") return "$" + n.toLocaleString();
  if (format === "percent") return n.toFixed(1) + "%";
  return n.toLocaleString();
}

function loadTargets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveTargets(targets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
  } catch (_) { /* ignore */ }
}

export class FundraisingTargetsModule {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  load() {
    this.render();
  }

  render() {
    const tbody = document.getElementById("targets-table-body");
    if (!tbody) return;

    const snapshots = this.tm.kpiSnapshots || [];
    // Latest period is first (sorted in kpi module)
    const latest = snapshots[0] || null;
    const targets = loadTargets();

    tbody.innerHTML = METRIC_DEFS.map((def) => {
      const current = latest !== null ? def.derive(latest) : null;
      const target = targets[def.key] ?? "";
      const gap = this._computeGap(current, target, def);

      return `
        <tr>
          <td>${def.label}</td>
          <td>${fmt(current, def.format)}</td>
          <td>
            <input
              type="number"
              class="targets-target-input"
              data-metric="${def.key}"
              data-format="${def.format}"
              value="${target}"
              placeholder="—"
            >
          </td>
          <td class="${gap.cls}">${gap.text}</td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".targets-target-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const metric = e.target.dataset.metric;
        const val = e.target.value;
        const updated = loadTargets();
        if (val === "" || val === null) {
          delete updated[metric];
        } else {
          updated[metric] = Number(val);
        }
        saveTargets(updated);
        // Re-render only the gap cell to avoid losing focus
        const td = e.target.closest("tr")?.querySelector(
          "td:last-child",
        );
        if (td) {
          const def = METRIC_DEFS.find((d) => d.key === metric);
          const snapshots = this.tm.kpiSnapshots || [];
          const latest = snapshots[0] || null;
          const current = latest !== null && def ? def.derive(latest) : null;
          const gap = this._computeGap(current, val, def);
          td.textContent = gap.text;
          td.className = gap.cls;
        }
      });
    });
  }

  _computeGap(current, target, def) {
    const c = Number(current);
    const t = Number(target);
    if (
      current === null || current === undefined || target === "" ||
      target === null || isNaN(c) || isNaN(t)
    ) {
      return { text: "—", cls: "" };
    }

    const diff = def.higherIsBetter ? c - t : t - c;
    const sign = diff >= 0 ? "+" : "";
    const text = sign + fmt(diff, def.format);
    const cls = diff >= 0
      ? "targets-gap--positive"
      : "targets-gap--negative";
    return { text, cls };
  }

  bindEvents() {
    // Events are bound during render() since rows are rebuilt on load
  }
}
