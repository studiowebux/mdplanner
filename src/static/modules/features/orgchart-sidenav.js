/**
 * OrgChart Sidenav Module.
 * Slide-in panel for org chart member creation and editing.
 * Pattern: SidenavModule with auto-save and CRUD operations.
 */

import { Sidenav } from '../ui/sidenav.js';
import { OrgChartAPI } from '../api.js';
import { showToast } from '../ui/toast.js';

export class OrgChartSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingMemberId = null;
    this.autoSaveTimeout = null;
  }

  bindEvents() {
    // Close button
    document.getElementById('orgchartSidenavClose')?.addEventListener('click', () => {
      this.close();
    });

    // Cancel button
    document.getElementById('orgchartSidenavCancel')?.addEventListener('click', () => {
      this.close();
    });

    // Delete button
    document.getElementById('orgchartSidenavDelete')?.addEventListener('click', () => {
      this.handleDelete();
    });

    // Form submit
    document.getElementById('orgchartSidenavForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.save();
    });

    // Auto-save on input changes
    const inputs = [
      'orgchartSidenavName',
      'orgchartSidenavTitle',
      'orgchartSidenavDepartments',
      'orgchartSidenavReportsTo',
      'orgchartSidenavEmail',
      'orgchartSidenavPhone',
      'orgchartSidenavStartDate',
      'orgchartSidenavNotes'
    ];

    inputs.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        if (this.editingMemberId) {
          this.scheduleAutoSave();
        }
      });
      document.getElementById(id)?.addEventListener('change', () => {
        if (this.editingMemberId) {
          this.scheduleAutoSave();
        }
      });
    });
  }

  openNew() {
    this.editingMemberId = null;

    // Update header
    document.getElementById('orgchartSidenavHeader').textContent = 'New Team Member';

    // Reset form
    this.clearForm();

    // Populate manager dropdown
    this.populateReportsToDropdown();

    // Hide delete button
    document.getElementById('orgchartSidenavDelete').classList.add('hidden');

    // Open sidenav
    Sidenav.open('orgchartSidenav');
  }

  async open(memberId) {
    try {
      const member = await OrgChartAPI.get(memberId);
      if (!member) return;

      this.editingMemberId = memberId;

      // Update header
      document.getElementById('orgchartSidenavHeader').textContent = 'Edit Team Member';

      // Populate manager dropdown
      this.populateReportsToDropdown(memberId);

      // Fill form
      this.fillForm(member);

      // Show delete button
      document.getElementById('orgchartSidenavDelete').classList.remove('hidden');

      // Open sidenav
      Sidenav.open('orgchartSidenav');
    } catch (error) {
      console.error('Error loading member:', error);
      showToast('Error loading member', 'error');
    }
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    Sidenav.close('orgchartSidenav');
    this.editingMemberId = null;
  }

  populateReportsToDropdown(excludeId = null) {
    const select = document.getElementById('orgchartSidenavReportsTo');
    if (!select) return;

    select.innerHTML = '<option value="">None (Top Level)</option>';

    const members = this.tm.orgchartModule?.members || [];
    members
      .filter(m => m.id !== excludeId)
      .forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = `${m.name} (${m.title})`;
        select.appendChild(option);
      });
  }

  clearForm() {
    document.getElementById('orgchartSidenavName').value = '';
    document.getElementById('orgchartSidenavTitle').value = '';
    document.getElementById('orgchartSidenavDepartments').value = '';
    document.getElementById('orgchartSidenavReportsTo').value = '';
    document.getElementById('orgchartSidenavEmail').value = '';
    document.getElementById('orgchartSidenavPhone').value = '';
    document.getElementById('orgchartSidenavStartDate').value = '';
    document.getElementById('orgchartSidenavNotes').value = '';
  }

  fillForm(member) {
    document.getElementById('orgchartSidenavName').value = member.name || '';
    document.getElementById('orgchartSidenavTitle').value = member.title || '';
    document.getElementById('orgchartSidenavDepartments').value = member.departments?.join(', ') || '';
    document.getElementById('orgchartSidenavReportsTo').value = member.reportsTo || '';
    document.getElementById('orgchartSidenavEmail').value = member.email || '';
    document.getElementById('orgchartSidenavPhone').value = member.phone || '';
    document.getElementById('orgchartSidenavStartDate').value = member.startDate || '';
    document.getElementById('orgchartSidenavNotes').value = member.notes || '';
  }

  getFormData() {
    const deptInput = document.getElementById('orgchartSidenavDepartments').value.trim();
    const departments = deptInput
      ? deptInput.split(',').map(d => d.trim()).filter(d => d)
      : [];

    return {
      name: document.getElementById('orgchartSidenavName').value.trim(),
      title: document.getElementById('orgchartSidenavTitle').value.trim(),
      departments,
      reportsTo: document.getElementById('orgchartSidenavReportsTo').value || undefined,
      email: document.getElementById('orgchartSidenavEmail').value.trim() || undefined,
      phone: document.getElementById('orgchartSidenavPhone').value.trim() || undefined,
      startDate: document.getElementById('orgchartSidenavStartDate').value || undefined,
      notes: document.getElementById('orgchartSidenavNotes').value.trim() || undefined
    };
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.showSaveStatus('Saving...');

    this.autoSaveTimeout = setTimeout(async () => {
      await this.save();
    }, 1000);
  }

  async save() {
    const data = this.getFormData();

    if (!data.name) {
      this.showSaveStatus('Name required');
      return;
    }

    if (!data.title) {
      this.showSaveStatus('Title required');
      return;
    }

    if (!data.departments || data.departments.length === 0) {
      this.showSaveStatus('At least one department required');
      return;
    }

    try {
      if (this.editingMemberId) {
        await OrgChartAPI.update(this.editingMemberId, data);
        this.showSaveStatus('Saved');
      } else {
        const response = await OrgChartAPI.create(data);
        const result = await response.json();
        this.editingMemberId = result.id;
        this.showSaveStatus('Created');

        // Update header and show delete button
        document.getElementById('orgchartSidenavHeader').textContent = 'Edit Team Member';
        document.getElementById('orgchartSidenavDelete').classList.remove('hidden');

        // Update dropdown to include new member
        this.populateReportsToDropdown(this.editingMemberId);
      }

      // Reload and re-render
      await this.tm.orgchartModule.load();
    } catch (error) {
      console.error('Error saving member:', error);
      this.showSaveStatus('Error');
      showToast('Error saving team member', 'error');
    }
  }

  async handleDelete() {
    if (!this.editingMemberId) return;

    const member = this.tm.orgchartModule?.members.find(m => m.id === this.editingMemberId);
    if (!member) return;

    if (!confirm(`Delete "${member.name}"? This cannot be undone.`)) return;

    try {
      await OrgChartAPI.delete(this.editingMemberId);
      showToast('Team member deleted', 'success');
      await this.tm.orgchartModule.load();
      this.close();
    } catch (error) {
      console.error('Error deleting member:', error);
      showToast('Error deleting team member', 'error');
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById('orgchartSidenavSaveStatus');
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove('hidden', 'text-green-600', 'text-red-500', 'text-gray-500');

    if (text === 'Saved' || text === 'Created') {
      statusEl.classList.add('text-green-600', 'dark:text-green-400');
    } else if (text === 'Error' || text.includes('required')) {
      statusEl.classList.add('text-red-500');
    } else {
      statusEl.classList.add('text-gray-500', 'dark:text-gray-400');
    }

    if (text === 'Saved' || text === 'Created' || text === 'Error') {
      setTimeout(() => {
        statusEl.classList.add('hidden');
      }, 2000);
    }
  }
}

export default OrgChartSidenavModule;
