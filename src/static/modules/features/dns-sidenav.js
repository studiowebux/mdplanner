// DNS domain create/edit sidenav
import { DnsAPI } from "../api.js";

export class DnsSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
  }

  open(domain) {
    this.editingId = domain?.id ?? null;
    this.populate(domain);
    const panel = document.getElementById("dnsSidenav");
    if (panel) panel.classList.remove("hidden");
  }

  close() {
    const panel = document.getElementById("dnsSidenav");
    if (panel) panel.classList.add("hidden");
    this.editingId = null;
  }

  populate(domain) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!val;
      else el.value = val ?? "";
    };

    set("dnsFieldDomain", domain?.domain ?? "");
    set("dnsFieldExpiryDate", domain?.expiryDate ?? "");
    set("dnsFieldAutoRenew", domain?.autoRenew ?? false);
    set("dnsFieldRenewalCost", domain?.renewalCostUsd ?? "");
    set("dnsFieldProvider", domain?.provider ?? "");
    set("dnsFieldNameservers", (domain?.nameservers ?? []).join("\n"));
    set("dnsFieldNotes", domain?.notes ?? "");

    // Cloudflare-synced block: show last-fetched, read-only expiry/autoRenew
    const cfBlock = document.getElementById("dnsCfSyncedBlock");
    const cfFetched = document.getElementById("dnsCfLastFetched");
    if (cfBlock && domain?.lastFetchedAt) {
      cfBlock.classList.remove("hidden");
      if (cfFetched) {
        const d = new Date(domain.lastFetchedAt);
        cfFetched.textContent = d.toLocaleString();
      }
    } else if (cfBlock) {
      cfBlock.classList.add("hidden");
    }

    const title = document.getElementById("dnsSidenavTitle");
    if (title) title.textContent = domain ? "Edit Domain" : "Add Domain";

    const deleteBtn = document.getElementById("dnsSidenavDeleteBtn");
    if (deleteBtn) deleteBtn.classList.toggle("hidden", !domain);
  }

  async save() {
    const get = (id) => {
      const el = document.getElementById(id);
      if (!el) return undefined;
      if (el.type === "checkbox") return el.checked;
      return el.value.trim() || undefined;
    };

    const domain = get("dnsFieldDomain");
    if (!domain) {
      alert("Domain name is required");
      return;
    }

    const nameserversRaw = get("dnsFieldNameservers") ?? "";
    const nameservers = nameserversRaw
      ? nameserversRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      : undefined;

    const costRaw = get("dnsFieldRenewalCost");
    const renewalCostUsd = costRaw ? parseFloat(costRaw) : undefined;

    const payload = {
      domain,
      expiryDate: get("dnsFieldExpiryDate"),
      autoRenew: document.getElementById("dnsFieldAutoRenew")?.checked ?? false,
      renewalCostUsd: !isNaN(renewalCostUsd) ? renewalCostUsd : undefined,
      provider: get("dnsFieldProvider"),
      nameservers,
      notes: get("dnsFieldNotes"),
    };

    const saveBtn = document.getElementById("dnsSidenavSaveBtn");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; }

    try {
      if (this.editingId) {
        await DnsAPI.update(this.editingId, payload);
      } else {
        await DnsAPI.create(payload);
      }
      this.close();
      await this.tm.dnsModule?.load();
    } catch (err) {
      alert(`Failed to save: ${err?.message ?? "Unknown error"}`);
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save"; }
    }
  }

  async deleteDomain() {
    if (!this.editingId) return;
    if (!confirm("Delete this domain? This cannot be undone.")) return;
    try {
      await DnsAPI.delete(this.editingId);
      this.close();
      await this.tm.dnsModule?.load();
    } catch (err) {
      alert(`Failed to delete: ${err?.message ?? "Unknown error"}`);
    }
  }

  bindEvents() {
    document.getElementById("dnsSidenavCloseBtn")
      ?.addEventListener("click", () => this.close());
    document.getElementById("dnsSidenavSaveBtn")
      ?.addEventListener("click", () => this.save());
    document.getElementById("dnsSidenavDeleteBtn")
      ?.addEventListener("click", () => this.deleteDomain());

    // Close on overlay click
    document.getElementById("dnsSidenav")
      ?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) this.close();
      });
  }
}
