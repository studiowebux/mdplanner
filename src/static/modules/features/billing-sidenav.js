// Billing Sidenav Module
// Slide-in panel for Billing entities (Customer, Rate, Quote, Invoice)

import { Sidenav } from "../ui/sidenav.js";
import { BillingAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class BillingSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.entityType = null; // 'customer', 'rate', 'quote', 'invoice'
    this.editingId = null;
    this.currentEntity = null;
    this.autoSaveTimeout = null;
    this.lineItems = [];
  }

  bindEvents() {
    document.getElementById("billingSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("billingSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("billingSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
  }

  // === Customer Operations ===
  openNewCustomer() {
    this.entityType = "customer";
    this.editingId = null;
    this.currentEntity = {
      name: "",
      email: "",
      phone: "",
      company: "",
      billingAddress: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
      notes: "",
    };
    this.openPanel("New Customer");
  }

  openEditCustomer(customerId) {
    const customer = this.tm.billingModule?.customers.find((c) =>
      c.id === customerId
    );
    if (!customer) return;

    this.entityType = "customer";
    this.editingId = customerId;
    this.currentEntity = JSON.parse(JSON.stringify(customer));
    this.openPanel("Edit Customer");
  }

  // === Rate Operations ===
  openNewRate() {
    this.entityType = "rate";
    this.editingId = null;
    this.currentEntity = {
      name: "",
      hourlyRate: 0,
      assignee: "",
      isDefault: false,
    };
    this.openPanel("New Billing Rate");
  }

  openEditRate(rateId) {
    const rate = this.tm.billingModule?.billingRates.find((r) =>
      r.id === rateId
    );
    if (!rate) return;

    this.entityType = "rate";
    this.editingId = rateId;
    this.currentEntity = JSON.parse(JSON.stringify(rate));
    this.openPanel("Edit Billing Rate");
  }

  // === Quote Operations ===
  openNewQuote() {
    this.entityType = "quote";
    this.editingId = null;
    this.currentEntity = {
      title: "",
      customerId: "",
      validUntil: "",
      taxRate: 0,
      notes: "",
    };
    this.lineItems = [];
    this.openPanel("New Quote");
  }

  openEditQuote(quoteId) {
    const quote = this.tm.billingModule?.quotes.find((q) => q.id === quoteId);
    if (!quote) return;

    this.entityType = "quote";
    this.editingId = quoteId;
    this.currentEntity = JSON.parse(JSON.stringify(quote));
    this.lineItems = [...(quote.lineItems || [])];
    this.openPanel("Edit Quote");
  }

  // === Invoice Operations ===
  openNewInvoice() {
    this.entityType = "invoice";
    this.editingId = null;
    this.currentEntity = {
      title: "",
      customerId: "",
      dueDate: "",
      taxRate: 0,
      notes: "",
    };
    this.lineItems = [];
    this.openPanel("New Invoice");
  }

  openEditInvoice(invoiceId) {
    const invoice = this.tm.billingModule?.invoices.find((i) =>
      i.id === invoiceId
    );
    if (!invoice) return;

    this.entityType = "invoice";
    this.editingId = invoiceId;
    this.currentEntity = JSON.parse(JSON.stringify(invoice));
    this.lineItems = [...(invoice.lineItems || [])];
    this.openPanel("Edit Invoice");
  }

  openPanel(title) {
    document.getElementById("billingSidenavHeader").textContent = title;
    this.renderContent();
    document.getElementById("billingSidenavDelete").classList.toggle(
      "hidden",
      !this.editingId,
    );
    Sidenav.open("billingSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close("billingSidenav");
    this.entityType = null;
    this.editingId = null;
    this.currentEntity = null;
    this.lineItems = [];
  }

  renderContent() {
    const container = document.getElementById("billingSidenavContent");
    if (!container) return;

    switch (this.entityType) {
      case "customer":
        container.innerHTML = this.renderCustomerForm();
        break;
      case "rate":
        container.innerHTML = this.renderRateForm();
        break;
      case "quote":
        container.innerHTML = this.renderQuoteForm();
        break;
      case "invoice":
        container.innerHTML = this.renderInvoiceForm();
        break;
      default:
        container.innerHTML =
          '<div class="text-gray-500">Select an entity type</div>';
    }

    // Bind auto-save to inputs
    container.querySelectorAll("input, select, textarea").forEach((el) => {
      el.addEventListener("input", () => this.scheduleAutoSave());
      el.addEventListener("change", () => this.scheduleAutoSave());
    });
  }

  renderCustomerForm() {
    const c = this.currentEntity;
    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Name *</label>
          <input type="text" id="billingSidenavCustomerName" class="form-input" value="${
      escapeHtml(c.name || "")
    }" required>
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="billingSidenavCustomerEmail" class="form-input" value="${
      escapeHtml(c.email || "")
    }">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="tel" id="billingSidenavCustomerPhone" class="form-input" value="${
      escapeHtml(c.phone || "")
    }">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Company</label>
          <input type="text" id="billingSidenavCustomerCompany" class="form-input" value="${
      escapeHtml(c.company || "")
    }">
        </div>
      </div>
      <div class="sidenav-section">
        <div class="sidenav-section-title">Billing Address</div>
        <div class="form-group">
          <input type="text" id="billingSidenavCustomerStreet" class="form-input" placeholder="Street" value="${
      escapeHtml(c.billingAddress?.street || "")
    }">
        </div>
        <div class="sidenav-grid grid-cols-3">
          <div class="form-group">
            <input type="text" id="billingSidenavCustomerCity" class="form-input" placeholder="City" value="${
      escapeHtml(c.billingAddress?.city || "")
    }">
          </div>
          <div class="form-group">
            <input type="text" id="billingSidenavCustomerState" class="form-input" placeholder="State" value="${
      escapeHtml(c.billingAddress?.state || "")
    }">
          </div>
          <div class="form-group">
            <input type="text" id="billingSidenavCustomerPostal" class="form-input" placeholder="Postal" value="${
      escapeHtml(c.billingAddress?.postalCode || "")
    }">
          </div>
        </div>
        <div class="form-group">
          <input type="text" id="billingSidenavCustomerCountry" class="form-input" placeholder="Country" value="${
      escapeHtml(c.billingAddress?.country || "")
    }">
        </div>
      </div>
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="billingSidenavCustomerNotes" class="form-input" rows="3">${
      escapeHtml(c.notes || "")
    }</textarea>
        </div>
      </div>
    `;
  }

  renderRateForm() {
    const r = this.currentEntity;
    const peopleOptions = Array.from(this.tm.peopleMap.entries())
      .map(([id, person]) =>
        `<option value="${id}" ${id === r.assignee ? "selected" : ""}>${
          escapeHtml(person.name)
        }${person.role ? ` (${escapeHtml(person.role)})` : ""}</option>`
      ).join("");
    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Rate Name *</label>
          <input type="text" id="billingSidenavRateName" class="form-input" value="${
      escapeHtml(r.name || "")
    }" required placeholder="e.g., Senior Developer">
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Hourly Rate ($)</label>
            <input type="number" id="billingSidenavRateHourly" class="form-input" value="${
      r.hourlyRate || 0
    }" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Assignee</label>
            <select id="billingSidenavRateAssignee" class="form-input">
              <option value="">-- None --</option>
              ${peopleOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="billingSidenavRateDefault" class="rounded" ${
      r.isDefault ? "checked" : ""
    }>
            <span class="text-sm text-gray-700 dark:text-gray-300">Default Rate</span>
          </label>
        </div>
      </div>
    `;
  }

  renderQuoteForm() {
    const q = this.currentEntity;
    const customers = this.tm.billingModule?.customers || [];
    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Quote Title *</label>
          <input type="text" id="billingSidenavQuoteTitle" class="form-input" value="${
      escapeHtml(q.title || "")
    }" required>
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Customer *</label>
            <select id="billingSidenavQuoteCustomer" class="form-input">
              <option value="">Select customer...</option>
              ${
      customers.map((c) =>
        `<option value="${c.id}" ${c.id === q.customerId ? "selected" : ""}>${
          escapeHtml(c.name)
        }</option>`
      ).join("")
    }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Valid Until</label>
            <input type="date" id="billingSidenavQuoteValidUntil" class="form-input" value="${
      q.validUntil || ""
    }">
          </div>
        </div>
      </div>
      <div class="sidenav-section">
        <div class="flex justify-between items-center mb-2">
          <span class="sidenav-section-title">Line Items</span>
          <button type="button" onclick="taskManager.billingSidenavModule.addLineItem()" class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">+ Add</button>
        </div>
        <div id="billingSidenavLineItems" class="space-y-2">${this.renderLineItems()}</div>
      </div>
      <div class="sidenav-section">
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Tax Rate (%)</label>
            <input type="number" id="billingSidenavQuoteTaxRate" class="form-input" value="${
      q.taxRate || 0
    }" min="0" max="100" step="0.01"
                   onchange="taskManager.billingSidenavModule.updateTotals()">
          </div>
          <div class="form-group">
            <label class="form-label">Subtotal</label>
            <div id="billingSidenavSubtotal" class="text-lg font-medium text-gray-900 dark:text-gray-100">$0.00</div>
          </div>
        </div>
        <div class="flex justify-between items-center mt-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">Tax</span>
          <span id="billingSidenavTax" class="text-sm text-gray-600 dark:text-gray-400">$0.00</span>
        </div>
        <div class="flex justify-between items-center mt-1 pt-2 border-t border-gray-200 dark:border-gray-600">
          <span class="font-medium text-gray-900 dark:text-gray-100">Total</span>
          <span id="billingSidenavTotal" class="text-xl font-bold text-gray-900 dark:text-gray-100">$0.00</span>
        </div>
      </div>
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="billingSidenavQuoteNotes" class="form-input" rows="3">${
      escapeHtml(q.notes || "")
    }</textarea>
        </div>
      </div>
    `;
  }

  renderInvoiceForm() {
    const inv = this.currentEntity;
    const customers = this.tm.billingModule?.customers || [];
    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Invoice Title *</label>
          <input type="text" id="billingSidenavInvoiceTitle" class="form-input" value="${
      escapeHtml(inv.title || "")
    }" required>
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Customer *</label>
            <select id="billingSidenavInvoiceCustomer" class="form-input">
              <option value="">Select customer...</option>
              ${
      customers.map((c) =>
        `<option value="${c.id}" ${c.id === inv.customerId ? "selected" : ""}>${
          escapeHtml(c.name)
        }</option>`
      ).join("")
    }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="billingSidenavInvoiceDueDate" class="form-input" value="${
      inv.dueDate || ""
    }">
          </div>
        </div>
      </div>
      <div class="sidenav-section">
        <div class="flex justify-between items-center mb-2">
          <span class="sidenav-section-title">Line Items</span>
          <button type="button" onclick="taskManager.billingSidenavModule.addLineItem()" class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">+ Add</button>
        </div>
        <div id="billingSidenavLineItems" class="space-y-2">${this.renderLineItems()}</div>
      </div>
      <div class="sidenav-section">
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Tax Rate (%)</label>
            <input type="number" id="billingSidenavInvoiceTaxRate" class="form-input" value="${
      inv.taxRate || 0
    }" min="0" max="100" step="0.01"
                   onchange="taskManager.billingSidenavModule.updateTotals()">
          </div>
          <div class="form-group">
            <label class="form-label">Subtotal</label>
            <div id="billingSidenavSubtotal" class="text-lg font-medium text-gray-900 dark:text-gray-100">$0.00</div>
          </div>
        </div>
        <div class="flex justify-between items-center mt-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">Tax</span>
          <span id="billingSidenavTax" class="text-sm text-gray-600 dark:text-gray-400">$0.00</span>
        </div>
        <div class="flex justify-between items-center mt-1 pt-2 border-t border-gray-200 dark:border-gray-600">
          <span class="font-medium text-gray-900 dark:text-gray-100">Total</span>
          <span id="billingSidenavTotal" class="text-xl font-bold text-gray-900 dark:text-gray-100">$0.00</span>
        </div>
      </div>
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="billingSidenavInvoiceNotes" class="form-input" rows="3">${
      escapeHtml(inv.notes || "")
    }</textarea>
        </div>
      </div>
    `;
  }

  renderLineItems() {
    if (this.lineItems.length === 0) {
      return '<div class="text-gray-400 dark:text-gray-500 text-sm italic py-2">No line items yet</div>';
    }

    return this.lineItems.map((item, idx) => `
      <div class="flex gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded" data-line-idx="${idx}">
        <input type="text" placeholder="Description" value="${
      escapeHtml(item.description || "")
    }"
          onchange="taskManager.billingSidenavModule.updateLineItem(${idx}, 'description', this.value)"
          class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded">
        <input type="number" placeholder="Qty" value="${
      item.quantity || 1
    }" step="0.01" min="0"
          onchange="taskManager.billingSidenavModule.updateLineItem(${idx}, 'quantity', this.value)"
          class="w-14 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-right">
        <input type="number" placeholder="Rate" value="${
      item.rate || 0
    }" step="0.01" min="0"
          onchange="taskManager.billingSidenavModule.updateLineItem(${idx}, 'rate', this.value)"
          class="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-right">
        <span class="w-16 text-sm text-right text-gray-900 dark:text-gray-100">$${
      (item.amount || 0).toFixed(2)
    }</span>
        <button type="button" onclick="taskManager.billingSidenavModule.removeLineItem(${idx})"
                class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-lg">&times;</button>
      </div>
    `).join("");
  }

  addLineItem() {
    this.lineItems.push({
      id: crypto.randomUUID().substring(0, 8),
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    });
    this.refreshLineItems();
    this.scheduleAutoSave();
  }

  updateLineItem(idx, field, value) {
    const item = this.lineItems[idx];
    if (!item) return;

    if (field === "quantity" || field === "rate") {
      item[field] = parseFloat(value) || 0;
      item.amount = item.quantity * item.rate;
    } else {
      item[field] = value;
    }

    this.refreshLineItems();
    this.updateTotals();
    this.scheduleAutoSave();
  }

  removeLineItem(idx) {
    this.lineItems.splice(idx, 1);
    this.refreshLineItems();
    this.updateTotals();
    this.scheduleAutoSave();
  }

  refreshLineItems() {
    const container = document.getElementById("billingSidenavLineItems");
    if (container) container.innerHTML = this.renderLineItems();
    this.updateTotals();
  }

  updateTotals() {
    const subtotal = this.lineItems.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );
    const taxRateEl = this.entityType === "quote"
      ? document.getElementById("billingSidenavQuoteTaxRate")
      : document.getElementById("billingSidenavInvoiceTaxRate");
    const taxRate = parseFloat(taxRateEl?.value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const subtotalEl = document.getElementById("billingSidenavSubtotal");
    const taxEl = document.getElementById("billingSidenavTax");
    const totalEl = document.getElementById("billingSidenavTotal");

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  }

  getFormData() {
    switch (this.entityType) {
      case "customer":
        return {
          name: document.getElementById("billingSidenavCustomerName")?.value
            .trim() || "",
          email: document.getElementById("billingSidenavCustomerEmail")?.value
            .trim() || null,
          phone: document.getElementById("billingSidenavCustomerPhone")?.value
            .trim() || null,
          company:
            document.getElementById("billingSidenavCustomerCompany")?.value
              .trim() || null,
          billingAddress: {
            street:
              document.getElementById("billingSidenavCustomerStreet")?.value
                .trim() || null,
            city: document.getElementById("billingSidenavCustomerCity")?.value
              .trim() || null,
            state: document.getElementById("billingSidenavCustomerState")?.value
              .trim() || null,
            postalCode:
              document.getElementById("billingSidenavCustomerPostal")?.value
                .trim() || null,
            country:
              document.getElementById("billingSidenavCustomerCountry")?.value
                .trim() || null,
          },
          notes: document.getElementById("billingSidenavCustomerNotes")?.value
            .trim() || null,
        };

      case "rate":
        return {
          name:
            document.getElementById("billingSidenavRateName")?.value.trim() ||
            "",
          hourlyRate: parseFloat(
            document.getElementById("billingSidenavRateHourly")?.value,
          ) || 0,
          assignee: document.getElementById("billingSidenavRateAssignee")?.value ||
            null,
          isDefault:
            document.getElementById("billingSidenavRateDefault")?.checked ||
            false,
        };

      case "quote":
        return {
          title:
            document.getElementById("billingSidenavQuoteTitle")?.value.trim() ||
            "",
          customerId:
            document.getElementById("billingSidenavQuoteCustomer")?.value ||
            null,
          validUntil:
            document.getElementById("billingSidenavQuoteValidUntil")?.value ||
            null,
          taxRate: parseFloat(
            document.getElementById("billingSidenavQuoteTaxRate")?.value,
          ) || 0,
          lineItems: this.lineItems,
          notes:
            document.getElementById("billingSidenavQuoteNotes")?.value.trim() ||
            null,
        };

      case "invoice":
        return {
          title: document.getElementById("billingSidenavInvoiceTitle")?.value
            .trim() || "",
          customerId:
            document.getElementById("billingSidenavInvoiceCustomer")?.value ||
            null,
          dueDate:
            document.getElementById("billingSidenavInvoiceDueDate")?.value ||
            null,
          taxRate: parseFloat(
            document.getElementById("billingSidenavInvoiceTaxRate")?.value,
          ) || 0,
          lineItems: this.lineItems,
          notes: document.getElementById("billingSidenavInvoiceNotes")?.value
            .trim() || null,
        };

      default:
        return {};
    }
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.showSaveStatus("Saving...");
    this.autoSaveTimeout = setTimeout(() => this.save(), 1000);
  }

  async save() {
    const data = this.getFormData();

    // Validate required fields
    const requiredField = this.getRequiredFieldName();
    if (!data[requiredField]) {
      this.showSaveStatus(`${requiredField} required`);
      return;
    }

    try {
      if (this.editingId) {
        await this.updateEntity(data);
        this.showSaveStatus("Saved");
      } else {
        const result = await this.createEntity(data);
        this.editingId = result.id;
        this.showSaveStatus("Created");
        document.getElementById("billingSidenavDelete").classList.remove(
          "hidden",
        );
      }
      await this.tm.billingModule?.load();
    } catch (error) {
      console.error(`Error saving ${this.entityType}:`, error);
      this.showSaveStatus("Error");
      showToast(`Error saving ${this.entityType}`, "error");
    }
  }

  getRequiredFieldName() {
    switch (this.entityType) {
      case "customer":
        return "name";
      case "rate":
        return "name";
      case "quote":
        return "title";
      case "invoice":
        return "title";
      default:
        return "name";
    }
  }

  async createEntity(data) {
    let response;
    switch (this.entityType) {
      case "customer":
        response = await BillingAPI.createCustomer(data);
        break;
      case "rate":
        response = await BillingAPI.createRate(data);
        break;
      case "quote":
        response = await BillingAPI.createQuote(data);
        break;
      case "invoice":
        response = await BillingAPI.createInvoice(data);
        break;
    }
    return response.json();
  }

  async updateEntity(data) {
    switch (this.entityType) {
      case "customer":
        await BillingAPI.updateCustomer(this.editingId, data);
        break;
      case "rate":
        await BillingAPI.updateRate(this.editingId, data);
        break;
      case "quote":
        await BillingAPI.updateQuote(this.editingId, data);
        break;
      case "invoice":
        await BillingAPI.updateInvoice(this.editingId, data);
        break;
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    if (!confirm(`Delete this ${this.entityType}?`)) return;

    try {
      switch (this.entityType) {
        case "customer":
          await BillingAPI.deleteCustomer(this.editingId);
          break;
        case "rate":
          await BillingAPI.deleteRate(this.editingId);
          break;
        case "quote":
          await BillingAPI.deleteQuote(this.editingId);
          break;
        case "invoice":
          await BillingAPI.deleteInvoice(this.editingId);
          break;
      }
      showToast(
        `${
          this.entityType.charAt(0).toUpperCase() + this.entityType.slice(1)
        } deleted`,
        "success",
      );
      await this.tm.billingModule?.load();
      this.close();
    } catch (error) {
      console.error(`Error deleting ${this.entityType}:`, error);
      showToast(`Error deleting ${this.entityType}`, "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("billingSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "sidenav-status-saved",
      "sidenav-status-saving",
      "sidenav-status-error",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("sidenav-status-saved");
    } else if (text === "Error" || text.includes("required")) {
      statusEl.classList.add("sidenav-status-error");
    } else {
      statusEl.classList.add("sidenav-status-saving");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}

export default BillingSidenavModule;
