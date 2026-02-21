import { CRMAPI } from "../api.js";

export class CRMModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.companies = [];
    this.contacts = [];
    this.deals = [];
    this.interactions = [];
    this.crmSummary = {};
    this.currentTab = "companies";
    this.editingCompanyId = null;
    this.editingContactId = null;
    this.editingDealId = null;
    this.editingInteractionId = null;
  }

  async load() {
    try {
      const [companies, contacts, deals, interactions, summary] = await Promise
        .all([
          CRMAPI.fetchCompanies(),
          CRMAPI.fetchContacts(),
          CRMAPI.fetchDeals(),
          CRMAPI.fetchInteractions(),
          CRMAPI.getSummary(),
        ]);

      this.companies = companies;
      this.contacts = contacts;
      this.deals = deals;
      this.interactions = interactions;
      this.crmSummary = summary;

      this.renderSummary();
      this.renderCompaniesView();
      this.renderContactsView();
      this.renderDealsView();
      this.renderInteractionsView();
    } catch (error) {
      console.error("Error loading CRM data:", error);
    }
  }

  renderSummary() {
    const s = this.crmSummary || {};
    document.getElementById("crmSummaryCompanies").textContent =
      s.totalCompanies || 0;
    document.getElementById("crmSummaryContacts").textContent =
      s.totalContacts || 0;
    document.getElementById("crmSummaryDeals").textContent = s.totalDeals || 0;
    document.getElementById("crmSummaryPipeline").textContent = this
      .formatCurrency(s.pipelineValue || 0);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  switchTab(tab) {
    document.querySelectorAll(".crm-tab").forEach((t) => {
      t.classList.remove("tab-active");
      t.classList.add("tab-inactive");
    });
    const activeTab = document.querySelector(`[data-crm-tab="${tab}"]`);
    if (activeTab) {
      activeTab.classList.remove("tab-inactive");
      activeTab.classList.add("tab-active");
    }

    document.querySelectorAll(".crm-tab-content").forEach((c) =>
      c.classList.add("hidden")
    );
    document.getElementById(`${tab}Tab`)?.classList.remove("hidden");
    this.currentTab = tab;
  }

  // ================== COMPANIES ==================

  renderCompaniesView() {
    const container = document.getElementById("companiesContainer");
    const emptyState = document.getElementById("emptyCompaniesState");

    if (!this.companies || this.companies.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = this.companies.map((c) => {
      const contactCount = this.contacts.filter((cont) =>
        cont.companyId === c.id
      ).length;
      const dealCount = this.deals.filter((d) => d.companyId === c.id).length;
      return `
        <div class="bg-secondary rounded-lg p-4 border border-default">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-medium text-primary">${c.name}</h3>
            ${
        c.industry
          ? `<span class="text-xs px-2 py-0.5 bg-active rounded">${c.industry}</span>`
          : ""
      }
          </div>
          ${
        c.website
          ? `<p class="text-sm text-info truncate"><a href="${c.website}" target="_blank">${c.website}</a></p>`
          : ""
      }
          ${
        c.phone
          ? `<p class="text-sm text-secondary">${c.phone}</p>`
          : ""
      }
          <div class="flex gap-4 mt-2 text-xs text-muted">
            <span>${contactCount} contacts</span>
            <span>${dealCount} deals</span>
          </div>
          <div class="flex justify-end space-x-2 mt-3">
            <button onclick="taskManager.openCRMCompanyModal('${c.id}')" class="text-sm text-secondary hover:text-primary">Edit</button>
            <button onclick="taskManager.deleteCRMCompany('${c.id}')" class="text-sm text-error hover:text-error-text">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Company operations use sidenav - Pattern: Sidenav Module
  openCompanyModal(id = null) {
    if (id) {
      this.tm.crmSidenavModule?.openEditCompany(id);
    } else {
      this.tm.crmSidenavModule?.openNewCompany();
    }
  }

  async deleteCompany(id) {
    if (
      !confirm(
        "Delete this company? This will also remove related contacts, deals, and interactions.",
      )
    ) return;
    try {
      await CRMAPI.deleteCompany(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  }

  // ================== CONTACTS ==================

  renderContactsView() {
    const container = document.getElementById("contactsContainer");
    const emptyState = document.getElementById("emptyContactsState");

    if (!this.contacts || this.contacts.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = this.contacts.map((c) => {
      const company = this.companies.find((comp) => comp.id === c.companyId);
      return `
        <div class="bg-secondary rounded-lg p-4 border border-default">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-medium text-primary">${c.firstName} ${c.lastName}</h3>
              ${
        c.title
          ? `<p class="text-sm text-muted">${c.title}</p>`
          : ""
      }
            </div>
            ${
        c.isPrimary
          ? '<span class="text-xs px-2 py-0.5 bg-info-bg text-info-text rounded">Primary</span>'
          : ""
      }
          </div>
          ${
        company
          ? `<p class="text-sm text-secondary">${company.name}</p>`
          : ""
      }
          ${
        c.email
          ? `<p class="text-sm text-secondary">${c.email}</p>`
          : ""
      }
          ${
        c.phone
          ? `<p class="text-sm text-secondary">${c.phone}</p>`
          : ""
      }
          <div class="flex justify-end space-x-2 mt-3">
            <button onclick="taskManager.openCRMContactModal('${c.id}')" class="text-sm text-secondary hover:text-primary">Edit</button>
            <button onclick="taskManager.deleteCRMContact('${c.id}')" class="text-sm text-error hover:text-error-text">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  populateCompanySelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select company...</option>' +
      this.companies.map((c) => `<option value="${c.id}">${c.name}</option>`)
        .join("");
  }

  populateContactSelect(selectId, companyId = null) {
    const select = document.getElementById(selectId);
    const filteredContacts = companyId
      ? this.contacts.filter((c) => c.companyId === companyId)
      : this.contacts;
    select.innerHTML = '<option value="">Select contact...</option>' +
      filteredContacts.map((c) =>
        `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`
      ).join("");
  }

  populateDealSelect(selectId, companyId = null) {
    const select = document.getElementById(selectId);
    const filteredDeals = companyId
      ? this.deals.filter((d) => d.companyId === companyId)
      : this.deals;
    select.innerHTML = '<option value="">Select deal...</option>' +
      filteredDeals.map((d) => `<option value="${d.id}">${d.title}</option>`)
        .join("");
  }

  // Contact operations use sidenav - Pattern: Sidenav Module
  openContactModal(id = null) {
    if (id) {
      this.tm.crmSidenavModule?.openEditContact(id);
    } else {
      this.tm.crmSidenavModule?.openNewContact();
    }
  }

  async deleteContact(id) {
    if (!confirm("Delete this contact?")) return;
    try {
      await CRMAPI.deleteContact(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting contact:", error);
    }
  }

  // ================== DEALS ==================

  renderDealsView() {
    const container = document.getElementById("dealsContainer");
    const emptyState = document.getElementById("emptyDealsState");

    if (!this.deals || this.deals.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    const stageColors = {
      lead: "bg-active text-primary",
      qualified:
        "bg-info-bg text-info-text",
      proposal:
        "bg-warning-bg text-warning-text",
      negotiation:
        "bg-info-bg text-info-text",
      won: "bg-success-bg text-success-text",
      lost: "bg-error-bg text-error-text",
    };

    container.innerHTML = this.deals.map((d) => {
      const company = this.companies.find((c) => c.id === d.companyId);
      const contact = this.contacts.find((c) => c.id === d.contactId);
      return `
        <div class="bg-secondary rounded-lg border border-default p-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-medium text-primary">${d.title}</h3>
              <p class="text-sm text-secondary">${
        company?.name || "Unknown"
      }</p>
              ${
        contact
          ? `<p class="text-xs text-muted">${contact.firstName} ${contact.lastName}</p>`
          : ""
      }
            </div>
            <span class="px-2 py-1 text-xs rounded ${
        stageColors[d.stage] || stageColors.lead
      }">${d.stage}</span>
          </div>
          <div class="flex justify-between items-center">
            <div>
              <p class="text-xl font-bold text-primary">${
        this.formatCurrency(d.value)
      }</p>
              <p class="text-xs text-muted">${d.probability}% probability</p>
            </div>
            ${
        d.expectedCloseDate
          ? `<p class="text-xs text-muted">Expected: ${d.expectedCloseDate}</p>`
          : ""
      }
          </div>
          <div class="flex justify-end space-x-2 mt-3">
            ${
        d.stage !== "won" && d.stage !== "lost"
          ? `
              <select onchange="taskManager.updateCRMDealStage('${d.id}', this.value)" class="text-sm border border-strong rounded px-2 py-1">
                <option value="">Move to...</option>
                <option value="lead">Lead</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            `
          : ""
      }
            <button onclick="taskManager.openCRMDealModal('${d.id}')" class="text-sm text-secondary hover:text-primary">Edit</button>
            <button onclick="taskManager.deleteCRMDeal('${d.id}')" class="text-sm text-error hover:text-error-text">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Deal operations use sidenav - Pattern: Sidenav Module
  openDealModal(id = null) {
    if (id) {
      this.tm.crmSidenavModule?.openEditDeal(id);
    } else {
      this.tm.crmSidenavModule?.openNewDeal();
    }
  }

  async deleteDeal(id) {
    if (!confirm("Delete this deal?")) return;
    try {
      await CRMAPI.deleteDeal(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting deal:", error);
    }
  }

  async updateDealStage(id, stage) {
    if (!stage) return;
    try {
      await CRMAPI.updateDealStage(id, stage);
      await this.load();
    } catch (error) {
      console.error("Error updating deal stage:", error);
    }
  }

  // ================== INTERACTIONS ==================

  renderInteractionsView() {
    const container = document.getElementById("interactionsContainer");
    const emptyState = document.getElementById("emptyInteractionsState");

    if (!this.interactions || this.interactions.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    const typeIcons = {
      email:
        "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      call:
        "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
      meeting:
        "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      note:
        "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    };

    // Sort by date descending
    const sorted = [...this.interactions].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    container.innerHTML = sorted.map((i) => {
      const company = this.companies.find((c) => c.id === i.companyId);
      const contact = this.contacts.find((c) => c.id === i.contactId);
      const deal = this.deals.find((d) => d.id === i.dealId);
      return `
        <div class="bg-secondary rounded-lg p-4 border border-default">
          <div class="flex items-start gap-3">
            <div class="p-2 bg-active rounded-full">
              <svg class="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
        typeIcons[i.type] || typeIcons.note
      }"></path>
              </svg>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-medium text-primary">${i.summary}</h3>
                  <div class="flex flex-wrap gap-2 mt-1 text-xs text-muted">
                    <span>${i.type}</span>
                    <span>${i.date}</span>
                    ${i.duration ? `<span>${i.duration} min</span>` : ""}
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 mt-2 text-sm text-secondary">
                ${company ? `<span>${company.name}</span>` : ""}
                ${
        contact ? `<span>- ${contact.firstName} ${contact.lastName}</span>` : ""
      }
                ${
        deal
          ? `<span class="text-info">Re: ${deal.title}</span>`
          : ""
      }
              </div>
              ${
        i.nextFollowUp
          ? `<p class="mt-2 text-xs text-warning">Follow-up: ${i.nextFollowUp}</p>`
          : ""
      }
              ${
        i.notes
          ? `<p class="mt-2 text-sm text-secondary">${i.notes}</p>`
          : ""
      }
            </div>
            <div class="flex gap-2">
              <button onclick="taskManager.openCRMInteractionModal('${i.id}')" class="text-sm text-secondary hover:text-primary">Edit</button>
              <button onclick="taskManager.deleteCRMInteraction('${i.id}')" class="text-sm text-error hover:text-error-text">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Interaction operations use sidenav - Pattern: Sidenav Module
  openInteractionModal(id = null) {
    if (id) {
      this.tm.crmSidenavModule?.openEditInteraction(id);
    } else {
      this.tm.crmSidenavModule?.openNewInteraction();
    }
  }

  async deleteInteraction(id) {
    if (!confirm("Delete this interaction?")) return;
    try {
      await CRMAPI.deleteInteraction(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting interaction:", error);
    }
  }

  // Update contact/deal selects when company changes
  onCompanyChange(selectId) {
    const companyId = document.getElementById(selectId).value;
    if (selectId === "crmDealCompany") {
      this.populateContactSelect("crmDealContact", companyId);
    } else if (selectId === "crmInteractionCompany") {
      this.populateContactSelect("crmInteractionContact", companyId);
      this.populateDealSelect("crmInteractionDeal", companyId);
    }
  }

  bindEvents() {
    // CRM tab navigation
    document.querySelectorAll(".crm-tab").forEach((tab) => {
      tab.addEventListener(
        "click",
        (e) => this.switchTab(e.target.dataset.crmTab),
      );
    });

    // Add buttons use sidenav
    document.getElementById("addCRMCompanyBtn")?.addEventListener(
      "click",
      () => this.openCompanyModal(),
    );
    document.getElementById("addCRMContactBtn")?.addEventListener(
      "click",
      () => this.openContactModal(),
    );
    document.getElementById("addCRMDealBtn")?.addEventListener(
      "click",
      () => this.openDealModal(),
    );
    document.getElementById("addCRMInteractionBtn")?.addEventListener(
      "click",
      () => this.openInteractionModal(),
    );
  }
}
