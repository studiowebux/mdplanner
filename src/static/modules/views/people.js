/**
 * People Directory View Module.
 * Displays people registry with card grid and department filtering.
 * Pattern: ViewModule with load/render cycle and sidenav integration.
 */
import { PeopleAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

export class PeopleModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.people = [];
    this.departments = [];
    this.currentDepartment = "";
    this.searchQuery = "";
  }

  async load() {
    try {
      const [people, departments] = await Promise.all([
        PeopleAPI.fetchAll(),
        PeopleAPI.getDepartments(),
      ]);
      this.people = people;
      this.departments = departments;
      this.renderDepartmentFilter();
      this.renderSummary();
      this.render();
    } catch (error) {
      console.error("Error loading people:", error);
    }
  }

  renderDepartmentFilter() {
    const container = document.getElementById("peopleDepartmentFilters");
    if (!container) return;

    let html = '<button class="people-filter-pill active" data-dept="">All</button>';
    this.departments.forEach((dept) => {
      const active = this.currentDepartment === dept ? " active" : "";
      html += `<button class="people-filter-pill${active}" data-dept="${escapeHtml(dept)}">${escapeHtml(dept)}</button>`;
    });
    container.innerHTML = html;

    container.querySelectorAll(".people-filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        this.currentDepartment = pill.dataset.dept;
        container.querySelectorAll(".people-filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.render();
      });
    });
  }

  renderSummary() {
    const totalEl = document.getElementById("peopleTotalCount");
    const deptsEl = document.getElementById("peopleDeptCount");
    const rolesEl = document.getElementById("peopleRolesCount");

    if (totalEl) totalEl.textContent = this.people.length;
    if (deptsEl) deptsEl.textContent = this.departments.length;
    if (rolesEl) {
      const roles = new Set(this.people.map((p) => p.role || p.title).filter(Boolean));
      rolesEl.textContent = roles.size;
    }
  }

  getFilteredPeople() {
    let filtered = this.people;

    if (this.currentDepartment) {
      filtered = filtered.filter((p) =>
        p.departments?.includes(this.currentDepartment)
      );
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.role && p.role.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    }

    return filtered;
  }

  render() {
    const container = document.getElementById("peopleCardGrid");
    const emptyState = document.getElementById("peopleEmptyState");
    if (!container) return;

    const filtered = this.getFilteredPeople();

    if (filtered.length === 0) {
      container.innerHTML = "";
      if (emptyState) emptyState.style.display = "flex";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    let html = "";
    filtered
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((person) => {
        const deptText = person.departments?.join(", ") || "";
        const roleText = person.role || person.title || "";
        const manager = person.reportsTo
          ? this.people.find((p) => p.id === person.reportsTo)
          : null;

        html += `
        <div class="people-card" data-person-id="${person.id}">
          <div class="people-card-avatar">${this.getInitials(person.name)}</div>
          <div class="people-card-info">
            <div class="people-card-name">${escapeHtml(person.name)}</div>
            <div class="people-card-role">${escapeHtml(roleText)}</div>
            ${deptText ? `<div class="people-card-dept">${escapeHtml(deptText)}</div>` : ""}
            ${person.email ? `<div class="people-card-email">${escapeHtml(person.email)}</div>` : ""}
            ${manager ? `<div class="people-card-reports">Reports to ${escapeHtml(manager.name)}</div>` : ""}
          </div>
        </div>
      `;
      });

    container.innerHTML = html;

    container.querySelectorAll(".people-card").forEach((card) => {
      card.addEventListener("click", () => {
        this.openPersonSidenav(card.dataset.personId);
      });
    });
  }

  getInitials(name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  openPersonSidenav(personId) {
    if (this.tm.peopleSidenavModule) {
      this.tm.peopleSidenavModule.open(personId);
    }
  }

  addPerson() {
    if (this.tm.peopleSidenavModule) {
      this.tm.peopleSidenavModule.openNew();
    }
  }

  handleSearch(query) {
    this.searchQuery = query;
    this.render();
  }

  bindEvents() {
    document.getElementById("addPersonBtn")?.addEventListener(
      "click",
      () => this.addPerson(),
    );
    document.getElementById("peopleSearchInput")?.addEventListener(
      "input",
      (e) => this.handleSearch(e.target.value),
    );
  }
}
