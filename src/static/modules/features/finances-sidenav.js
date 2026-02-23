// Finances Sidenav Module
// Create/edit a financial period with dynamic revenue and expense line items.

import { FinancesAPI } from "../api.js";
import { Sidenav } from "../ui/sidenav.js";

export class FinancesSidenavModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.editingId = null;
    // Working copies of line items
    this._revenue = [];
    this._expenses = [];
  }

  openCreate() {
    this.editingId = null;
    this._revenue = [];
    this._expenses = [];
    this._resetForm();
    document.getElementById("financesSidenavHeader").textContent = "New Period";
    document.getElementById("financesDeleteBtn").classList.add("hidden");
    document.getElementById("financesSidenavSaveStatus").classList.add("hidden");
    this._renderItems();
    Sidenav.open("financesSidenav");
  }

  openEdit(period) {
    this.editingId = period.id;
    this._revenue = (period.revenue || []).map((i) => ({ ...i }));
    this._expenses = (period.expenses || []).map((i) => ({ ...i }));
    document.getElementById("financesSidenavHeader").textContent = "Edit Period";
    document.getElementById("financesSidenavPeriod").value = period.period || "";
    document.getElementById("financesSidenavCash").value = period.cash_on_hand ?? "";
    document.getElementById("financesSidenavNotes").value = period.notes || "";
    document.getElementById("financesDeleteBtn").classList.remove("hidden");
    document.getElementById("financesSidenavSaveStatus").classList.add("hidden");
    this._renderItems();
    Sidenav.open("financesSidenav");
  }

  _resetForm() {
    document.getElementById("financesSidenavPeriod").value = "";
    document.getElementById("financesSidenavCash").value = "";
    document.getElementById("financesSidenavNotes").value = "";
  }

  // ----------------------------------------------------------------
  // Line item rendering
  // ----------------------------------------------------------------

  _renderItems() {
    this._renderSection("financesRevenueItems", this._revenue, "rev");
    this._renderSection("financesExpenseItems", this._expenses, "exp");
  }

  _renderSection(containerId, items, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items
      .map(
        (item, idx) => `
        <div class="finances-item-row" data-prefix="${prefix}" data-idx="${idx}">
          <input
            class="finances-item-cat"
            type="text"
            placeholder="Category"
            value="${escapeHtml(item.category || "")}"
            data-field="category"
            data-prefix="${prefix}"
            data-idx="${idx}"
          />
          <input
            class="finances-item-amt"
            type="number"
            placeholder="Amount"
            value="${item.amount ?? ""}"
            min="0"
            data-field="amount"
            data-prefix="${prefix}"
            data-idx="${idx}"
          />
          <button class="finances-item-remove" data-remove="${prefix}" data-idx="${idx}" aria-label="Remove">&times;</button>
        </div>`,
      )
      .join("");
  }

  _syncItemFromInput(prefix, idx, field, value) {
    const arr = prefix === "rev" ? this._revenue : this._expenses;
    if (!arr[idx]) return;
    if (field === "amount") {
      arr[idx].amount = parseFloat(value) || 0;
    } else {
      arr[idx].category = value;
    }
  }

  _addItem(prefix) {
    const arr = prefix === "rev" ? this._revenue : this._expenses;
    arr.push({ category: "", amount: 0 });
    this._renderItems();
    // Focus the new category input
    const containerId = prefix === "rev" ? "financesRevenueItems" : "financesExpenseItems";
    const inputs = document
      .getElementById(containerId)
      ?.querySelectorAll(".finances-item-cat");
    if (inputs?.length) inputs[inputs.length - 1].focus();
  }

  _removeItem(prefix, idx) {
    const arr = prefix === "rev" ? this._revenue : this._expenses;
    arr.splice(idx, 1);
    this._renderItems();
  }

  // ----------------------------------------------------------------
  // Save / Delete
  // ----------------------------------------------------------------

  async _save() {
    const statusEl = document.getElementById("financesSidenavSaveStatus");
    const period = document.getElementById("financesSidenavPeriod").value.trim();
    const cash_on_hand =
      parseFloat(document.getElementById("financesSidenavCash").value) || 0;
    const notes =
      document.getElementById("financesSidenavNotes").value.trim() || undefined;

    if (!period) {
      statusEl.textContent = "Period is required (YYYY-MM)";
      statusEl.classList.remove("hidden");
      return;
    }

    // Filter out blank items
    const revenue = this._revenue.filter((i) => i.category.trim());
    const expenses = this._expenses.filter((i) => i.category.trim());

    try {
      if (this.editingId) {
        await FinancesAPI.update(this.editingId, {
          period,
          cash_on_hand,
          revenue,
          expenses,
          notes,
        });
      } else {
        await FinancesAPI.create({ period, cash_on_hand, revenue, expenses, notes });
      }
      statusEl.textContent = "Saved";
      statusEl.classList.remove("hidden");
      setTimeout(() => statusEl.classList.add("hidden"), 1500);
      await this.taskManager.financesModule.load();
      Sidenav.close("financesSidenav");
    } catch (err) {
      console.error("Error saving finances:", err);
      statusEl.textContent = "Error saving";
      statusEl.classList.remove("hidden");
    }
  }

  async _delete() {
    if (!this.editingId) return;
    if (!confirm("Delete this period?")) return;
    try {
      await FinancesAPI.delete(this.editingId);
      await this.taskManager.financesModule.load();
      Sidenav.close("financesSidenav");
    } catch (err) {
      console.error("Error deleting:", err);
    }
  }

  // ----------------------------------------------------------------
  // Event binding
  // ----------------------------------------------------------------

  bindEvents() {
    document.getElementById("financesSidenavClose")?.addEventListener("click", () =>
      Sidenav.close("financesSidenav"),
    );
    document.getElementById("financesSidenavSave")?.addEventListener("click", () =>
      this._save(),
    );
    document.getElementById("financesDeleteBtn")?.addEventListener("click", () =>
      this._delete(),
    );

    // Add item buttons
    document.getElementById("financesAddRevenueBtn")?.addEventListener("click", () =>
      this._addItem("rev"),
    );
    document.getElementById("financesAddExpenseBtn")?.addEventListener("click", () =>
      this._addItem("exp"),
    );

    // Delegated: sync inputs + remove buttons in both item lists
    ["financesRevenueItems", "financesExpenseItems"].forEach((id) => {
      const container = document.getElementById(id);
      if (!container) return;

      container.addEventListener("input", (e) => {
        const el = e.target;
        const prefix = el.dataset.prefix;
        const idx = parseInt(el.dataset.idx, 10);
        const field = el.dataset.field;
        if (prefix && !isNaN(idx) && field) {
          this._syncItemFromInput(prefix, idx, field, el.value);
        }
      });

      container.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-remove]");
        if (!btn) return;
        const prefix = btn.dataset.remove;
        const idx = parseInt(btn.dataset.idx, 10);
        if (prefix && !isNaN(idx)) this._removeItem(prefix, idx);
      });
    });
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
