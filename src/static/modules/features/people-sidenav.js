/**
 * People Sidenav Module.
 * Pattern: Template Method (extends BaseSidenavModule)
 * CRUD form for Person with all unified fields.
 */

import { BaseSidenavModule } from "../ui/base-sidenav.js";
import { Sidenav } from "../ui/sidenav.js";
import { PeopleAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

export class PeopleSidenavModule extends BaseSidenavModule {
  get prefix() { return "people"; }
  get entityName() { return "Person"; }
  get api() { return PeopleAPI; }
  get titleField() { return "name"; }
  get newLabel() { return "New Person"; }
  get editLabel() { return "Edit Person"; }
  get inputIds() {
    return [
      "peopleSidenavName", "peopleSidenavTitle", "peopleSidenavRole",
      "peopleSidenavDepartments", "peopleSidenavReportsTo",
      "peopleSidenavEmail", "peopleSidenavPhone", "peopleSidenavStartDate",
      "peopleSidenavHoursPerDay", "peopleSidenavWorkingDays",
      "peopleSidenavNotes",
    ];
  }

  openNew() {
    super.openNew();
    this.populateReportsToDropdown();
  }

  /** Override: fetch person from API instead of local state */
  async open(personId) {
    try {
      const person = await PeopleAPI.get(personId);
      if (!person) return;

      this.editingId = personId;
      this.el("Header").textContent = this.editLabel;
      this.populateReportsToDropdown(personId);
      this.fillForm(person);
      this.el("Delete")?.classList.remove("hidden");

      Sidenav.open(this.panelId);
    } catch (error) {
      console.error("Error loading person:", error);
      showToast("Error loading person", "error");
    }
  }

  populateReportsToDropdown(excludeId = null) {
    const select = document.getElementById("peopleSidenavReportsTo");
    if (!select) return;

    select.innerHTML = '<option value="">None</option>';

    const people = this.tm.peopleModule?.people || [];
    people
      .filter((p) => p.id !== excludeId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((p) => {
        const option = document.createElement("option");
        option.value = p.id;
        const label = p.title ? `${p.name} (${p.title})` : p.name;
        option.textContent = label;
        select.appendChild(option);
      });
  }

  clearForm() {
    document.getElementById("peopleSidenavName").value = "";
    document.getElementById("peopleSidenavTitle").value = "";
    document.getElementById("peopleSidenavRole").value = "";
    document.getElementById("peopleSidenavDepartments").value = "";
    document.getElementById("peopleSidenavReportsTo").value = "";
    document.getElementById("peopleSidenavEmail").value = "";
    document.getElementById("peopleSidenavPhone").value = "";
    document.getElementById("peopleSidenavStartDate").value = "";
    document.getElementById("peopleSidenavHoursPerDay").value = "8";
    document.getElementById("peopleSidenavWorkingDays").value = "Mon, Tue, Wed, Thu, Fri";
    document.getElementById("peopleSidenavNotes").value = "";
  }

  fillForm(person) {
    document.getElementById("peopleSidenavName").value = person.name || "";
    document.getElementById("peopleSidenavTitle").value = person.title || "";
    document.getElementById("peopleSidenavRole").value = person.role || "";
    document.getElementById("peopleSidenavDepartments").value =
      person.departments?.join(", ") || "";
    document.getElementById("peopleSidenavReportsTo").value =
      person.reportsTo || "";
    document.getElementById("peopleSidenavEmail").value = person.email || "";
    document.getElementById("peopleSidenavPhone").value = person.phone || "";
    document.getElementById("peopleSidenavStartDate").value =
      person.startDate || "";
    document.getElementById("peopleSidenavHoursPerDay").value =
      person.hoursPerDay ?? 8;
    document.getElementById("peopleSidenavWorkingDays").value =
      person.workingDays?.join(", ") || "Mon, Tue, Wed, Thu, Fri";
    document.getElementById("peopleSidenavNotes").value = person.notes || "";
  }

  getFormData() {
    const deptInput = document.getElementById("peopleSidenavDepartments")
      .value.trim();
    const departments = deptInput
      ? deptInput.split(",").map((d) => d.trim()).filter((d) => d)
      : [];

    const daysInput = document.getElementById("peopleSidenavWorkingDays")
      .value.trim();
    const workingDays = daysInput
      ? daysInput.split(",").map((d) => d.trim()).filter((d) => d)
      : [];

    const hoursRaw = document.getElementById("peopleSidenavHoursPerDay").value;
    const hoursPerDay = hoursRaw ? parseFloat(hoursRaw) : undefined;

    return {
      name: document.getElementById("peopleSidenavName").value.trim(),
      title: document.getElementById("peopleSidenavTitle").value.trim() || undefined,
      role: document.getElementById("peopleSidenavRole").value.trim() || undefined,
      departments: departments.length > 0 ? departments : undefined,
      reportsTo: document.getElementById("peopleSidenavReportsTo").value || undefined,
      email: document.getElementById("peopleSidenavEmail").value.trim() || undefined,
      phone: document.getElementById("peopleSidenavPhone").value.trim() || undefined,
      startDate: document.getElementById("peopleSidenavStartDate").value || undefined,
      hoursPerDay: hoursPerDay || undefined,
      workingDays: workingDays.length > 0 ? workingDays : undefined,
      notes: document.getElementById("peopleSidenavNotes").value.trim() || undefined,
    };
  }

  /** Override: close on create */
  async save() {
    const data = this.getFormData();

    if (!data.name) {
      this.showSaveStatus("Name required");
      return;
    }

    try {
      if (this.editingId) {
        await PeopleAPI.update(this.editingId, data);
        this.showSaveStatus("Saved");
      } else {
        await PeopleAPI.create(data);
        showToast("Person created", "success");
        await this.reloadData();
        this.close();
        return;
      }
      await this.reloadData();
    } catch (error) {
      console.error("Error saving person:", error);
      this.showSaveStatus("Error");
      showToast("Error saving person", "error");
    }
  }

  findEntity(id) {
    return this.tm.peopleModule?.people?.find((p) => p.id === id);
  }

  async reloadData() {
    await this.tm.peopleModule.load();
  }
}
