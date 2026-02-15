import { CRMAPI } from '../api.js';

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
      const [companies, contacts, deals, interactions, summary] = await Promise.all([
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
    document.getElementById("crmSummaryCompanies").textContent = s.totalCompanies || 0;
    document.getElementById("crmSummaryContacts").textContent = s.totalContacts || 0;
    document.getElementById("crmSummaryDeals").textContent = s.totalDeals || 0;
    document.getElementById("crmSummaryPipeline").textContent = this.formatCurrency(s.pipelineValue || 0);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }

  switchTab(tab) {
    document.querySelectorAll(".crm-tab").forEach(t => {
      t.classList.remove("text-gray-900", "dark:text-gray-100", "border-b-2", "border-gray-900", "dark:border-gray-100");
      t.classList.add("text-gray-500", "dark:text-gray-400");
    });
    document.querySelector(`[data-crm-tab="${tab}"]`)?.classList.add("text-gray-900", "dark:text-gray-100", "border-b-2", "border-gray-900", "dark:border-gray-100");
    document.querySelector(`[data-crm-tab="${tab}"]`)?.classList.remove("text-gray-500", "dark:text-gray-400");

    document.querySelectorAll(".crm-tab-content").forEach(c => c.classList.add("hidden"));
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
    container.innerHTML = this.companies.map(c => {
      const contactCount = this.contacts.filter(cont => cont.companyId === c.id).length;
      const dealCount = this.deals.filter(d => d.companyId === c.id).length;
      return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-medium text-gray-900 dark:text-gray-100">${c.name}</h3>
            ${c.industry ? `<span class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">${c.industry}</span>` : ""}
          </div>
          ${c.website ? `<p class="text-sm text-blue-600 dark:text-blue-400 truncate"><a href="${c.website}" target="_blank">${c.website}</a></p>` : ""}
          ${c.phone ? `<p class="text-sm text-gray-600 dark:text-gray-400">${c.phone}</p>` : ""}
          <div class="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>${contactCount} contacts</span>
            <span>${dealCount} deals</span>
          </div>
          <div class="flex justify-end space-x-2 mt-3">
            <button onclick="taskManager.openCRMCompanyModal('${c.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Edit</button>
            <button onclick="taskManager.deleteCRMCompany('${c.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  openCompanyModal(id = null) {
    this.editingCompanyId = id;
    const modal = document.getElementById("crmCompanyModal");
    const title = document.getElementById("crmCompanyModalTitle");
    document.getElementById("crmCompanyForm").reset();

    title.textContent = id ? "Edit Company" : "Add Company";

    if (id) {
      const c = this.companies.find(c => c.id === id);
      if (c) {
        document.getElementById("crmCompanyName").value = c.name;
        document.getElementById("crmCompanyIndustry").value = c.industry || "";
        document.getElementById("crmCompanyWebsite").value = c.website || "";
        document.getElementById("crmCompanyPhone").value = c.phone || "";
        document.getElementById("crmCompanyStreet").value = c.address?.street || "";
        document.getElementById("crmCompanyCity").value = c.address?.city || "";
        document.getElementById("crmCompanyState").value = c.address?.state || "";
        document.getElementById("crmCompanyPostalCode").value = c.address?.postalCode || "";
        document.getElementById("crmCompanyCountry").value = c.address?.country || "";
        document.getElementById("crmCompanyNotes").value = c.notes || "";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeCompanyModal() {
    const modal = document.getElementById("crmCompanyModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingCompanyId = null;
  }

  async saveCompany(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById("crmCompanyName").value,
      industry: document.getElementById("crmCompanyIndustry").value || null,
      website: document.getElementById("crmCompanyWebsite").value || null,
      phone: document.getElementById("crmCompanyPhone").value || null,
      address: {
        street: document.getElementById("crmCompanyStreet").value || null,
        city: document.getElementById("crmCompanyCity").value || null,
        state: document.getElementById("crmCompanyState").value || null,
        postalCode: document.getElementById("crmCompanyPostalCode").value || null,
        country: document.getElementById("crmCompanyCountry").value || null,
      },
      notes: document.getElementById("crmCompanyNotes").value || null,
    };

    try {
      if (this.editingCompanyId) {
        await CRMAPI.updateCompany(this.editingCompanyId, data);
      } else {
        await CRMAPI.createCompany(data);
      }
      this.closeCompanyModal();
      await this.load();
    } catch (error) {
      console.error("Error saving company:", error);
    }
  }

  async deleteCompany(id) {
    if (!confirm("Delete this company? This will also remove related contacts, deals, and interactions.")) return;
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
    container.innerHTML = this.contacts.map(c => {
      const company = this.companies.find(comp => comp.id === c.companyId);
      return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-medium text-gray-900 dark:text-gray-100">${c.firstName} ${c.lastName}</h3>
              ${c.title ? `<p class="text-sm text-gray-500 dark:text-gray-400">${c.title}</p>` : ""}
            </div>
            ${c.isPrimary ? '<span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">Primary</span>' : ""}
          </div>
          ${company ? `<p class="text-sm text-gray-600 dark:text-gray-400">${company.name}</p>` : ""}
          ${c.email ? `<p class="text-sm text-gray-600 dark:text-gray-400">${c.email}</p>` : ""}
          ${c.phone ? `<p class="text-sm text-gray-600 dark:text-gray-400">${c.phone}</p>` : ""}
          <div class="flex justify-end space-x-2 mt-3">
            <button onclick="taskManager.openCRMContactModal('${c.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Edit</button>
            <button onclick="taskManager.deleteCRMContact('${c.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  populateCompanySelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select company...</option>' +
      this.companies.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  populateContactSelect(selectId, companyId = null) {
    const select = document.getElementById(selectId);
    const filteredContacts = companyId
      ? this.contacts.filter(c => c.companyId === companyId)
      : this.contacts;
    select.innerHTML = '<option value="">Select contact...</option>' +
      filteredContacts.map(c => `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`).join("");
  }

  populateDealSelect(selectId, companyId = null) {
    const select = document.getElementById(selectId);
    const filteredDeals = companyId
      ? this.deals.filter(d => d.companyId === companyId)
      : this.deals;
    select.innerHTML = '<option value="">Select deal...</option>' +
      filteredDeals.map(d => `<option value="${d.id}">${d.title}</option>`).join("");
  }

  openContactModal(id = null) {
    this.editingContactId = id;
    const modal = document.getElementById("crmContactModal");
    const title = document.getElementById("crmContactModalTitle");
    document.getElementById("crmContactForm").reset();
    this.populateCompanySelect("crmContactCompany");

    title.textContent = id ? "Edit Contact" : "Add Contact";

    if (id) {
      const c = this.contacts.find(c => c.id === id);
      if (c) {
        document.getElementById("crmContactCompany").value = c.companyId;
        document.getElementById("crmContactFirstName").value = c.firstName;
        document.getElementById("crmContactLastName").value = c.lastName;
        document.getElementById("crmContactEmail").value = c.email || "";
        document.getElementById("crmContactPhone").value = c.phone || "";
        document.getElementById("crmContactTitle").value = c.title || "";
        document.getElementById("crmContactPrimary").checked = c.isPrimary;
        document.getElementById("crmContactNotes").value = c.notes || "";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeContactModal() {
    const modal = document.getElementById("crmContactModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingContactId = null;
  }

  async saveContact(e) {
    e.preventDefault();
    const data = {
      companyId: document.getElementById("crmContactCompany").value,
      firstName: document.getElementById("crmContactFirstName").value,
      lastName: document.getElementById("crmContactLastName").value,
      email: document.getElementById("crmContactEmail").value || null,
      phone: document.getElementById("crmContactPhone").value || null,
      title: document.getElementById("crmContactTitle").value || null,
      isPrimary: document.getElementById("crmContactPrimary").checked,
      notes: document.getElementById("crmContactNotes").value || null,
    };

    try {
      if (this.editingContactId) {
        await CRMAPI.updateContact(this.editingContactId, data);
      } else {
        await CRMAPI.createContact(data);
      }
      this.closeContactModal();
      await this.load();
    } catch (error) {
      console.error("Error saving contact:", error);
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
      lead: "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200",
      qualified: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      proposal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      negotiation: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      won: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    container.innerHTML = this.deals.map(d => {
      const company = this.companies.find(c => c.id === d.companyId);
      const contact = this.contacts.find(c => c.id === d.contactId);
      return `
        <div class="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-medium text-gray-900 dark:text-gray-100">${d.title}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">${company?.name || "Unknown"}</p>
              ${contact ? `<p class="text-xs text-gray-500 dark:text-gray-400">${contact.firstName} ${contact.lastName}</p>` : ""}
            </div>
            <span class="px-2 py-1 text-xs rounded ${stageColors[d.stage] || stageColors.lead}">${d.stage}</span>
          </div>
          <div class="flex justify-between items-center">
            <div>
              <p class="text-xl font-bold text-gray-900 dark:text-gray-100">${this.formatCurrency(d.value)}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${d.probability}% probability</p>
            </div>
            ${d.expectedCloseDate ? `<p class="text-xs text-gray-500">Expected: ${d.expectedCloseDate}</p>` : ""}
          </div>
          <div class="flex justify-end space-x-2 mt-3">
            ${d.stage !== "won" && d.stage !== "lost" ? `
              <select onchange="taskManager.updateCRMDealStage('${d.id}', this.value)" class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1">
                <option value="">Move to...</option>
                <option value="lead">Lead</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            ` : ""}
            <button onclick="taskManager.openCRMDealModal('${d.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Edit</button>
            <button onclick="taskManager.deleteCRMDeal('${d.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  openDealModal(id = null) {
    this.editingDealId = id;
    const modal = document.getElementById("crmDealModal");
    const title = document.getElementById("crmDealModalTitle");
    document.getElementById("crmDealForm").reset();
    this.populateCompanySelect("crmDealCompany");
    this.populateContactSelect("crmDealContact");

    title.textContent = id ? "Edit Deal" : "Add Deal";

    if (id) {
      const d = this.deals.find(d => d.id === id);
      if (d) {
        document.getElementById("crmDealCompany").value = d.companyId;
        this.populateContactSelect("crmDealContact", d.companyId);
        document.getElementById("crmDealContact").value = d.contactId || "";
        document.getElementById("crmDealTitle").value = d.title;
        document.getElementById("crmDealValue").value = d.value;
        document.getElementById("crmDealStage").value = d.stage;
        document.getElementById("crmDealProbability").value = d.probability;
        document.getElementById("crmDealExpectedClose").value = d.expectedCloseDate || "";
        document.getElementById("crmDealNotes").value = d.notes || "";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeDealModal() {
    const modal = document.getElementById("crmDealModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingDealId = null;
  }

  async saveDeal(e) {
    e.preventDefault();
    const data = {
      companyId: document.getElementById("crmDealCompany").value,
      contactId: document.getElementById("crmDealContact").value || null,
      title: document.getElementById("crmDealTitle").value,
      value: parseFloat(document.getElementById("crmDealValue").value) || 0,
      stage: document.getElementById("crmDealStage").value,
      probability: parseInt(document.getElementById("crmDealProbability").value) || 0,
      expectedCloseDate: document.getElementById("crmDealExpectedClose").value || null,
      notes: document.getElementById("crmDealNotes").value || null,
    };

    try {
      if (this.editingDealId) {
        await CRMAPI.updateDeal(this.editingDealId, data);
      } else {
        await CRMAPI.createDeal(data);
      }
      this.closeDealModal();
      await this.load();
    } catch (error) {
      console.error("Error saving deal:", error);
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
      email: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      call: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
      meeting: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      note: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    };

    // Sort by date descending
    const sorted = [...this.interactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sorted.map(i => {
      const company = this.companies.find(c => c.id === i.companyId);
      const contact = this.contacts.find(c => c.id === i.contactId);
      const deal = this.deals.find(d => d.id === i.dealId);
      return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div class="flex items-start gap-3">
            <div class="p-2 bg-gray-200 dark:bg-gray-600 rounded-full">
              <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${typeIcons[i.type] || typeIcons.note}"></path>
              </svg>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-medium text-gray-900 dark:text-gray-100">${i.summary}</h3>
                  <div class="flex flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>${i.type}</span>
                    <span>${i.date}</span>
                    ${i.duration ? `<span>${i.duration} min</span>` : ""}
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                ${company ? `<span>${company.name}</span>` : ""}
                ${contact ? `<span>- ${contact.firstName} ${contact.lastName}</span>` : ""}
                ${deal ? `<span class="text-blue-600 dark:text-blue-400">Re: ${deal.title}</span>` : ""}
              </div>
              ${i.nextFollowUp ? `<p class="mt-2 text-xs text-orange-600 dark:text-orange-400">Follow-up: ${i.nextFollowUp}</p>` : ""}
              ${i.notes ? `<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">${i.notes}</p>` : ""}
            </div>
            <div class="flex gap-2">
              <button onclick="taskManager.openCRMInteractionModal('${i.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Edit</button>
              <button onclick="taskManager.deleteCRMInteraction('${i.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  openInteractionModal(id = null) {
    this.editingInteractionId = id;
    const modal = document.getElementById("crmInteractionModal");
    const title = document.getElementById("crmInteractionModalTitle");
    document.getElementById("crmInteractionForm").reset();
    this.populateCompanySelect("crmInteractionCompany");
    this.populateContactSelect("crmInteractionContact");
    this.populateDealSelect("crmInteractionDeal");

    title.textContent = id ? "Edit Interaction" : "Log Interaction";

    // Set default date to today
    document.getElementById("crmInteractionDate").value = new Date().toISOString().split("T")[0];

    if (id) {
      const i = this.interactions.find(i => i.id === id);
      if (i) {
        document.getElementById("crmInteractionCompany").value = i.companyId;
        this.populateContactSelect("crmInteractionContact", i.companyId);
        this.populateDealSelect("crmInteractionDeal", i.companyId);
        document.getElementById("crmInteractionContact").value = i.contactId || "";
        document.getElementById("crmInteractionDeal").value = i.dealId || "";
        document.getElementById("crmInteractionType").value = i.type;
        document.getElementById("crmInteractionSummary").value = i.summary;
        document.getElementById("crmInteractionDate").value = i.date;
        document.getElementById("crmInteractionDuration").value = i.duration || "";
        document.getElementById("crmInteractionFollowUp").value = i.nextFollowUp || "";
        document.getElementById("crmInteractionNotes").value = i.notes || "";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeInteractionModal() {
    const modal = document.getElementById("crmInteractionModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingInteractionId = null;
  }

  async saveInteraction(e) {
    e.preventDefault();
    const data = {
      companyId: document.getElementById("crmInteractionCompany").value,
      contactId: document.getElementById("crmInteractionContact").value || null,
      dealId: document.getElementById("crmInteractionDeal").value || null,
      type: document.getElementById("crmInteractionType").value,
      summary: document.getElementById("crmInteractionSummary").value,
      date: document.getElementById("crmInteractionDate").value,
      duration: parseInt(document.getElementById("crmInteractionDuration").value) || null,
      nextFollowUp: document.getElementById("crmInteractionFollowUp").value || null,
      notes: document.getElementById("crmInteractionNotes").value || null,
    };

    try {
      if (this.editingInteractionId) {
        await CRMAPI.updateInteraction(this.editingInteractionId, data);
      } else {
        await CRMAPI.createInteraction(data);
      }
      this.closeInteractionModal();
      await this.load();
    } catch (error) {
      console.error("Error saving interaction:", error);
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
    document.querySelectorAll(".crm-tab").forEach(tab => {
      tab.addEventListener("click", (e) => this.switchTab(e.target.dataset.crmTab));
    });

    // Company events
    document.getElementById("addCRMCompanyBtn")?.addEventListener("click", () => this.openCompanyModal());
    document.getElementById("cancelCRMCompanyBtn")?.addEventListener("click", () => this.closeCompanyModal());
    document.getElementById("crmCompanyForm")?.addEventListener("submit", (e) => this.saveCompany(e));

    // Contact events
    document.getElementById("addCRMContactBtn")?.addEventListener("click", () => this.openContactModal());
    document.getElementById("cancelCRMContactBtn")?.addEventListener("click", () => this.closeContactModal());
    document.getElementById("crmContactForm")?.addEventListener("submit", (e) => this.saveContact(e));

    // Deal events
    document.getElementById("addCRMDealBtn")?.addEventListener("click", () => this.openDealModal());
    document.getElementById("cancelCRMDealBtn")?.addEventListener("click", () => this.closeDealModal());
    document.getElementById("crmDealForm")?.addEventListener("submit", (e) => this.saveDeal(e));
    document.getElementById("crmDealCompany")?.addEventListener("change", () => this.onCompanyChange("crmDealCompany"));

    // Interaction events
    document.getElementById("addCRMInteractionBtn")?.addEventListener("click", () => this.openInteractionModal());
    document.getElementById("cancelCRMInteractionBtn")?.addEventListener("click", () => this.closeInteractionModal());
    document.getElementById("crmInteractionForm")?.addEventListener("submit", (e) => this.saveInteraction(e));
    document.getElementById("crmInteractionCompany")?.addEventListener("change", () => this.onCompanyChange("crmInteractionCompany"));
  }
}
