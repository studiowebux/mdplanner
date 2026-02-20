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
    this.populateReportsToDropdown();
  }

  /** Override: fetch member from API instead of local state */
  async open(memberId) {
    try {
      const member = await OrgChartAPI.get(memberId);
      if (!member) return;

      this.editingId = memberId;
      this.el("Header").textContent = this.editLabel;
      this.populateReportsToDropdown(memberId);
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
        option.textContent = `${m.name} (${m.title})`;
        select.appendChild(option);
      });
  }

  clearForm() {
    document.getElementById("orgchartSidenavName").value = "";
    document.getElementById("orgchartSidenavTitle").value = "";
    document.getElementById("orgchartSidenavDepartments").value = "";
    document.getElementById("orgchartSidenavReportsTo").value = "";
    document.getElementById("orgchartSidenavEmail").value = "";
    document.getElementById("orgchartSidenavPhone").value = "";
    document.getElementById("orgchartSidenavStartDate").value = "";
    document.getElementById("orgchartSidenavNotes").value = "";
  }

  fillForm(member) {
    document.getElementById("orgchartSidenavName").value = member.name || "";
    document.getElementById("orgchartSidenavTitle").value = member.title || "";
    document.getElementById("orgchartSidenavDepartments").value =
      member.departments?.join(", ") || "";
    document.getElementById("orgchartSidenavReportsTo").value =
      member.reportsTo || "";
    document.getElementById("orgchartSidenavEmail").value = member.email || "";
    document.getElementById("orgchartSidenavPhone").value = member.phone || "";
    document.getElementById("orgchartSidenavStartDate").value =
      member.startDate || "";
    document.getElementById("orgchartSidenavNotes").value = member.notes || "";
  }

  getFormData() {
    const deptInput = document.getElementById("orgchartSidenavDepartments")
      .value.trim();
    const departments = deptInput
      ? deptInput.split(",").map((d) => d.trim()).filter((d) => d)
      : [];

    return {
      name: document.getElementById("orgchartSidenavName").value.trim(),
      title: document.getElementById("orgchartSidenavTitle").value.trim(),
      departments,
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

  findEntity(id) {
    return this.tm.orgchartModule?.members?.find((m) => m.id === id);
  }

  async reloadData() {
    await this.tm.orgchartModule.load();
  }
}

export default OrgChartSidenavModule;
