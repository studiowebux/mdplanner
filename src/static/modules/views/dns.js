// DNS Tracker view module
import { DnsAPI, IntegrationsAPI } from "../api.js";
import { showConfirm } from "../ui/confirm.js";
import { showLoading, hideLoading } from "../ui/loading.js";

const SHIELD_SVG = `<svg class="dns-shield" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-label="Auto-renew on">
  <path d="M8 1.5 L13.5 3.5 L13.5 8 C13.5 11 11 13.5 8 14.5 C5 13.5 2.5 11 2.5 8 L2.5 3.5 Z"/>
</svg>`;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp - now) / 86400000);
}

function expiryBadge(domain) {
  const days = daysUntil(domain.expiryDate);
  const shield = domain.autoRenew ? SHIELD_SVG : "";

  if (days === null) {
    return `<span class="dns-expiry-badge dns-badge-unknown">No expiry${shield}</span>`;
  }
  if (days < 0) {
    return `<span class="dns-expiry-badge dns-badge-critical">EXPIRED${shield}</span>`;
  }
  if (days < 14) {
    return `<span class="dns-expiry-badge dns-badge-critical">CRITICAL ${days}d${shield}</span>`;
  }
  if (days < 31) {
    return `<span class="dns-expiry-badge dns-badge-urgent">URGENT ${days}d${shield}</span>`;
  }
  if (days < 61) {
    return `<span class="dns-expiry-badge dns-badge-soon">SOON ${days}d${shield}</span>`;
  }
  if (days < 91) {
    return `<span class="dns-expiry-badge dns-badge-upcoming">UPCOMING ${days}d${shield}</span>`;
  }
  return `<span class="dns-expiry-badge dns-badge-ok">OK ${days}d${shield}</span>`;
}

function expiryCategory(domain) {
  const days = daysUntil(domain.expiryDate);
  if (days === null) return "unknown";
  if (days < 14) return "critical";
  if (days < 31) return "urgent";
  if (days < 61) return "soon";
  if (days < 91) return "upcoming";
  return "ok";
}

function relativeTime(isoStr) {
  if (!isoStr) return "never";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const LS_DNS_FILTERS = "dnsFilters";

export class DnsModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.domains = [];
    this.selected = new Set();
    this.filterExpiry = "all";
    this.filterAutoRenew = "all";
    this.searchQuery = "";
    this.sortField = null;
    this.sortDir = "asc";
    this.cfConfigured = false;
    this._loadFilters();
  }

  _loadFilters() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_DNS_FILTERS) || "{}");
      if (saved.filterExpiry) this.filterExpiry = saved.filterExpiry;
      if (saved.filterAutoRenew) this.filterAutoRenew = saved.filterAutoRenew;
      if (saved.searchQuery) this.searchQuery = saved.searchQuery;
      if (saved.sortField) this.sortField = saved.sortField;
      if (saved.sortDir) this.sortDir = saved.sortDir;
    } catch { /* ignore */ }
  }

  _saveFilters() {
    try {
      localStorage.setItem(LS_DNS_FILTERS, JSON.stringify({
        filterExpiry: this.filterExpiry,
        filterAutoRenew: this.filterAutoRenew,
        searchQuery: this.searchQuery,
        sortField: this.sortField,
        sortDir: this.sortDir,
      }));
    } catch { /* ignore */ }
  }

  async load() {
    showLoading("dnsView");
    try {
      this.domains = await DnsAPI.fetchAll();
    } catch {
      this.domains = [];
    }
    try {
      const cf = await IntegrationsAPI.getCloudflare();
      this.cfConfigured = cf.configured === true;
    } catch {
      this.cfConfigured = false;
    }
    this.selected.clear();
    this.render();
    hideLoading("dnsView");
  }

  render() {
    const container = document.getElementById("dnsContainer");
    if (!container) return;

    const filtered = this.filtered();

    container.innerHTML = `
      <div class="dns-sync-row">
        <button id="dnsAddBtn" class="btn-secondary">Add domain</button>
        ${this.cfConfigured
          ? `<button id="dnsSyncCfBtn" class="btn-secondary">Scan from Cloudflare</button>
             <span class="dns-last-sync" id="dnsLastSync"></span>`
          : `<span class="dns-last-sync">Connect Cloudflare in Settings to enable sync</span>`
        }
      </div>

      <div class="dns-toolbar">
        <input
          class="dns-search"
          id="dnsSearch"
          type="search"
          placeholder="Search domains..."
          value="${this.escHtml(this.searchQuery)}"
          autocomplete="off"
        >
        <div class="dns-filter-chips" id="dnsExpiryChips">
          ${["all","critical","urgent","soon","upcoming","ok"].map(f =>
            `<button class="dns-chip${this.filterExpiry === f ? " active" : ""}" data-expiry="${f}">${f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>`
          ).join("")}
        </div>
        <div class="dns-filter-chips" id="dnsAutoRenewChips">
          ${["all","on","off"].map(f =>
            `<button class="dns-chip${this.filterAutoRenew === f ? " active" : ""}" data-autorenew="${f}">${f === "all" ? "Auto-renew: All" : f === "on" ? "Auto-renew: On" : "Auto-renew: Off"}</button>`
          ).join("")}
        </div>
      </div>

      ${filtered.length === 0
        ? `<div class="dns-empty">No domains found. Add your first domain to get started.</div>`
        : `<div class="dns-table-wrapper">
            <table class="dns-table">
              <thead>
                <tr>
                  <th><input type="checkbox" id="dnsSelectAll" title="Select all"></th>
                  <th class="dns-sortable" data-sort="domain">Domain ${this._sortIndicator("domain")}</th>
                  <th class="dns-sortable" data-sort="expiry">Expiry ${this._sortIndicator("expiry")}</th>
                  <th class="dns-sortable" data-sort="cost">Renewal cost ${this._sortIndicator("cost")}</th>
                  <th class="dns-sortable" data-sort="synced">Last synced ${this._sortIndicator("synced")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="dnsTableBody">
                ${filtered.map(d => this.renderRow(d)).join("")}
              </tbody>
            </table>
          </div>`
      }

      <div class="dns-batch-bar hidden" id="dnsBatchBar">
        <span class="dns-batch-count" id="dnsBatchCount">0 selected</span>
        <div class="dns-batch-sep"></div>
        <div class="dns-price-popover hidden" id="dnsPricePopover">
          <span class="text-sm text-secondary">USD</span>
          <input type="number" class="dns-price-input" id="dnsBatchPriceInput" min="0" step="0.01" placeholder="0.00">
          <button class="btn-secondary" id="dnsBatchPriceApply">Apply</button>
          <button class="btn-secondary" id="dnsBatchPriceCancel">Cancel</button>
        </div>
        <button class="btn-secondary" id="dnsBatchCostBtn">Set renewal cost</button>
        <button class="btn-secondary" id="dnsBatchDeleteBtn" style="color:var(--error)">Delete</button>
      </div>
    `;

    this.bindEvents();
    this.updateLastSync();
  }

  renderRow(domain) {
    const checked = this.selected.has(domain.id) ? "checked" : "";
    const cost = domain.renewalCostUsd !== undefined && domain.renewalCostUsd !== null
      ? `$${Number(domain.renewalCostUsd).toFixed(2)}`
      : `<span class="text-tertiary">—</span>`;

    return `
      <tr data-id="${domain.id}">
        <td><input type="checkbox" class="dns-row-check" data-id="${domain.id}" ${checked}></td>
        <td>
          <div class="dns-domain-name">${this.escHtml(domain.domain)}</div>
          ${domain.provider ? `<div class="dns-provider-badge">${this.escHtml(domain.provider)}</div>` : ""}
          ${domain.nameservers && domain.nameservers.length > 0
            ? `<div class="dns-nameservers">${domain.nameservers.slice(0, 2).map((ns) => this.escHtml(ns)).join(", ")}${domain.nameservers.length > 2 ? ` +${domain.nameservers.length - 2} more` : ""}</div>`
            : ""}
          ${domain.dnsRecords && domain.dnsRecords.length > 0
            ? `<div class="dns-records-count">${domain.dnsRecords.length} DNS record${domain.dnsRecords.length !== 1 ? "s" : ""}</div>`
            : ""}
          ${domain.project ? `<div class="dns-project-badge">${this.escHtml(domain.project)}</div>` : ""}
        </td>
        <td>${expiryBadge(domain)}</td>
        <td class="dns-cost">${cost}</td>
        <td class="dns-fetched">${relativeTime(domain.lastFetchedAt)}</td>
        <td>
          <button class="btn-secondary dns-edit-btn" data-id="${domain.id}">Edit</button>
        </td>
      </tr>
    `;
  }

  updateLastSync() {
    if (!this.cfConfigured) return;
    const el = document.getElementById("dnsLastSync");
    if (!el) return;
    const times = this.domains
      .filter(d => d.lastFetchedAt)
      .map(d => new Date(d.lastFetchedAt).getTime());
    if (times.length === 0) {
      el.textContent = "Never synced";
    } else {
      el.textContent = `Last sync: ${relativeTime(new Date(Math.max(...times)).toISOString())}`;
    }
  }

  _sortIndicator(field) {
    if (this.sortField !== field) return '<span class="dns-sort-icon">⇅</span>';
    return this.sortDir === "asc"
      ? '<span class="dns-sort-icon active">↑</span>'
      : '<span class="dns-sort-icon active">↓</span>';
  }

  _sortValue(domain, field) {
    switch (field) {
      case "domain": return domain.domain?.toLowerCase() ?? "";
      case "expiry": return daysUntil(domain.expiryDate) ?? 99999;
      case "cost": return domain.renewalCostUsd ?? -1;
      case "synced": return domain.lastFetchedAt ? new Date(domain.lastFetchedAt).getTime() : 0;
      default: return "";
    }
  }

  filtered() {
    let result = this.domains.filter(d => {
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        if (!d.domain.toLowerCase().includes(q) &&
            !(d.notes || "").toLowerCase().includes(q)) return false;
      }
      if (this.filterExpiry !== "all" && expiryCategory(d) !== this.filterExpiry) return false;
      if (this.filterAutoRenew === "on" && !d.autoRenew) return false;
      if (this.filterAutoRenew === "off" && d.autoRenew) return false;
      return true;
    });

    if (this.sortField) {
      const dir = this.sortDir === "asc" ? 1 : -1;
      result = result.slice().sort((a, b) => {
        const va = this._sortValue(a, this.sortField);
        const vb = this._sortValue(b, this.sortField);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
    }

    return result;
  }

  bindEvents() {
    document.getElementById("dnsAddBtn")?.addEventListener("click", () => {
      this.tm.dnsSidenavModule?.open(null);
    });

    document.getElementById("dnsSyncCfBtn")?.addEventListener("click", () => {
      this.syncCloudflare();
    });

    document.getElementById("dnsSearch")?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this._saveFilters();
      this.renderTable();
    });

    document.getElementById("dnsExpiryChips")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-expiry]");
      if (!btn) return;
      this.filterExpiry = btn.dataset.expiry;
      document.querySelectorAll("[data-expiry]").forEach(b =>
        b.classList.toggle("active", b.dataset.expiry === this.filterExpiry)
      );
      this._saveFilters();
      this.renderTable();
    });

    document.getElementById("dnsAutoRenewChips")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-autorenew]");
      if (!btn) return;
      this.filterAutoRenew = btn.dataset.autorenew;
      document.querySelectorAll("[data-autorenew]").forEach(b =>
        b.classList.toggle("active", b.dataset.autorenew === this.filterAutoRenew)
      );
      this._saveFilters();
      this.renderTable();
    });

    document.querySelector(".dns-table thead")?.addEventListener("click", (e) => {
      const th = e.target.closest("[data-sort]");
      if (!th) return;
      const field = th.dataset.sort;
      if (this.sortField === field) {
        this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      } else {
        this.sortField = field;
        this.sortDir = "asc";
      }
      this._saveFilters();
      this.render();
    });

    document.getElementById("dnsSelectAll")?.addEventListener("change", (e) => {
      const rows = document.querySelectorAll(".dns-row-check");
      rows.forEach(cb => {
        cb.checked = e.target.checked;
        if (e.target.checked) this.selected.add(cb.dataset.id);
        else this.selected.delete(cb.dataset.id);
      });
      this.updateBatchBar();
    });

    document.getElementById("dnsTableBody")?.addEventListener("change", (e) => {
      if (!e.target.classList.contains("dns-row-check")) return;
      const id = e.target.dataset.id;
      if (e.target.checked) this.selected.add(id);
      else this.selected.delete(id);
      this.updateBatchBar();
    });

    document.getElementById("dnsTableBody")?.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".dns-edit-btn");
      if (!editBtn) return;
      const id = editBtn.dataset.id;
      const domain = this.domains.find(d => d.id === id);
      if (domain) this.tm.dnsSidenavModule?.open(domain);
    });

    document.getElementById("dnsBatchCostBtn")?.addEventListener("click", () => {
      const pop = document.getElementById("dnsPricePopover");
      if (pop) pop.classList.toggle("hidden");
    });

    document.getElementById("dnsBatchPriceApply")?.addEventListener("click", () => {
      this.applyBatchCost();
    });

    document.getElementById("dnsBatchPriceCancel")?.addEventListener("click", () => {
      const pop = document.getElementById("dnsPricePopover");
      if (pop) pop.classList.add("hidden");
    });

    document.getElementById("dnsBatchDeleteBtn")?.addEventListener("click", () => {
      this.batchDelete();
    });
  }

  renderTable() {
    const tbody = document.getElementById("dnsTableBody");
    if (!tbody) { this.render(); return; }
    const filtered = this.filtered();
    if (filtered.length === 0) {
      tbody.parentElement.parentElement.innerHTML =
        `<div class="dns-empty">No domains match the current filters.</div>`;
      return;
    }
    tbody.innerHTML = filtered.map(d => this.renderRow(d)).join("");
  }

  updateBatchBar() {
    const bar = document.getElementById("dnsBatchBar");
    const count = document.getElementById("dnsBatchCount");
    if (!bar) return;
    const n = this.selected.size;
    bar.classList.toggle("hidden", n === 0);
    if (count) count.textContent = `${n} selected`;
  }

  async syncCloudflare() {
    const btn = document.getElementById("dnsSyncCfBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Syncing..."; }
    try {
      const result = await DnsAPI.syncCloudflare();
      await this.load();
      const synced = result?.synced ?? 0;
      this.showToast(`Synced ${synced} domain${synced !== 1 ? "s" : ""} from Cloudflare`);
    } catch (err) {
      this.showToast(`Sync failed: ${err?.message || "Unknown error"}`, true);
      if (btn) { btn.disabled = false; btn.textContent = "Scan from Cloudflare"; }
    }
  }

  async applyBatchCost() {
    const input = document.getElementById("dnsBatchPriceInput");
    const cost = parseFloat(input?.value);
    if (isNaN(cost) || cost < 0) return;
    for (const id of this.selected) {
      await DnsAPI.update(id, { renewalCostUsd: cost });
    }
    await this.load();
    this.showToast(`Updated renewal cost for ${this.selected.size} domain(s)`);
  }

  async batchDelete() {
    const n = this.selected.size;
    if (!(await showConfirm(`Delete ${n} domain${n !== 1 ? "s" : ""}? This cannot be undone.`))) return;
    for (const id of [...this.selected]) {
      await DnsAPI.delete(id);
    }
    await this.load();
    this.showToast(`Deleted ${n} domain${n !== 1 ? "s" : ""}`);
  }

  showToast(msg, isError = false) {
    if (this.tm?.showToast) {
      this.tm.showToast(msg, isError ? "error" : "success");
      return;
    }
    // Fallback
    const t = document.createElement("div");
    t.className = "dns-toast-fallback";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  escHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
