import { BillingAPI } from "../api.js";

export class BillingModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.customers = [];
    this.billingRates = [];
    this.quotes = [];
    this.invoices = [];
    this.billingSummary = {};
    this.editingCustomerId = null;
    this.editingBillingRateId = null;
    this.editingQuoteId = null;
    this.editingInvoiceId = null;
    this.quoteLineItems = [];
    this.invoiceLineItems = [];
    this.payingInvoiceId = null;
  }

  async load() {
    try {
      const [customers, rates, quotes, invoices, summary] = await Promise.all([
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/billing-rates").then((r) => r.json()),
        fetch("/api/quotes").then((r) => r.json()),
        fetch("/api/invoices").then((r) => r.json()),
        fetch("/api/billing/summary").then((r) => r.json()),
      ]);

      this.customers = customers;
      this.billingRates = rates;
      this.quotes = quotes;
      this.invoices = invoices;
      this.billingSummary = summary;

      this.renderSummary();
      this.renderCustomersView();
      this.renderRatesView();
      this.renderQuotesView();
      this.renderInvoicesView();
    } catch (error) {
      console.error("Error loading billing data:", error);
    }
  }

  renderSummary() {
    const s = this.billingSummary || {};
    document.getElementById("billingSummaryOutstanding").textContent = this
      .formatCurrency(s.totalOutstanding || 0);
    document.getElementById("billingSummaryOverdue").textContent = this
      .formatCurrency(s.totalOverdue || 0);
    document.getElementById("billingSummaryPaid").textContent = this
      .formatCurrency(s.totalPaid || 0);
    document.getElementById("billingSummaryDraft").textContent =
      s.draftInvoices || 0;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  switchTab(tab) {
    document.querySelectorAll(".billing-tab").forEach((t) => {
      t.classList.remove(
        "text-gray-900",
        "dark:text-gray-100",
        "border-b-2",
        "border-gray-900",
        "dark:border-gray-100",
      );
      t.classList.add("text-gray-500", "dark:text-gray-400");
    });
    document.querySelector(`[data-billing-tab="${tab}"]`)?.classList.add(
      "text-gray-900",
      "dark:text-gray-100",
      "border-b-2",
      "border-gray-900",
      "dark:border-gray-100",
    );
    document.querySelector(`[data-billing-tab="${tab}"]`)?.classList.remove(
      "text-gray-500",
      "dark:text-gray-400",
    );

    document.querySelectorAll(".billing-tab-content").forEach((c) =>
      c.classList.add("hidden")
    );
    document.getElementById(`${tab}Tab`)?.classList.remove("hidden");
  }

  // Customer methods
  renderCustomersView() {
    const container = document.getElementById("customersContainer");
    const emptyState = document.getElementById("emptyCustomersState");

    if (!this.customers || this.customers.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = this.customers.map((c) => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${c.name}</h3>
          ${
      c.company
        ? `<span class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">${c.company}</span>`
        : ""
    }
        </div>
        ${
      c.email
        ? `<p class="text-sm text-gray-600 dark:text-gray-400">${c.email}</p>`
        : ""
    }
        ${
      c.phone
        ? `<p class="text-sm text-gray-600 dark:text-gray-400">${c.phone}</p>`
        : ""
    }
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openCustomerModal('${c.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Edit</button>
          <button onclick="taskManager.deleteCustomer('${c.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">Delete</button>
        </div>
      </div>
    `).join("");
  }

  // Customer operations use sidenav - Pattern: Sidenav Module
  openCustomerModal(id = null) {
    if (id) {
      this.tm.billingSidenavModule?.openEditCustomer(id);
    } else {
      this.tm.billingSidenavModule?.openNewCustomer();
    }
  }

  async deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;
    try {
      await BillingAPI.deleteCustomer(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  }

  // Billing Rate methods
  renderRatesView() {
    const container = document.getElementById("billingRatesContainer");
    const emptyState = document.getElementById("emptyRatesState");

    if (!this.billingRates || this.billingRates.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = this.billingRates.map((r) => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${r.name}</h3>
          ${
      r.isDefault
        ? '<span class="text-xs px-2 py-0.5 bg-gray-900 text-white rounded">Default</span>'
        : ""
    }
        </div>
        <p class="text-xl font-bold text-gray-900 dark:text-gray-100">${
      this.formatCurrency(r.hourlyRate)
    }/hr</p>
        ${
      r.assignee
        ? `<p class="text-sm text-gray-600 dark:text-gray-400">Assignee: ${r.assignee}</p>`
        : ""
    }
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openBillingRateModal('${r.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Edit</button>
          <button onclick="taskManager.deleteBillingRate('${r.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">Delete</button>
        </div>
      </div>
    `).join("");
  }

  // Rate operations use sidenav - Pattern: Sidenav Module
  openRateModal(id = null) {
    if (id) {
      this.tm.billingSidenavModule?.openEditRate(id);
    } else {
      this.tm.billingSidenavModule?.openNewRate();
    }
  }

  async deleteRate(id) {
    if (!confirm("Delete this billing rate?")) return;
    try {
      await BillingAPI.deleteRate(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting billing rate:", error);
    }
  }

  // Quote methods
  renderQuotesView() {
    const container = document.getElementById("quotesContainer");
    const emptyState = document.getElementById("emptyQuotesState");

    if (!this.quotes || this.quotes.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    const statusColors = {
      draft: "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200",
      sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      accepted:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    container.innerHTML = this.quotes.map((q) => {
      const customer = this.customers.find((c) => c.id === q.customerId);
      return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">${q.number}</p>
              <h3 class="font-medium text-gray-900 dark:text-gray-100">${q.title}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">${
        customer?.name || "Unknown"
      }</p>
            </div>
            <span class="px-2 py-1 text-xs rounded ${
        statusColors[q.status] || statusColors.draft
      }">${q.status}</span>
          </div>
          <p class="text-xl font-bold text-gray-900 dark:text-gray-100">${
        this.formatCurrency(q.total)
      }</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Created: ${q.created}</p>
          <div class="flex justify-end space-x-2 mt-3">
            ${
        q.status === "draft"
          ? `<button onclick="taskManager.sendQuote('${q.id}')" class="text-sm text-blue-600 hover:text-blue-800">Send</button>`
          : ""
      }
            ${
        q.status === "sent"
          ? `<button onclick="taskManager.acceptQuote('${q.id}')" class="text-sm text-green-600 hover:text-green-800">Accept</button>`
          : ""
      }
            ${
        q.status === "accepted"
          ? `<button onclick="taskManager.convertQuoteToInvoice('${q.id}')" class="text-sm text-purple-600 hover:text-purple-800">To Invoice</button>`
          : ""
      }
            <button onclick="taskManager.openQuoteModal('${q.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Edit</button>
            <button onclick="taskManager.deleteQuote('${q.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Quote operations use sidenav - Pattern: Sidenav Module
  openQuoteModal(id = null) {
    if (id) {
      this.tm.billingSidenavModule?.openEditQuote(id);
    } else {
      this.tm.billingSidenavModule?.openNewQuote();
    }
  }

  populateCustomerSelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select customer...</option>' +
      this.customers.map((c) => `<option value="${c.id}">${c.name}</option>`)
        .join("");
  }

  removeQuoteLineItem(id) {
    this.quoteLineItems = this.quoteLineItems.filter((i) => i.id !== id);
    this.renderQuoteLineItems();
    this.updateQuoteTotals();
  }

  updateQuoteTotals() {
    const subtotal = this.quoteLineItems.reduce((sum, i) => sum + i.amount, 0);
    const taxRate = parseFloat(document.getElementById("quoteTaxRate").value) ||
      0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    document.getElementById("quoteSubtotal").textContent = this.formatCurrency(
      subtotal,
    );
    document.getElementById("quoteTax").textContent = this.formatCurrency(tax);
    document.getElementById("quoteTotal").textContent = this.formatCurrency(
      total,
    );
  }

  async saveQuote(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById("quoteTitle").value,
      customerId: document.getElementById("quoteCustomer").value,
      validUntil: document.getElementById("quoteValidUntil").value || null,
      taxRate: parseFloat(document.getElementById("quoteTaxRate").value) || 0,
      lineItems: this.quoteLineItems,
      notes: document.getElementById("quoteNotes").value || null,
    };

    try {
      if (this.editingQuoteId) {
        await BillingAPI.updateQuote(this.editingQuoteId, data);
      } else {
        await BillingAPI.createQuote(data);
      }
      this.closeQuoteModal();
      await this.load();
    } catch (error) {
      console.error("Error saving quote:", error);
    }
  }

  async deleteQuote(id) {
    if (!confirm("Delete this quote?")) return;
    try {
      await BillingAPI.deleteQuote(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting quote:", error);
    }
  }

  async sendQuote(id) {
    try {
      await BillingAPI.sendQuote(id);
      await this.load();
    } catch (error) {
      console.error("Error sending quote:", error);
    }
  }

  async acceptQuote(id) {
    try {
      await BillingAPI.acceptQuote(id);
      await this.load();
    } catch (error) {
      console.error("Error accepting quote:", error);
    }
  }

  async convertQuoteToInvoice(id) {
    try {
      await BillingAPI.convertQuoteToInvoice(id);
      await this.load();
      this.switchTab("invoices");
    } catch (error) {
      console.error("Error converting quote to invoice:", error);
    }
  }

  // Invoice methods
  renderInvoicesView() {
    const container = document.getElementById("invoicesContainer");
    const emptyState = document.getElementById("emptyInvoicesState");

    if (!this.invoices || this.invoices.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    const statusColors = {
      draft: "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200",
      sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      cancelled:
        "bg-gray-400 text-gray-800 dark:bg-gray-500 dark:text-gray-200",
    };

    container.innerHTML = this.invoices.map((inv) => {
      const customer = this.customers.find((c) => c.id === inv.customerId);
      const balance = inv.total - inv.paidAmount;
      return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">${inv.number}</p>
              <h3 class="font-medium text-gray-900 dark:text-gray-100">${inv.title}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">${
        customer?.name || "Unknown"
      }</p>
            </div>
            <span class="px-2 py-1 text-xs rounded ${
        statusColors[inv.status] || statusColors.draft
      }">${inv.status}</span>
          </div>
          <div class="flex justify-between items-center">
            <div>
              <p class="text-xl font-bold text-gray-900 dark:text-gray-100">${
        this.formatCurrency(inv.total)
      }</p>
              ${
        balance > 0
          ? `<p class="text-sm text-red-600">Balance: ${
            this.formatCurrency(balance)
          }</p>`
          : ""
      }
            </div>
            ${
        inv.dueDate
          ? `<p class="text-xs text-gray-500 dark:text-gray-400">Due: ${inv.dueDate}</p>`
          : ""
      }
          </div>
          <div class="flex justify-end space-x-2 mt-3">
            ${
        inv.status === "draft"
          ? `<button onclick="taskManager.sendInvoice('${inv.id}')" class="text-sm text-blue-600 hover:text-blue-800">Send</button>`
          : ""
      }
            ${
        (inv.status === "sent" || inv.status === "overdue") && balance > 0
          ? `<button onclick="taskManager.openPaymentModal('${inv.id}')" class="text-sm text-green-600 hover:text-green-800">Record Payment</button>`
          : ""
      }
            <button onclick="taskManager.openInvoiceModal('${inv.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Edit</button>
            <button onclick="taskManager.deleteInvoice('${inv.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Invoice operations use sidenav - Pattern: Sidenav Module
  openInvoiceModal(id = null) {
    if (id) {
      this.tm.billingSidenavModule?.openEditInvoice(id);
    } else {
      this.tm.billingSidenavModule?.openNewInvoice();
    }
  }

  async deleteInvoice(id) {
    if (!confirm("Delete this invoice?")) return;
    try {
      await BillingAPI.deleteInvoice(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  }

  async sendInvoice(id) {
    try {
      await BillingAPI.sendInvoice(id);
      await this.load();
    } catch (error) {
      console.error("Error sending invoice:", error);
    }
  }

  // Payment methods
  openPaymentModal(invoiceId) {
    this.payingInvoiceId = invoiceId;
    const modal = document.getElementById("paymentModal");
    document.getElementById("paymentForm").reset();
    document.getElementById("paymentDate").value =
      new Date().toISOString().split("T")[0];

    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (inv) {
      document.getElementById("paymentAmount").value = inv.total -
        inv.paidAmount;
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closePaymentModal() {
    const modal = document.getElementById("paymentModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.payingInvoiceId = null;
  }

  async savePayment(e) {
    e.preventDefault();
    if (!this.payingInvoiceId) return;

    const data = {
      amount: parseFloat(document.getElementById("paymentAmount").value) || 0,
      date: document.getElementById("paymentDate").value,
      method: document.getElementById("paymentMethod").value || null,
      reference: document.getElementById("paymentReference").value || null,
      notes: document.getElementById("paymentNotes").value || null,
    };

    try {
      await BillingAPI.createPayment(this.payingInvoiceId, data);
      this.closePaymentModal();
      await this.load();
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  }

  // Generate Invoice from Time Entries
  openGenerateInvoiceModal() {
    const modal = document.getElementById("generateInvoiceModal");
    document.getElementById("generateInvoiceForm").reset();
    this.populateCustomerSelect("generateInvoiceCustomer");

    // Set default rate from billing rates
    const defaultRate = this.billingRates.find((r) => r.isDefault);
    if (defaultRate) {
      document.getElementById("generateInvoiceRate").value =
        defaultRate.hourlyRate;
    }

    // Populate tasks with time entries
    this.renderGenerateInvoiceTasks();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeGenerateInvoiceModal() {
    const modal = document.getElementById("generateInvoiceModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }

  renderGenerateInvoiceTasks() {
    const container = document.getElementById("generateInvoiceTasks");
    const tasksWithTime = this.tm.tasks.filter((t) =>
      t.config?.time_entries?.length > 0
    );

    if (tasksWithTime.length === 0) {
      container.innerHTML =
        '<p class="text-gray-500 dark:text-gray-400 text-sm">No tasks with time entries found</p>';
      return;
    }

    container.innerHTML = tasksWithTime.map((t) => {
      const totalHours = t.config.time_entries.reduce(
        (sum, e) => sum + e.hours,
        0,
      );
      return `
        <label class="flex items-center p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="generate-invoice-task h-4 w-4 text-gray-900 border-gray-300 rounded" value="${t.id}">
          <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${t.title}</span>
          <span class="ml-auto text-xs text-gray-500 dark:text-gray-400">${totalHours}h</span>
        </label>
      `;
    }).join("");
  }

  async generateInvoice(e) {
    e.preventDefault();

    const taskIds = Array.from(
      document.querySelectorAll(".generate-invoice-task:checked"),
    ).map((cb) => cb.value);
    if (taskIds.length === 0) {
      alert("Please select at least one task");
      return;
    }

    const data = {
      customerId: document.getElementById("generateInvoiceCustomer").value,
      title: document.getElementById("generateInvoiceTitle").value || null,
      startDate: document.getElementById("generateInvoiceStartDate").value ||
        null,
      endDate: document.getElementById("generateInvoiceEndDate").value || null,
      hourlyRate:
        parseFloat(document.getElementById("generateInvoiceRate").value) || 0,
      taskIds,
    };

    try {
      await BillingAPI.generateInvoice(data);
      this.closeGenerateInvoiceModal();
      await this.load();
      this.switchTab("invoices");
    } catch (error) {
      console.error("Error generating invoice:", error);
    }
  }

  bindEvents() {
    // Billing tab navigation
    document.querySelectorAll(".billing-tab").forEach((tab) => {
      tab.addEventListener(
        "click",
        (e) => this.switchTab(e.target.dataset.billingTab),
      );
    });

    // Add buttons use sidenav
    document.getElementById("addCustomerBtn")?.addEventListener(
      "click",
      () => this.openCustomerModal(),
    );
    document.getElementById("addBillingRateBtn")?.addEventListener(
      "click",
      () => this.openRateModal(),
    );
    document.getElementById("addQuoteBtn")?.addEventListener(
      "click",
      () => this.openQuoteModal(),
    );
    document.getElementById("addInvoiceBtn")?.addEventListener(
      "click",
      () => this.openInvoiceModal(),
    );

    // Generate Invoice events (keep modal for now)
    document.getElementById("generateInvoiceBtn")?.addEventListener(
      "click",
      () => this.openGenerateInvoiceModal(),
    );
    document.getElementById("cancelGenerateInvoiceBtn")?.addEventListener(
      "click",
      () => this.closeGenerateInvoiceModal(),
    );
    document.getElementById("generateInvoiceForm")?.addEventListener(
      "submit",
      (e) => this.generateInvoice(e),
    );

    // Payment events (keep modal for now)
    document.getElementById("cancelPaymentBtn")?.addEventListener(
      "click",
      () => this.closePaymentModal(),
    );
    document.getElementById("paymentForm")?.addEventListener(
      "submit",
      (e) => this.savePayment(e),
    );
  }
}
