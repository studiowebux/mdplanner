import { CapacityAPI, MilestonesAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

/**
 * CapacityModule - Handles Capacity Planning (team members, allocations, utilization)
 */
export class CapacityModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.capacityPlans = await CapacityAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.capacityPlans.length > 0 &&
        !this.taskManager.selectedCapacityPlanId
      ) {
        this.select(this.taskManager.capacityPlans[0].id);
      } else if (this.taskManager.selectedCapacityPlanId) {
        this.select(this.taskManager.selectedCapacityPlanId);
      }
    } catch (error) {
      console.error("Error loading capacity plans:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("capacityPlanSelector");
    if (!selector) return;
    selector.innerHTML = '<option value="">Select Plan</option>';
    for (const plan of this.taskManager.capacityPlans) {
      const option = document.createElement("option");
      option.value = plan.id;
      option.textContent = plan.title;
      if (plan.id === this.taskManager.selectedCapacityPlanId)
        option.selected = true;
      selector.appendChild(option);
    }
  }

  select(id) {
    this.taskManager.selectedCapacityPlanId = id;
    const plan = this.taskManager.capacityPlans.find((p) => p.id === id);
    const emptyState = document.getElementById("emptyCapacityState");
    const teamContent = document.getElementById("capacityTeamContent");
    const allocContent = document.getElementById("capacityAllocContent");
    const utilContent = document.getElementById("capacityUtilContent");
    const editBtn = document.getElementById("editCapacityPlanBtn");
    const deleteBtn = document.getElementById("deleteCapacityPlanBtn");

    if (!plan) {
      emptyState?.classList.remove("hidden");
      teamContent?.classList.add("hidden");
      allocContent?.classList.add("hidden");
      utilContent?.classList.add("hidden");
      editBtn?.classList.add("hidden");
      deleteBtn?.classList.add("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    editBtn?.classList.remove("hidden");
    deleteBtn?.classList.remove("hidden");
    this.switchTab(this.taskManager.capacityTab);
  }

  switchTab(tab) {
    this.taskManager.capacityTab = tab;
    const teamTab = document.getElementById("capacityTeamTab");
    const allocTab = document.getElementById("capacityAllocTab");
    const utilTab = document.getElementById("capacityUtilTab");
    const teamContent = document.getElementById("capacityTeamContent");
    const allocContent = document.getElementById("capacityAllocContent");
    const utilContent = document.getElementById("capacityUtilContent");

    [teamTab, allocTab, utilTab].forEach((t) => {
      t?.classList.remove(
        "border-gray-900",
        "dark:border-gray-100",
        "text-gray-900",
        "dark:text-gray-100",
      );
      t?.classList.add(
        "border-transparent",
        "text-gray-500",
        "dark:text-gray-400",
      );
    });
    [teamContent, allocContent, utilContent].forEach((c) =>
      c?.classList.add("hidden"),
    );

    if (tab === "team") {
      teamTab?.classList.add(
        "border-gray-900",
        "dark:border-gray-100",
        "text-gray-900",
        "dark:text-gray-100",
      );
      teamTab?.classList.remove(
        "border-transparent",
        "text-gray-500",
        "dark:text-gray-400",
      );
      teamContent?.classList.remove("hidden");
      this.renderTeamMembers();
    } else if (tab === "alloc") {
      allocTab?.classList.add(
        "border-gray-900",
        "dark:border-gray-100",
        "text-gray-900",
        "dark:text-gray-100",
      );
      allocTab?.classList.remove(
        "border-transparent",
        "text-gray-500",
        "dark:text-gray-400",
      );
      allocContent?.classList.remove("hidden");
      this.renderAllocationsGrid();
    } else if (tab === "util") {
      utilTab?.classList.add(
        "border-gray-900",
        "dark:border-gray-100",
        "text-gray-900",
        "dark:text-gray-100",
      );
      utilTab?.classList.remove(
        "border-transparent",
        "text-gray-500",
        "dark:text-gray-400",
      );
      utilContent?.classList.remove("hidden");
      this.renderUtilization();
    }
  }

  renderTeamMembers() {
    const plan = this.taskManager.capacityPlans.find(
      (p) => p.id === this.taskManager.selectedCapacityPlanId,
    );
    const grid = document.getElementById("teamMembersGrid");
    if (!grid || !plan) return;

    if (plan.teamMembers.length === 0) {
      grid.innerHTML =
        '<div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">No team members yet. Click "+ Add Member" to add one.</div>';
      return;
    }

    grid.innerHTML = plan.teamMembers
      .map(
        (member) => `
      <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="font-medium text-gray-900 dark:text-gray-100">${escapeHtml(member.name)}</h4>
            ${member.role ? `<p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(member.role)}</p>` : ""}
          </div>
          <div class="flex gap-1">
            <button onclick="taskManager.editTeamMember('${member.id}')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">Edit</button>
            <button onclick="taskManager.deleteTeamMember('${member.id}')" class="text-red-400 hover:text-red-600 text-sm">Del</button>
          </div>
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>${member.hoursPerDay}h/day</div>
          <div>${member.workingDays.join(", ")}</div>
          <div class="text-xs text-gray-500 dark:text-gray-500">${member.hoursPerDay * member.workingDays.length}h/week capacity</div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  getWeekStart(offset = 0) {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(monday.getDate() - monday.getDay() + 1 + offset * 7);
    return monday.toISOString().split("T")[0];
  }

  getWeekDates(weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const format = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${format(start)} - ${format(end)}`;
  }

  changeAllocWeek(delta) {
    this.taskManager.allocWeekOffset += delta;
    this.renderAllocationsGrid();
  }

  renderAllocationsGrid() {
    const plan = this.taskManager.capacityPlans.find(
      (p) => p.id === this.taskManager.selectedCapacityPlanId,
    );
    const header = document.getElementById("allocationsHeader");
    const body = document.getElementById("allocationsBody");
    const weekRange = document.getElementById("allocWeekRange");
    if (!header || !body || !plan) return;

    // Generate 4 weeks of columns
    const weeks = [];
    for (let i = 0; i < 4; i++) {
      weeks.push(this.getWeekStart(this.taskManager.allocWeekOffset + i));
    }

    const currentWeek = this.getWeekStart(this.taskManager.allocWeekOffset);
    weekRange.textContent = this.getWeekDates(currentWeek);

    header.innerHTML = `
      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member</th>
      ${weeks.map((w) => `<th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${this.getWeekDates(w)}</th>`).join("")}
    `;

    if (plan.teamMembers.length === 0) {
      body.innerHTML =
        '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No team members. Add members in the Team tab first.</td></tr>';
      return;
    }

    body.innerHTML = plan.teamMembers
      .map((member) => {
        const weeklyCapacity = member.hoursPerDay * member.workingDays.length;
        return `
        <tr>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${escapeHtml(member.name)}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${weeklyCapacity}h/week</div>
          </td>
          ${weeks
            .map((week) => {
              const allocs = plan.allocations.filter(
                (a) => a.memberId === member.id && a.weekStart === week,
              );
              const totalHours = allocs.reduce(
                (sum, a) => sum + a.allocatedHours,
                0,
              );
              const utilPct =
                weeklyCapacity > 0 ? (totalHours / weeklyCapacity) * 100 : 0;
              let bgClass =
                "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700";
              if (utilPct >= 100)
                bgClass =
                  "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700";
              else if (utilPct >= 80)
                bgClass =
                  "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700";

              return `
              <td class="px-4 py-3 text-center">
                <button onclick="taskManager.openAllocationModal('${member.id}', '${week}')"
                  class="inline-block min-w-[60px] px-3 py-2 rounded border ${bgClass} text-sm font-medium text-gray-700 dark:text-gray-300 hover:opacity-80">
                  ${totalHours}h
                </button>
              </td>
            `;
            })
            .join("")}
        </tr>
      `;
      })
      .join("");
  }

  async renderUtilization() {
    const plan = this.taskManager.capacityPlans.find(
      (p) => p.id === this.taskManager.selectedCapacityPlanId,
    );
    const container = document.getElementById("utilizationBars");
    if (!container || !plan) return;

    try {
      const utilization = await CapacityAPI.getUtilization(plan.id);

      if (utilization.length === 0) {
        container.innerHTML =
          '<div class="text-center py-8 text-gray-500 dark:text-gray-400">No team members to show utilization.</div>';
        return;
      }

      container.innerHTML = utilization
        .map((u) => {
          const maxHours = Math.max(
            u.weeklyCapacity * 4,
            u.totalAllocated,
            u.actualHours,
          );
          const capacityPct =
            maxHours > 0 ? ((u.weeklyCapacity * 4) / maxHours) * 100 : 0;
          const allocPct =
            maxHours > 0 ? (u.totalAllocated / maxHours) * 100 : 0;
          const actualPct = maxHours > 0 ? (u.actualHours / maxHours) * 100 : 0;

          return `
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${escapeHtml(u.memberName)}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">${u.utilizationPercent}% utilization</span>
            </div>
            <div class="relative h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <div class="absolute inset-y-0 left-0 bg-gray-400 dark:bg-gray-500 opacity-30" style="width: ${capacityPct}%"></div>
              <div class="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-600" style="width: ${allocPct}%"></div>
              <div class="absolute inset-y-0 left-0 bg-green-500 dark:bg-green-600" style="width: ${actualPct}%"></div>
            </div>
            <div class="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Available: ${u.weeklyCapacity * 4}h (4 weeks)</span>
              <span class="text-blue-600 dark:text-blue-400">Allocated: ${u.totalAllocated}h</span>
              <span class="text-green-600 dark:text-green-400">Actual: ${u.actualHours}h</span>
            </div>
          </div>
        `;
        })
        .join("");
    } catch (error) {
      console.error("Error loading utilization:", error);
      container.innerHTML =
        '<div class="text-center py-8 text-red-500">Error loading utilization data.</div>';
    }
  }

  // Plan operations use sidenav - Pattern: Sidenav Module
  openPlanModal(editId = null) {
    if (editId) {
      this.taskManager.capacitySidenavModule?.openEdit(editId);
    } else {
      this.taskManager.capacitySidenavModule?.openNew();
    }
  }

  editPlan() {
    if (this.taskManager.selectedCapacityPlanId) {
      this.taskManager.capacitySidenavModule?.openEdit(this.taskManager.selectedCapacityPlanId);
    }
  }

  async deletePlan() {
    if (!this.taskManager.selectedCapacityPlanId) return;
    if (!confirm("Are you sure you want to delete this capacity plan?")) return;
    try {
      await CapacityAPI.delete(this.taskManager.selectedCapacityPlanId);
      this.taskManager.selectedCapacityPlanId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting capacity plan:", error);
    }
  }

  openTeamMemberModal(editId = null) {
    this.taskManager.editingTeamMemberId = editId;
    const modal = document.getElementById("teamMemberModal");
    const title = document.getElementById("teamMemberModalTitle");
    const nameInput = document.getElementById("teamMemberName");
    const roleInput = document.getElementById("teamMemberRole");
    const hoursInput = document.getElementById("teamMemberHours");

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    days.forEach((day) => {
      document.getElementById(`work${day}`).checked = false;
    });

    if (editId) {
      const plan = this.taskManager.capacityPlans.find(
        (p) => p.id === this.taskManager.selectedCapacityPlanId,
      );
      const member = plan?.teamMembers.find((m) => m.id === editId);
      if (member) {
        title.textContent = "Edit Team Member";
        nameInput.value = member.name;
        roleInput.value = member.role || "";
        hoursInput.value = member.hoursPerDay;
        member.workingDays.forEach((day) => {
          const checkbox = document.getElementById(`work${day}`);
          if (checkbox) checkbox.checked = true;
        });
      }
    } else {
      title.textContent = "Add Team Member";
      nameInput.value = "";
      roleInput.value = "";
      hoursInput.value = 8;
      ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((day) => {
        document.getElementById(`work${day}`).checked = true;
      });
    }
    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  closeTeamMemberModal() {
    const modal = document.getElementById("teamMemberModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.taskManager.editingTeamMemberId = null;
  }

  async saveTeamMember(e) {
    e.preventDefault();
    const name = document.getElementById("teamMemberName").value;
    const role = document.getElementById("teamMemberRole").value;
    const hoursPerDay =
      parseInt(document.getElementById("teamMemberHours").value) || 8;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const workingDays = days.filter(
      (day) => document.getElementById(`work${day}`)?.checked,
    );

    const data = {
      name,
      role: role || undefined,
      hoursPerDay,
      workingDays,
    };

    try {
      if (this.taskManager.editingTeamMemberId) {
        await CapacityAPI.updateMember(
          this.taskManager.selectedCapacityPlanId,
          this.taskManager.editingTeamMemberId,
          data,
        );
      } else {
        await CapacityAPI.createMember(
          this.taskManager.selectedCapacityPlanId,
          data,
        );
      }
      this.closeTeamMemberModal();
      await this.load();
      this.renderTeamMembers();
    } catch (error) {
      console.error("Error saving team member:", error);
    }
  }

  editTeamMember(id) {
    this.openTeamMemberModal(id);
  }

  async deleteTeamMember(id) {
    if (
      !confirm("Delete this team member? Their allocations will also be removed.")
    )
      return;
    try {
      await CapacityAPI.deleteMember(
        this.taskManager.selectedCapacityPlanId,
        id,
      );
      await this.load();
      this.renderTeamMembers();
    } catch (error) {
      console.error("Error deleting team member:", error);
    }
  }

  async openAllocationModal(memberId, weekStart) {
    this.taskManager.editingAllocationMemberId = memberId;
    this.taskManager.editingAllocationWeek = weekStart;

    const plan = this.taskManager.capacityPlans.find(
      (p) => p.id === this.taskManager.selectedCapacityPlanId,
    );
    const member = plan?.teamMembers.find((m) => m.id === memberId);
    const allocs =
      plan?.allocations.filter(
        (a) => a.memberId === memberId && a.weekStart === weekStart,
      ) || [];

    const modal = document.getElementById("allocationModal");
    const title = document.getElementById("allocationModalTitle");
    const hoursInput = document.getElementById("allocationHours");
    const typeSelect = document.getElementById("allocationTargetType");
    const targetSelect = document.getElementById("allocationTargetId");
    const notesInput = document.getElementById("allocationNotes");
    const deleteBtn = document.getElementById("deleteAllocationBtn");

    title.textContent = `Allocation: ${member?.name || "Member"} - ${this.getWeekDates(weekStart)}`;

    let existingTargetId = "";
    let existingTargetType = "task";

    if (allocs.length > 0) {
      const alloc = allocs[0];
      this.taskManager.editingAllocationId = alloc.id;
      hoursInput.value = allocs.reduce((sum, a) => sum + a.allocatedHours, 0);
      existingTargetType = alloc.targetType;
      existingTargetId = alloc.targetId || "";
      notesInput.value = alloc.notes || "";
      deleteBtn?.classList.remove("hidden");
    } else {
      this.taskManager.editingAllocationId = null;
      hoursInput.value = "";
      existingTargetType = "task";
      existingTargetId = "";
      notesInput.value = "";
      deleteBtn?.classList.add("hidden");
    }

    typeSelect.value = existingTargetType;
    await this.updateTargetOptions(existingTargetType, existingTargetId);

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  async updateTargetOptions(targetType, selectedValue = "") {
    const targetSelect = document.getElementById("allocationTargetId");
    const hint = document.getElementById("allocationTargetHint");
    if (!targetSelect) return;

    targetSelect.innerHTML = '<option value="">Select target...</option>';

    if (targetType === "task") {
      hint.textContent = "Allocate time to a specific task";
      const tasks = this.taskManager.tasks || [];
      // Group by status for better organization
      const incomplete = tasks.filter(t => !t.completed);
      incomplete.forEach(task => {
        const option = document.createElement("option");
        option.value = task.id;
        const title = task.title.length > 35 ? task.title.slice(0, 35) + "..." : task.title;
        const effort = task.config?.effort ? ` (${task.config.effort}h)` : "";
        const assignee = task.config?.assignee ? ` [${task.config.assignee}]` : "";
        option.textContent = `${title}${effort}${assignee}`;
        if (task.id === selectedValue) option.selected = true;
        targetSelect.appendChild(option);
      });
    } else if (targetType === "milestone") {
      hint.textContent = "Allocate time to a milestone";
      try {
        const milestones = await MilestonesAPI.fetchAll();
        milestones.forEach(ms => {
          const option = document.createElement("option");
          option.value = ms.id;
          option.textContent = `${ms.title}${ms.status ? ` (${ms.status})` : ""}`;
          if (ms.id === selectedValue) option.selected = true;
          targetSelect.appendChild(option);
        });
      } catch (error) {
        console.error("Error loading milestones:", error);
      }
    } else {
      hint.textContent = "General project allocation";
    }
  }

  closeAllocationModal() {
    const modal = document.getElementById("allocationModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.taskManager.editingAllocationId = null;
    this.taskManager.editingAllocationMemberId = null;
    this.taskManager.editingAllocationWeek = null;
  }

  async saveAllocation(e) {
    e.preventDefault();
    const hours =
      parseInt(document.getElementById("allocationHours").value) || 0;
    const targetType = document.getElementById("allocationTargetType").value;
    const targetId = document.getElementById("allocationTargetId").value;
    const notes = document.getElementById("allocationNotes").value;

    const data = {
      memberId: this.taskManager.editingAllocationMemberId,
      weekStart: this.taskManager.editingAllocationWeek,
      allocatedHours: hours,
      targetType,
      targetId: targetId || undefined,
      notes: notes || undefined,
    };

    try {
      if (this.taskManager.editingAllocationId) {
        // Delete existing and create new (simplified approach)
        await CapacityAPI.deleteAllocation(
          this.taskManager.selectedCapacityPlanId,
          this.taskManager.editingAllocationId,
        );
      }
      if (hours > 0) {
        await CapacityAPI.createAllocation(
          this.taskManager.selectedCapacityPlanId,
          data,
        );
      }
      this.closeAllocationModal();
      await this.load();
      this.renderAllocationsGrid();
    } catch (error) {
      console.error("Error saving allocation:", error);
    }
  }

  async deleteAllocation() {
    if (!this.taskManager.editingAllocationId) return;
    try {
      await CapacityAPI.deleteAllocation(
        this.taskManager.selectedCapacityPlanId,
        this.taskManager.editingAllocationId,
      );
      this.closeAllocationModal();
      await this.load();
      this.renderAllocationsGrid();
    } catch (error) {
      console.error("Error deleting allocation:", error);
    }
  }

  async openAutoAssignModal() {
    const plan = this.taskManager.capacityPlans.find(
      (p) => p.id === this.taskManager.selectedCapacityPlanId,
    );
    if (!plan) return;

    const modal = document.getElementById("autoAssignModal");
    const list = document.getElementById("autoAssignList");
    const empty = document.getElementById("autoAssignEmpty");

    try {
      this.taskManager.autoAssignSuggestions =
        await CapacityAPI.suggestAssignments(plan.id);

      if (this.taskManager.autoAssignSuggestions.length === 0) {
        empty?.classList.remove("hidden");
        list?.classList.add("hidden");
      } else {
        empty?.classList.add("hidden");
        list?.classList.remove("hidden");
        list.innerHTML = this.taskManager.autoAssignSuggestions
          .map(
            (s, i) => `
          <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <input type="checkbox" checked data-index="${i}" class="auto-assign-checkbox rounded">
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${escapeHtml(s.taskTitle)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                Assign to <span class="font-medium">${escapeHtml(s.memberName)}</span> for ${s.hours}h
              </div>
            </div>
          </label>
        `,
          )
          .join("");
      }

      modal?.classList.remove("hidden");
      modal?.classList.add("flex");
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }
  }

  closeAutoAssignModal() {
    const modal = document.getElementById("autoAssignModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.taskManager.autoAssignSuggestions = [];
  }

  async applyAutoAssign() {
    const checkboxes = document.querySelectorAll(
      ".auto-assign-checkbox:checked",
    );
    const selectedSuggestions = Array.from(checkboxes).map((cb) => {
      const index = parseInt(cb.dataset.index);
      return this.taskManager.autoAssignSuggestions[index];
    });

    if (selectedSuggestions.length === 0) {
      this.closeAutoAssignModal();
      return;
    }

    try {
      await CapacityAPI.applyAssignments(
        this.taskManager.selectedCapacityPlanId,
        { suggestions: selectedSuggestions },
      );
      this.closeAutoAssignModal();
      await this.load();
      this.renderAllocationsGrid();
    } catch (error) {
      console.error("Error applying assignments:", error);
    }
  }

  openImportAssigneesModal() {
    const plan = this.taskManager.capacityPlans.find(
      (p) => p.id === this.taskManager.selectedCapacityPlanId,
    );
    if (!plan) return;

    const modal = document.getElementById("importAssigneesModal");
    const list = document.getElementById("importAssigneesList");
    const empty = document.getElementById("importAssigneesEmpty");

    // Get assignees from project config that aren't already team members
    const assignees = this.taskManager.projectConfig?.assignees || [];
    const existingNames = plan.teamMembers.map(m => m.name.toLowerCase());
    const availableAssignees = assignees.filter(
      name => !existingNames.includes(name.toLowerCase())
    );

    if (availableAssignees.length === 0) {
      empty?.classList.remove("hidden");
      list?.classList.add("hidden");
    } else {
      empty?.classList.add("hidden");
      list?.classList.remove("hidden");
      list.innerHTML = availableAssignees
        .map((name, i) => `
          <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <input type="checkbox" checked data-name="${escapeHtml(name)}" class="import-assignee-checkbox rounded">
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${escapeHtml(name)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">8h/day, Mon-Fri</div>
            </div>
          </label>
        `)
        .join("");
    }

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  closeImportAssigneesModal() {
    const modal = document.getElementById("importAssigneesModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
  }

  async applyImportAssignees() {
    const checkboxes = document.querySelectorAll(".import-assignee-checkbox:checked");
    const selectedNames = Array.from(checkboxes).map(cb => cb.dataset.name);

    if (selectedNames.length === 0) {
      this.closeImportAssigneesModal();
      return;
    }

    try {
      // Create team members with default settings
      for (const name of selectedNames) {
        await CapacityAPI.createMember(
          this.taskManager.selectedCapacityPlanId,
          {
            name,
            hoursPerDay: 8,
            workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          }
        );
      }
      this.closeImportAssigneesModal();
      await this.load();
      this.renderTeamMembers();
    } catch (error) {
      console.error("Error importing assignees:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("capacityViewBtn")
      ?.addEventListener("click", () => {
        this.taskManager.switchView("capacity");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Plan sidenav (add button uses sidenav)
    document
      .getElementById("addCapacityPlanBtn")
      ?.addEventListener("click", () => this.openPlanModal());

    // Plan selector
    document
      .getElementById("capacityPlanSelector")
      ?.addEventListener("change", (e) => this.select(e.target.value));
    document
      .getElementById("editCapacityPlanBtn")
      ?.addEventListener("click", () => this.editPlan());
    document
      .getElementById("deleteCapacityPlanBtn")
      ?.addEventListener("click", () => this.deletePlan());

    // Team member modal events
    document
      .getElementById("addTeamMemberBtn")
      ?.addEventListener("click", () => this.openTeamMemberModal());
    document
      .getElementById("cancelTeamMemberBtn")
      ?.addEventListener("click", () => this.closeTeamMemberModal());
    document
      .getElementById("teamMemberForm")
      ?.addEventListener("submit", (e) => this.saveTeamMember(e));

    // Allocation modal events
    document
      .getElementById("cancelAllocationBtn")
      ?.addEventListener("click", () => this.closeAllocationModal());
    document
      .getElementById("deleteAllocationBtn")
      ?.addEventListener("click", () => this.deleteAllocation());
    document
      .getElementById("allocationForm")
      ?.addEventListener("submit", (e) => this.saveAllocation(e));
    document
      .getElementById("allocationTargetType")
      ?.addEventListener("change", async (e) => await this.updateTargetOptions(e.target.value));

    // Import assignees modal events
    document
      .getElementById("importAssigneesBtn")
      ?.addEventListener("click", () => this.openImportAssigneesModal());
    document
      .getElementById("cancelImportAssigneesBtn")
      ?.addEventListener("click", () => this.closeImportAssigneesModal());
    document
      .getElementById("applyImportAssigneesBtn")
      ?.addEventListener("click", () => this.applyImportAssignees());

    // Tab switching
    document
      .getElementById("capacityTeamTab")
      ?.addEventListener("click", () => this.switchTab("team"));
    document
      .getElementById("capacityAllocTab")
      ?.addEventListener("click", () => this.switchTab("alloc"));
    document
      .getElementById("capacityUtilTab")
      ?.addEventListener("click", () => this.switchTab("util"));

    // Week navigation
    document
      .getElementById("allocPrevWeek")
      ?.addEventListener("click", () => this.changeAllocWeek(-1));
    document
      .getElementById("allocNextWeek")
      ?.addEventListener("click", () => this.changeAllocWeek(1));

    // Auto-assign modal events
    document
      .getElementById("autoAssignBtn")
      ?.addEventListener("click", () => this.openAutoAssignModal());
    document
      .getElementById("cancelAutoAssignBtn")
      ?.addEventListener("click", () => this.closeAutoAssignModal());
    document
      .getElementById("applyAutoAssignBtn")
      ?.addEventListener("click", () => this.applyAutoAssign());

    // Close modals on background click
    document.getElementById("teamMemberModal")?.addEventListener("click", (e) => {
      if (e.target.id === "teamMemberModal") {
        this.closeTeamMemberModal();
      }
    });
    document.getElementById("allocationModal")?.addEventListener("click", (e) => {
      if (e.target.id === "allocationModal") {
        this.closeAllocationModal();
      }
    });
    document.getElementById("autoAssignModal")?.addEventListener("click", (e) => {
      if (e.target.id === "autoAssignModal") {
        this.closeAutoAssignModal();
      }
    });
    document.getElementById("importAssigneesModal")?.addEventListener("click", (e) => {
      if (e.target.id === "importAssigneesModal") {
        this.closeImportAssigneesModal();
      }
    });
  }
}
