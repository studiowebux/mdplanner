/**
 * OrgChart Sidenav Module.
 * Pattern: Template Method (extends BaseSidenavModule)
 * Custom: async openEdit fetches from API, multi-field validation, closes on create.
 */

import { BaseSidenavModule } from "../ui/base-sidenav.js";
import { Sidenav } from "../ui/sidenav.js";
import { OrgChartAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

export class OrgChartSidenavModule extends BaseSidenavModule {
  selectedDepts = [];
  get prefix() { return "orgchart"; }
  get entityName() { return "Team Member"; }
  get api() { return OrgChartAPI; }
  get titleField() { return "name"; }
  get newLabel() { return "New Team Member"; }
  get editLabel() { return "Edit Team Member"; }
  get inputIds() {
    return [
      "orgchartSidenavName", "orgchartSidenavTitle", "orgchartSidenavDepartments",
      "orgchartSidenavReportsTo", "orgchartSidenavEmail", "orgchartSidenavPhone",
      "orgchartSidenavStartDate", "orgchartSidenavNotes",
    ];
  }

  openNew() {
    super.openNew();
    this.selectedDepts = [];
    this.populateReportsToDropdown();
    this.populateDeptSuggestions();
    this.renderDeptChips();
  }

  /** Override: fetch member from API instead of local state */
  async open(memberId) {
    try {
      const member = await OrgChartAPI.get(memberId);
      if (!member) return;

      this.editingId = memberId;
      this.el("Header").textContent = this.editLabel;
      this.populateReportsToDropdown(memberId);
      this.populateDeptSuggestions();
      this.fillForm(member);
      this.el("Delete")?.classList.remove("hidden");

      Sidenav.open(this.panelId);
    } catch (error) {
      console.error("Error loading member:", error);
      showToast("Error loading member", "error");
    }
  }

  /** Alias for compatibility with callers using openEdit */
  openEdit(memberId) {
    return this.open(memberId);
  }

  populateDeptSuggestions() {
    const datalist = document.getElementById("orgchartDeptSuggestions");
    if (!datalist) return;
    const allDepts = new Set();
    const members = this.tm.orgchartModule?.members || [];
    for (const m of members) {
      if (m.departments) {
        for (const d of m.departments) allDepts.add(d);
      }
    }
    datalist.innerHTML = "";
    for (const dept of [...allDepts].sort()) {
      if (!this.selectedDepts.includes(dept)) {
        const opt = document.createElement("option");
        opt.value = dept;
        datalist.appendChild(opt);
      }
    }
  }

  addDept(name) {
    const trimmed = name.trim();
    if (!trimmed || this.selectedDepts.includes(trimmed)) return;
    this.selectedDepts.push(trimmed);
    this.renderDeptChips();
    this.populateDeptSuggestions();
  }

  removeDept(index) {
    this.selectedDepts.splice(index, 1);
    this.renderDeptChips();
    this.populateDeptSuggestions();
  }

  renderDeptChips() {
    const container = document.getElementById("orgchartDeptChips");
    if (!container) return;
    container.innerHTML = this.selectedDepts.map((dept, i) =>
      `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs border border-default bg-tertiary text-primary">${dept}<button type="button" class="ml-1 text-muted hover:text-primary" data-dept-index="${i}">&times;</button></span>`
    ).join("");
    // Update hidden input
    const hidden = document.getElementById("orgchartSidenavDepartments");
    if (hidden) hidden.value = this.selectedDepts.join(", ");
  }

  populateReportsToDropdown(excludeId = null) {
    const select = document.getElementById("orgchartSidenavReportsTo");
    if (!select) return;

    select.innerHTML = '<option value="">None (Top Level)</option>';

    const members = this.tm.orgchartModule?.members || [];
    members
      .filter((m) => m.id !== excludeId)
      .forEach((m) => {
        const option = document.createElement("option");
        option.value = m.id;
        const label = m.title || m.role || "";
        option.textContent = label ? `${m.name} (${label})` : m.name;
        select.appendChild(option);
      });
  }

  clearForm() {
    document.getElementById("orgchartSidenavName").value = "";
    document.getElementById("orgchartSidenavTitle").value = "";
    document.getElementById("orgchartSidenavDepartments").value = "";
    document.getElementById("orgchartSidenavDeptInput").value = "";
    document.getElementById("orgchartSidenavReportsTo").value = "";
    document.getElementById("orgchartSidenavEmail").value = "";
    document.getElementById("orgchartSidenavPhone").value = "";
    document.getElementById("orgchartSidenavStartDate").value = "";
    document.getElementById("orgchartSidenavNotes").value = "";
    this.selectedDepts = [];
    this.renderDeptChips();
  }

  fillForm(member) {
    document.getElementById("orgchartSidenavName").value = member.name || "";
    document.getElementById("orgchartSidenavTitle").value = member.title || "";
    this.selectedDepts = member.departments ? [...member.departments] : [];
    this.renderDeptChips();
    this.populateDeptSuggestions();
    document.getElementById("orgchartSidenavReportsTo").value =
      member.reportsTo || "";
    document.getElementById("orgchartSidenavEmail").value = member.email || "";
    document.getElementById("orgchartSidenavPhone").value = member.phone || "";
    document.getElementById("orgchartSidenavStartDate").value =
      member.startDate || "";
    document.getElementById("orgchartSidenavNotes").value = member.notes || "";
  }

  getFormData() {
    return {
      name: document.getElementById("orgchartSidenavName").value.trim(),
      title: document.getElementById("orgchartSidenavTitle").value.trim(),
      departments: [...this.selectedDepts],
      reportsTo: document.getElementById("orgchartSidenavReportsTo").value ||
        undefined,
      email: document.getElementById("orgchartSidenavEmail").value.trim() ||
        undefined,
      phone: document.getElementById("orgchartSidenavPhone").value.trim() ||
        undefined,
      startDate: document.getElementById("orgchartSidenavStartDate").value ||
        undefined,
      notes: document.getElementById("orgchartSidenavNotes").value.trim() ||
        undefined,
    };
  }

  /** Override: multi-field validation, close on create */
  async save() {
    const data = this.getFormData();

    if (!data.name) { this.showSaveStatus("Name required"); return; }
    if (!data.title) { this.showSaveStatus("Title required"); return; }
    if (!data.departments || data.departments.length === 0) {
      this.showSaveStatus("At least one department required");
      return;
    }

    try {
      if (this.editingId) {
        await OrgChartAPI.update(this.editingId, data);
        this.showSaveStatus("Saved");
      } else {
        await OrgChartAPI.create(data);
        showToast("Team member created", "success");
        await this.reloadData();
        this.close();
        return;
      }
      await this.reloadData();
    } catch (error) {
      console.error("Error saving member:", error);
      this.showSaveStatus("Error");
      showToast("Error saving team member", "error");
    }
  }

  bindEvents() {
    super.bindEvents();
    const input = document.getElementById("orgchartSidenavDeptInput");
    const addBtn = document.getElementById("orgchartAddDeptBtn");
    const chips = document.getElementById("orgchartDeptChips");

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (input) {
          this.addDept(input.value);
          input.value = "";
          input.focus();
        }
      });
    }
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.addDept(input.value);
          input.value = "";
        }
      });
    }
    if (chips) {
      chips.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-dept-index]");
        if (btn) this.removeDept(parseInt(btn.dataset.deptIndex));
      });
    }
  }

  findEntity(id) {
    return this.tm.orgchartModule?.members?.find((m) => m.id === id);
  }

  async reloadData() {
    await this.tm.orgchartModule.load();
  }
}

export default OrgChartSidenavModule;
