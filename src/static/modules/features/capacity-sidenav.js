// Capacity Planning Sidenav Module
// Slide-in panel for capacity plan with team members and allocations

import { Sidenav } from '../ui/sidenav.js';
import { CapacityAPI, MilestonesAPI } from '../api.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../utils.js';

export class CapacitySidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingPlanId = null;
    this.currentPlan = null;
    this.autoSaveTimeout = null;
    this.editingMemberId = null;
    this.editingAllocMemberId = null;
    this.editingAllocWeek = null;
  }

  bindEvents() {
    document.getElementById('capacitySidenavClose')?.addEventListener('click', () => this.close());
    document.getElementById('capacitySidenavCancel')?.addEventListener('click', () => this.close());
    document.getElementById('capacitySidenavDelete')?.addEventListener('click', () => this.handleDelete());

    // Plan fields auto-save
    document.getElementById('capacitySidenavTitle')?.addEventListener('input', () => this.scheduleAutoSave());
    document.getElementById('capacitySidenavDate')?.addEventListener('change', () => this.scheduleAutoSave());
    document.getElementById('capacitySidenavBudget')?.addEventListener('input', () => this.scheduleAutoSave());

    // Add team member button
    document.getElementById('capacitySidenav_addMember')?.addEventListener('click', () => this.showAddMemberForm());

    // Import assignees button
    document.getElementById('capacitySidenav_importAssignees')?.addEventListener('click', () => this.showImportAssigneesForm());
  }

  openNew() {
    this.editingPlanId = null;
    this.currentPlan = {
      title: '',
      date: new Date().toISOString().split('T')[0],
      budgetHours: null,
      teamMembers: [],
      allocations: []
    };

    document.getElementById('capacitySidenavHeader').textContent = 'New Capacity Plan';
    this.fillForm();
    document.getElementById('capacitySidenavDelete').classList.add('hidden');
    Sidenav.open('capacitySidenav');
  }

  openEdit(planId) {
    const plan = this.tm.capacityPlans.find(p => p.id === planId);
    if (!plan) return;

    this.editingPlanId = planId;
    this.currentPlan = JSON.parse(JSON.stringify(plan)); // Deep copy

    document.getElementById('capacitySidenavHeader').textContent = 'Edit Capacity Plan';
    this.fillForm();
    document.getElementById('capacitySidenavDelete').classList.remove('hidden');
    Sidenav.open('capacitySidenav');
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close('capacitySidenav');
    this.editingPlanId = null;
    this.currentPlan = null;
    this.editingMemberId = null;
  }

  fillForm() {
    document.getElementById('capacitySidenavTitle').value = this.currentPlan.title || '';
    document.getElementById('capacitySidenavDate').value = this.currentPlan.date || '';
    document.getElementById('capacitySidenavBudget').value = this.currentPlan.budgetHours || '';
    this.renderTeamMembers();
  }

  renderTeamMembers() {
    const container = document.getElementById('capacitySidenav_members');
    if (!container) return;

    const members = this.currentPlan.teamMembers || [];

    if (members.length === 0) {
      container.innerHTML = '<div class="text-gray-400 dark:text-gray-500 text-sm italic py-2">No team members yet</div>';
      return;
    }

    container.innerHTML = members.map(member => `
      <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 mb-2">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium text-gray-900 dark:text-gray-100 text-sm">${escapeHtml(member.name)}</div>
            ${member.role ? `<div class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(member.role)}</div>` : ''}
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ${member.hoursPerDay}h/day, ${member.workingDays?.join(', ') || 'Mon-Fri'}
            </div>
          </div>
          <div class="flex gap-1">
            <button onclick="taskManager.capacitySidenavModule.editMember('${member.id}')"
                    class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Edit</button>
            <button onclick="taskManager.capacitySidenavModule.removeMember('${member.id}')"
                    class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300">Del</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  showAddMemberForm() {
    this.editingMemberId = null;
    this.showMemberForm({
      name: '',
      role: '',
      hoursPerDay: 8,
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    });
  }

  editMember(memberId) {
    const member = this.currentPlan.teamMembers?.find(m => m.id === memberId);
    if (!member) return;
    this.editingMemberId = memberId;
    this.showMemberForm(member);
  }

  showMemberForm(member) {
    const container = document.getElementById('capacitySidenav_memberForm');
    if (!container) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const memberDays = member.workingDays || [];

    container.innerHTML = `
      <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-2 border border-gray-200 dark:border-gray-600">
        <div class="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">${this.editingMemberId ? 'Edit' : 'Add'} Team Member</div>
        <div class="space-y-2">
          <input type="text" id="memberFormName" value="${escapeHtml(member.name)}" placeholder="Name *"
                 class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <input type="text" id="memberFormRole" value="${escapeHtml(member.role || '')}" placeholder="Role (optional)"
                 class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <div class="flex gap-2">
            <input type="number" id="memberFormHours" value="${member.hoursPerDay || 8}" min="1" max="24" placeholder="Hours/day"
                   class="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <span class="text-xs text-gray-500 self-center">hours/day</span>
          </div>
          <div class="flex flex-wrap gap-1">
            ${days.map(day => `
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" class="member-day-checkbox rounded text-gray-900" value="${day}"
                       ${memberDays.includes(day) ? 'checked' : ''}>
                <span class="ml-1 text-xs text-gray-600 dark:text-gray-400">${day}</span>
              </label>
            `).join('')}
          </div>
          <div class="flex gap-2 mt-2">
            <button type="button" onclick="taskManager.capacitySidenavModule.saveMember()"
                    class="px-3 py-1 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded hover:bg-gray-700 dark:hover:bg-gray-300">
              ${this.editingMemberId ? 'Update' : 'Add'}
            </button>
            <button type="button" onclick="taskManager.capacitySidenavModule.cancelMemberForm()"
                    class="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  cancelMemberForm() {
    const container = document.getElementById('capacitySidenav_memberForm');
    if (container) container.innerHTML = '';
    this.editingMemberId = null;
  }

  async saveMember() {
    const name = document.getElementById('memberFormName')?.value.trim();
    if (!name) {
      showToast('Name is required', 'error');
      return;
    }

    const role = document.getElementById('memberFormRole')?.value.trim() || null;
    const hoursPerDay = parseInt(document.getElementById('memberFormHours')?.value) || 8;
    const workingDays = Array.from(document.querySelectorAll('.member-day-checkbox:checked')).map(cb => cb.value);

    const memberData = { name, role, hoursPerDay, workingDays };

    try {
      if (this.editingPlanId) {
        // Plan exists, use API
        if (this.editingMemberId) {
          await CapacityAPI.updateMember(this.editingPlanId, this.editingMemberId, memberData);
        } else {
          await CapacityAPI.createMember(this.editingPlanId, memberData);
        }
        // Reload plan data
        const plans = await CapacityAPI.fetchAll();
        this.tm.capacityPlans = plans;
        const updatedPlan = plans.find(p => p.id === this.editingPlanId);
        if (updatedPlan) {
          this.currentPlan = JSON.parse(JSON.stringify(updatedPlan));
        }
        this.showSaveStatus('Saved');
      } else {
        // Plan not saved yet, update locally
        if (this.editingMemberId) {
          const idx = this.currentPlan.teamMembers.findIndex(m => m.id === this.editingMemberId);
          if (idx >= 0) {
            this.currentPlan.teamMembers[idx] = { ...this.currentPlan.teamMembers[idx], ...memberData };
          }
        } else {
          memberData.id = 'temp_' + crypto.randomUUID().substring(0, 8);
          this.currentPlan.teamMembers.push(memberData);
        }
      }

      this.cancelMemberForm();
      this.renderTeamMembers();
      await this.tm.capacityModule?.load();
    } catch (error) {
      console.error('Error saving team member:', error);
      showToast('Error saving team member', 'error');
    }
  }

  async removeMember(memberId) {
    if (!confirm('Delete this team member? Their allocations will also be removed.')) return;

    try {
      if (this.editingPlanId) {
        await CapacityAPI.deleteMember(this.editingPlanId, memberId);
        const plans = await CapacityAPI.fetchAll();
        this.tm.capacityPlans = plans;
        const updatedPlan = plans.find(p => p.id === this.editingPlanId);
        if (updatedPlan) {
          this.currentPlan = JSON.parse(JSON.stringify(updatedPlan));
        }
      } else {
        this.currentPlan.teamMembers = this.currentPlan.teamMembers.filter(m => m.id !== memberId);
      }

      this.renderTeamMembers();
      await this.tm.capacityModule?.load();
      showToast('Team member removed', 'success');
    } catch (error) {
      console.error('Error removing team member:', error);
      showToast('Error removing team member', 'error');
    }
  }

  showImportAssigneesForm() {
    const container = document.getElementById('capacitySidenav_memberForm');
    if (!container) return;

    const assignees = this.tm.projectConfig?.assignees || [];
    const existingNames = (this.currentPlan.teamMembers || []).map(m => m.name.toLowerCase());
    const availableAssignees = assignees.filter(name => !existingNames.includes(name.toLowerCase()));

    if (availableAssignees.length === 0) {
      container.innerHTML = `
        <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-2 border border-gray-200 dark:border-gray-600">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            All assignees are already added or no assignees configured.
          </div>
          <button type="button" onclick="taskManager.capacitySidenavModule.cancelMemberForm()"
                  class="mt-2 px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Close</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-2 border border-gray-200 dark:border-gray-600">
        <div class="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Import Assignees</div>
        <div class="space-y-1 max-h-40 overflow-y-auto">
          ${availableAssignees.map(name => `
            <label class="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
              <input type="checkbox" class="import-assignee-cb rounded" value="${escapeHtml(name)}" checked>
              <span class="text-sm text-gray-700 dark:text-gray-300">${escapeHtml(name)}</span>
            </label>
          `).join('')}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Default: 8h/day, Mon-Fri</div>
        <div class="flex gap-2 mt-2">
          <button type="button" onclick="taskManager.capacitySidenavModule.applyImportAssignees()"
                  class="px-3 py-1 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded hover:bg-gray-700 dark:hover:bg-gray-300">Import</button>
          <button type="button" onclick="taskManager.capacitySidenavModule.cancelMemberForm()"
                  class="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
        </div>
      </div>
    `;
  }

  async applyImportAssignees() {
    const selectedNames = Array.from(document.querySelectorAll('.import-assignee-cb:checked')).map(cb => cb.value);
    if (selectedNames.length === 0) {
      this.cancelMemberForm();
      return;
    }

    try {
      for (const name of selectedNames) {
        const memberData = {
          name,
          hoursPerDay: 8,
          workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        };

        if (this.editingPlanId) {
          await CapacityAPI.createMember(this.editingPlanId, memberData);
        } else {
          memberData.id = 'temp_' + crypto.randomUUID().substring(0, 8);
          this.currentPlan.teamMembers.push(memberData);
        }
      }

      if (this.editingPlanId) {
        const plans = await CapacityAPI.fetchAll();
        this.tm.capacityPlans = plans;
        const updatedPlan = plans.find(p => p.id === this.editingPlanId);
        if (updatedPlan) {
          this.currentPlan = JSON.parse(JSON.stringify(updatedPlan));
        }
      }

      this.cancelMemberForm();
      this.renderTeamMembers();
      await this.tm.capacityModule?.load();
      showToast(`Imported ${selectedNames.length} assignee(s)`, 'success');
    } catch (error) {
      console.error('Error importing assignees:', error);
      showToast('Error importing assignees', 'error');
    }
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.showSaveStatus('Saving...');
    this.autoSaveTimeout = setTimeout(() => this.save(), 1000);
  }

  async save() {
    this.currentPlan.title = document.getElementById('capacitySidenavTitle').value.trim();
    this.currentPlan.date = document.getElementById('capacitySidenavDate').value;
    const budgetVal = document.getElementById('capacitySidenavBudget').value;
    this.currentPlan.budgetHours = budgetVal ? parseInt(budgetVal) : null;

    if (!this.currentPlan.title) {
      this.showSaveStatus('Title required');
      return;
    }

    try {
      if (this.editingPlanId) {
        await CapacityAPI.update(this.editingPlanId, {
          title: this.currentPlan.title,
          date: this.currentPlan.date,
          budgetHours: this.currentPlan.budgetHours
        });
        this.showSaveStatus('Saved');
      } else {
        const response = await CapacityAPI.create({
          title: this.currentPlan.title,
          date: this.currentPlan.date,
          budgetHours: this.currentPlan.budgetHours
        });
        const result = await response.json();
        this.editingPlanId = result.id;
        this.currentPlan.id = result.id;

        // If we had temp team members, add them now
        for (const member of this.currentPlan.teamMembers) {
          if (member.id.startsWith('temp_')) {
            const { id, ...memberData } = member;
            await CapacityAPI.createMember(this.editingPlanId, memberData);
          }
        }

        this.showSaveStatus('Created');
        document.getElementById('capacitySidenavHeader').textContent = 'Edit Capacity Plan';
        document.getElementById('capacitySidenavDelete').classList.remove('hidden');
        this.tm.selectedCapacityPlanId = result.id;
      }
      await this.tm.capacityModule?.load();
    } catch (error) {
      console.error('Error saving capacity plan:', error);
      this.showSaveStatus('Error');
      showToast('Error saving capacity plan', 'error');
    }
  }

  async handleDelete() {
    if (!this.editingPlanId) return;
    if (!confirm(`Delete "${this.currentPlan.title}"? This cannot be undone.`)) return;

    try {
      await CapacityAPI.delete(this.editingPlanId);
      showToast('Capacity plan deleted', 'success');
      this.tm.selectedCapacityPlanId = null;
      await this.tm.capacityModule?.load();
      this.close();
    } catch (error) {
      console.error('Error deleting capacity plan:', error);
      showToast('Error deleting capacity plan', 'error');
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById('capacitySidenavSaveStatus');
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove('hidden', 'text-green-600', 'text-red-500', 'text-gray-500');

    if (text === 'Saved' || text === 'Created') {
      statusEl.classList.add('text-green-600', 'dark:text-green-400');
    } else if (text === 'Error' || text === 'Title required') {
      statusEl.classList.add('text-red-500');
    } else {
      statusEl.classList.add('text-gray-500', 'dark:text-gray-400');
    }

    if (text === 'Saved' || text === 'Created' || text === 'Error') {
      setTimeout(() => statusEl.classList.add('hidden'), 2000);
    }
  }
}

export default CapacitySidenavModule;
