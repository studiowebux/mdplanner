// CRM Sidenav Module
// Slide-in panel for CRM entities (Company, Contact, Deal, Interaction)

import { Sidenav } from "../ui/sidenav.js";
import { CRMAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class CRMSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.entityType = null; // 'company', 'contact', 'deal', 'interaction'
    this.editingId = null;
    this.currentEntity = null;
  }

  bindEvents() {
    document.getElementById("crmSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("crmSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("crmSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    // Save button
    document.getElementById("crmSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );

    // Entity type selector
    document.getElementById("crmSidenavEntityType")?.addEventListener(
      "change",
      (e) => {
        this.switchEntityType(e.target.value);
      },
    );
  }

  // === Company Operations ===
  openNewCompany() {
    this.entityType = "company";
    this.editingId = null;
    this.currentEntity = {
      name: "",
      industry: "",
      website: "",
      phone: "",
      address: { street: "", city: "", state: "", postalCode: "", country: "" },
      notes: "",
    };
    this.openPanel("New Company");
  }

  openEditCompany(companyId) {
    const company = this.tm.crmModule?.companies.find((c) =>
      c.id === companyId
    );
    if (!company) return;

    this.entityType = "company";
    this.editingId = companyId;
    this.currentEntity = JSON.parse(JSON.stringify(company));
    this.openPanel("Edit Company");
  }

  // === Contact Operations ===
  openNewContact() {
    this.entityType = "contact";
    this.editingId = null;
    this.currentEntity = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      title: "",
      companyId: "",
      isPrimary: false,
      notes: "",
    };
    this.openPanel("New Contact");
  }

  openEditContact(contactId) {
    const contact = this.tm.crmModule?.contacts.find((c) => c.id === contactId);
    if (!contact) return;

    this.entityType = "contact";
    this.editingId = contactId;
    this.currentEntity = JSON.parse(JSON.stringify(contact));
    this.openPanel("Edit Contact");
  }

  // === Deal Operations ===
  openNewDeal() {
    this.entityType = "deal";
    this.editingId = null;
    this.currentEntity = {
      title: "",
      companyId: "",
      contactId: "",
      value: 0,
      stage: "lead",
      probability: 0,
      expectedCloseDate: "",
      notes: "",
    };
    this.openPanel("New Deal");
  }

  openEditDeal(dealId) {
    const deal = this.tm.crmModule?.deals.find((d) => d.id === dealId);
    if (!deal) return;

    this.entityType = "deal";
    this.editingId = dealId;
    this.currentEntity = JSON.parse(JSON.stringify(deal));
    this.openPanel("Edit Deal");
  }

  // === Interaction Operations ===
  openNewInteraction() {
    this.entityType = "interaction";
    this.editingId = null;
    this.currentEntity = {
      type: "note",
      summary: "",
      date: new Date().toISOString().split("T")[0],
      companyId: "",
      contactId: "",
      dealId: "",
      duration: null,
      nextFollowUp: "",
      notes: "",
    };
    this.openPanel("Log Interaction");
  }

  openEditInteraction(interactionId) {
    const interaction = this.tm.crmModule?.interactions.find((i) =>
      i.id === interactionId
    );
    if (!interaction) return;

    this.entityType = "interaction";
    this.editingId = interactionId;
    this.currentEntity = JSON.parse(JSON.stringify(interaction));
    this.openPanel("Edit Interaction");
  }

  openPanel(title) {
    document.getElementById("crmSidenavHeader").textContent = title;
    this.renderContent();
    document.getElementById("crmSidenavDelete").classList.toggle(
      "hidden",
      !this.editingId,
    );
    Sidenav.open("crmSidenav");
  }

  close() {
    Sidenav.close("crmSidenav");
    this.entityType = null;
    this.editingId = null;
    this.currentEntity = null;
  }

  renderContent() {
    const container = document.getElementById("crmSidenavContent");
    if (!container) return;

    switch (this.entityType) {
      case "company":
        container.innerHTML = this.renderCompanyForm();
        break;
      case "contact":
        container.innerHTML = this.renderContactForm();
        break;
      case "deal":
        container.innerHTML = this.renderDealForm();
        break;
      case "interaction":
        container.innerHTML = this.renderInteractionForm();
        break;
      default:
        container.innerHTML =
          '<div class="text-muted">Select an entity type</div>';
    }

  }

  renderCompanyForm() {
    const c = this.currentEntity;
    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Company Name *</label>
          <input type="text" id="crmSidenavCompanyName" class="form-input" value="${
      escapeHtml(c.name || "")
    }" required>
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Industry</label>
            <input type="text" id="crmSidenavCompanyIndustry" class="form-input" value="${
      escapeHtml(c.industry || "")
    }">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="tel" id="crmSidenavCompanyPhone" class="form-input" value="${
      escapeHtml(c.phone || "")
    }">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Website</label>
          <input type="url" id="crmSidenavCompanyWebsite" class="form-input" value="${
      escapeHtml(c.website || "")
    }">
        </div>
      </div>
      <div class="sidenav-section">
        <div class="sidenav-section-title">Address</div>
        <div class="form-group">
          <input type="text" id="crmSidenavCompanyStreet" class="form-input" placeholder="Street" value="${
      escapeHtml(c.address?.street || "")
    }">
        </div>
        <div class="sidenav-grid grid-cols-3">
          <div class="form-group">
            <input type="text" id="crmSidenavCompanyCity" class="form-input" placeholder="City" value="${
      escapeHtml(c.address?.city || "")
    }">
          </div>
          <div class="form-group">
            <input type="text" id="crmSidenavCompanyState" class="form-input" placeholder="State" value="${
      escapeHtml(c.address?.state || "")
    }">
          </div>
          <div class="form-group">
            <input type="text" id="crmSidenavCompanyPostal" class="form-input" placeholder="Postal Code" value="${
      escapeHtml(c.address?.postalCode || "")
    }">
          </div>
        </div>
        <div class="form-group">
          <input type="text" id="crmSidenavCompanyCountry" class="form-input" placeholder="Country" value="${
      escapeHtml(c.address?.country || "")
    }">
        </div>
      </div>
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="crmSidenavCompanyNotes" class="form-input" rows="3">${
      escapeHtml(c.notes || "")
    }</textarea>
        </div>
      </div>
    `;
  }

  renderContactForm() {
    const c = this.currentEntity;
    const companies = this.tm.crmModule?.companies || [];
    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Company</label>
          <select id="crmSidenavContactCompany" class="form-input">
            <option value="">Select company...</option>
            ${
      companies.map((co) =>
        `<option value="${co.id}" ${co.id === c.companyId ? "selected" : ""}>${
          escapeHtml(co.name)
        }</option>`
      ).join("")
    }
          </select>
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">First Name *</label>
            <input type="text" id="crmSidenavContactFirstName" class="form-input" value="${
      escapeHtml(c.firstName || "")
    }" required>
          </div>
          <div class="form-group">
            <label class="form-label">Last Name *</label>
            <input type="text" id="crmSidenavContactLastName" class="form-input" value="${
      escapeHtml(c.lastName || "")
    }" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" id="crmSidenavContactTitle" class="form-input" value="${
      escapeHtml(c.title || "")
    }">
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="crmSidenavContactEmail" class="form-input" value="${
      escapeHtml(c.email || "")
    }">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="tel" id="crmSidenavContactPhone" class="form-input" value="${
      escapeHtml(c.phone || "")
    }">
          </div>
        </div>
        <div class="form-group">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="crmSidenavContactPrimary" class="rounded" ${
      c.isPrimary ? "checked" : ""
    }>
            <span class="text-sm text-secondary">Primary Contact</span>
          </label>
        </div>
      </div>
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="crmSidenavContactNotes" class="form-input" rows="3">${
      escapeHtml(c.notes || "")
    }</textarea>
        </div>
      </div>
    `;
  }

  renderDealForm() {
    const d = this.currentEntity;
    const companies = this.tm.crmModule?.companies || [];
    const contacts = this.tm.crmModule?.contacts || [];
    const stages = [
      "lead",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
    ];

    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Deal Title *</label>
          <input type="text" id="crmSidenavDealTitle" class="form-input" value="${
      escapeHtml(d.title || "")
    }" required>
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Company *</label>
            <select id="crmSidenavDealCompany" class="form-input" onchange="taskManager.crmSidenavModule.onDealCompanyChange(this.value)">
              <option value="">Select company...</option>
              ${
      companies.map((co) =>
        `<option value="${co.id}" ${co.id === d.companyId ? "selected" : ""}>${
          escapeHtml(co.name)
        }</option>`
      ).join("")
    }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Contact</label>
            <select id="crmSidenavDealContact" class="form-input">
              <option value="">Select contact...</option>
              ${
      contacts.filter((c) => c.companyId === d.companyId).map((c) =>
        `<option value="${c.id}" ${c.id === d.contactId ? "selected" : ""}>${
          escapeHtml(c.firstName)
        } ${escapeHtml(c.lastName)}</option>`
      ).join("")
    }
            </select>
          </div>
        </div>
        <div class="sidenav-grid grid-cols-3">
          <div class="form-group">
            <label class="form-label">Value</label>
            <input type="number" id="crmSidenavDealValue" class="form-input" value="${
      d.value || 0
    }" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Probability %</label>
            <input type="number" id="crmSidenavDealProbability" class="form-input" value="${
      d.probability || 0
    }" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="form-label">Stage</label>
            <select id="crmSidenavDealStage" class="form-input">
              ${
      stages.map((s) =>
        `<option value="${s}" ${s === d.stage ? "selected" : ""}>${
          s.charAt(0).toUpperCase() + s.slice(1)
        }</option>`
      ).join("")
    }
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Expected Close Date</label>
          <input type="date" id="crmSidenavDealCloseDate" class="form-input" value="${
      d.expectedCloseDate || ""
    }">
        </div>
      </div>
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="crmSidenavDealNotes" class="form-input" rows="3">${
      escapeHtml(d.notes || "")
    }</textarea>
        </div>
      </div>
    `;
  }

  onDealCompanyChange(companyId) {
    const contacts =
      this.tm.crmModule?.contacts.filter((c) => c.companyId === companyId) ||
      [];
    const select = document.getElementById("crmSidenavDealContact");
    if (!select) return;
    select.innerHTML = '<option value="">Select contact...</option>' +
      contacts.map((c) =>
        `<option value="${c.id}">${escapeHtml(c.firstName)} ${
          escapeHtml(c.lastName)
        }</option>`
      ).join("");
  }

  renderInteractionForm() {
    const i = this.currentEntity;
    const companies = this.tm.crmModule?.companies || [];
    const contacts = this.tm.crmModule?.contacts || [];
    const deals = this.tm.crmModule?.deals || [];
    const types = ["email", "call", "meeting", "note"];

    return `
      <div class="sidenav-section">
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select id="crmSidenavInteractionType" class="form-input">
              ${
      types.map((t) =>
        `<option value="${t}" ${t === i.type ? "selected" : ""}>${
          t.charAt(0).toUpperCase() + t.slice(1)
        }</option>`
      ).join("")
    }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" id="crmSidenavInteractionDate" class="form-input" value="${
      i.date || ""
    }">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Summary *</label>
          <input type="text" id="crmSidenavInteractionSummary" class="form-input" value="${
      escapeHtml(i.summary || "")
    }" required>
        </div>
        <div class="sidenav-grid grid-cols-3">
          <div class="form-group">
            <label class="form-label">Company</label>
            <select id="crmSidenavInteractionCompany" class="form-input" onchange="taskManager.crmSidenavModule.onInteractionCompanyChange(this.value)">
              <option value="">Select...</option>
              ${
      companies.map((co) =>
        `<option value="${co.id}" ${co.id === i.companyId ? "selected" : ""}>${
          escapeHtml(co.name)
        }</option>`
      ).join("")
    }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Contact</label>
            <select id="crmSidenavInteractionContact" class="form-input">
              <option value="">Select...</option>
              ${
      contacts.filter((c) => c.companyId === i.companyId).map((c) =>
        `<option value="${c.id}" ${c.id === i.contactId ? "selected" : ""}>${
          escapeHtml(c.firstName)
        } ${escapeHtml(c.lastName)}</option>`
      ).join("")
    }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Deal</label>
            <select id="crmSidenavInteractionDeal" class="form-input">
              <option value="">Select...</option>
              ${
      deals.filter((d) => d.companyId === i.companyId).map((d) =>
        `<option value="${d.id}" ${d.id === i.dealId ? "selected" : ""}>${
          escapeHtml(d.title)
        }</option>`
      ).join("")
    }
            </select>
          </div>
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Duration (min)</label>
            <input type="number" id="crmSidenavInteractionDuration" class="form-input" value="${
      i.duration || ""
    }" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Follow-up Date</label>
            <input type="date" id="crmSidenavInteractionFollowUp" class="form-input" value="${
      i.nextFollowUp || ""
    }">
          </div>
        </div>
      </div>
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="crmSidenavInteractionNotes" class="form-input" rows="3">${
      escapeHtml(i.notes || "")
    }</textarea>
        </div>
      </div>
    `;
  }

  onInteractionCompanyChange(companyId) {
    const contacts =
      this.tm.crmModule?.contacts.filter((c) => c.companyId === companyId) ||
      [];
    const deals =
      this.tm.crmModule?.deals.filter((d) => d.companyId === companyId) || [];

    const contactSelect = document.getElementById(
      "crmSidenavInteractionContact",
    );
    const dealSelect = document.getElementById("crmSidenavInteractionDeal");

    if (contactSelect) {
      contactSelect.innerHTML = '<option value="">Select...</option>' +
        contacts.map((c) =>
          `<option value="${c.id}">${escapeHtml(c.firstName)} ${
            escapeHtml(c.lastName)
          }</option>`
        ).join("");
    }
    if (dealSelect) {
      dealSelect.innerHTML = '<option value="">Select...</option>' +
        deals.map((d) =>
          `<option value="${d.id}">${escapeHtml(d.title)}</option>`
        ).join("");
    }
  }

  getFormData() {
    switch (this.entityType) {
      case "company":
        return {
          name:
            document.getElementById("crmSidenavCompanyName")?.value.trim() ||
            "",
          industry: document.getElementById("crmSidenavCompanyIndustry")?.value
            .trim() || null,
          website:
            document.getElementById("crmSidenavCompanyWebsite")?.value.trim() ||
            null,
          phone:
            document.getElementById("crmSidenavCompanyPhone")?.value.trim() ||
            null,
          address: {
            street: document.getElementById("crmSidenavCompanyStreet")?.value
              .trim() || null,
            city:
              document.getElementById("crmSidenavCompanyCity")?.value.trim() ||
              null,
            state:
              document.getElementById("crmSidenavCompanyState")?.value.trim() ||
              null,
            postalCode:
              document.getElementById("crmSidenavCompanyPostal")?.value
                .trim() || null,
            country: document.getElementById("crmSidenavCompanyCountry")?.value
              .trim() || null,
          },
          notes:
            document.getElementById("crmSidenavCompanyNotes")?.value.trim() ||
            null,
        };

      case "contact":
        return {
          companyId:
            document.getElementById("crmSidenavContactCompany")?.value || null,
          firstName:
            document.getElementById("crmSidenavContactFirstName")?.value
              .trim() || "",
          lastName: document.getElementById("crmSidenavContactLastName")?.value
            .trim() || "",
          email:
            document.getElementById("crmSidenavContactEmail")?.value.trim() ||
            null,
          phone:
            document.getElementById("crmSidenavContactPhone")?.value.trim() ||
            null,
          title:
            document.getElementById("crmSidenavContactTitle")?.value.trim() ||
            null,
          isPrimary:
            document.getElementById("crmSidenavContactPrimary")?.checked ||
            false,
          notes:
            document.getElementById("crmSidenavContactNotes")?.value.trim() ||
            null,
        };

      case "deal":
        return {
          title: document.getElementById("crmSidenavDealTitle")?.value.trim() ||
            "",
          companyId: document.getElementById("crmSidenavDealCompany")?.value ||
            null,
          contactId: document.getElementById("crmSidenavDealContact")?.value ||
            null,
          value:
            parseFloat(document.getElementById("crmSidenavDealValue")?.value) ||
            0,
          stage: document.getElementById("crmSidenavDealStage")?.value ||
            "lead",
          probability: parseInt(
            document.getElementById("crmSidenavDealProbability")?.value,
          ) || 0,
          expectedCloseDate:
            document.getElementById("crmSidenavDealCloseDate")?.value || null,
          notes: document.getElementById("crmSidenavDealNotes")?.value.trim() ||
            null,
        };

      case "interaction":
        return {
          type: document.getElementById("crmSidenavInteractionType")?.value ||
            "note",
          summary:
            document.getElementById("crmSidenavInteractionSummary")?.value
              .trim() || "",
          date: document.getElementById("crmSidenavInteractionDate")?.value ||
            new Date().toISOString().split("T")[0],
          companyId:
            document.getElementById("crmSidenavInteractionCompany")?.value ||
            null,
          contactId:
            document.getElementById("crmSidenavInteractionContact")?.value ||
            null,
          dealId: document.getElementById("crmSidenavInteractionDeal")?.value ||
            null,
          duration: parseInt(
            document.getElementById("crmSidenavInteractionDuration")?.value,
          ) || null,
          nextFollowUp:
            document.getElementById("crmSidenavInteractionFollowUp")?.value ||
            null,
          notes: document.getElementById("crmSidenavInteractionNotes")?.value
            .trim() || null,
        };

      default:
        return {};
    }
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
        document.getElementById("crmSidenavDelete").classList.remove("hidden");
      }
      await this.tm.crmModule?.load();
    } catch (error) {
      console.error(`Error saving ${this.entityType}:`, error);
      this.showSaveStatus("Error");
      showToast(`Error saving ${this.entityType}`, "error");
    }
  }

  getRequiredFieldName() {
    switch (this.entityType) {
      case "company":
        return "name";
      case "contact":
        return "firstName";
      case "deal":
        return "title";
      case "interaction":
        return "summary";
      default:
        return "name";
    }
  }

  async createEntity(data) {
    let response;
    switch (this.entityType) {
      case "company":
        response = await CRMAPI.createCompany(data);
        break;
      case "contact":
        response = await CRMAPI.createContact(data);
        break;
      case "deal":
        response = await CRMAPI.createDeal(data);
        break;
      case "interaction":
        response = await CRMAPI.createInteraction(data);
        break;
    }
    return response.json();
  }

  async updateEntity(data) {
    switch (this.entityType) {
      case "company":
        await CRMAPI.updateCompany(this.editingId, data);
        break;
      case "contact":
        await CRMAPI.updateContact(this.editingId, data);
        break;
      case "deal":
        await CRMAPI.updateDeal(this.editingId, data);
        break;
      case "interaction":
        await CRMAPI.updateInteraction(this.editingId, data);
        break;
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    const confirmMsg = this.entityType === "company"
      ? "Delete this company? This will also remove related contacts, deals, and interactions."
      : `Delete this ${this.entityType}?`;

    if (!confirm(confirmMsg)) return;

    try {
      switch (this.entityType) {
        case "company":
          await CRMAPI.deleteCompany(this.editingId);
          break;
        case "contact":
          await CRMAPI.deleteContact(this.editingId);
          break;
        case "deal":
          await CRMAPI.deleteDeal(this.editingId);
          break;
        case "interaction":
          await CRMAPI.deleteInteraction(this.editingId);
          break;
      }
      showToast(
        `${
          this.entityType.charAt(0).toUpperCase() + this.entityType.slice(1)
        } deleted`,
        "success",
      );
      await this.tm.crmModule?.load();
      this.close();
    } catch (error) {
      console.error(`Error deleting ${this.entityType}:`, error);
      showToast(`Error deleting ${this.entityType}`, "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("crmSidenavSaveStatus");
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

export default CRMSidenavModule;
