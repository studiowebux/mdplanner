// Milestone Sidenav Module
// Slide-in panel for milestone creation and editing

import { Sidenav } from '../ui/sidenav.js';
import { MilestonesAPI } from '../api.js';
import { showToast } from '../ui/toast.js';

export class MilestoneSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingMilestoneId = null;
    this.autoSaveTimeout = null;
  }

  bindEvents() {
    // Close button
    document.getElementById('milestoneSidenavClose')?.addEventListener('click', () => {
      this.close();
    });

    // Cancel button
    document.getElementById('milestoneSidenavCancel')?.addEventListener('click', () => {
      this.close();
    });

    // Delete button
    document.getElementById('milestoneSidenavDelete')?.addEventListener('click', () => {
      this.handleDelete();
    });

    // Form submit
    document.getElementById('milestoneSidenavForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.save();
    });

    // Auto-save on input changes
    const inputs = ['milestoneSidenavName', 'milestoneSidenavTarget',
                    'milestoneSidenavStatus', 'milestoneSidenavDescription'];
    inputs.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        if (this.editingMilestoneId) {
          this.scheduleAutoSave();
        }
      });
      document.getElementById(id)?.addEventListener('change', () => {
        if (this.editingMilestoneId) {
          this.scheduleAutoSave();
        }
      });
    });
  }

  openNew() {
    this.editingMilestoneId = null;

    // Update header
    document.getElementById('milestoneSidenavHeader').textContent = 'New Milestone';

    // Reset form
    this.clearForm();

    // Hide delete button and progress
    document.getElementById('milestoneSidenavDelete').classList.add('hidden');
    document.getElementById('milestoneSidenavProgress').classList.add('hidden');

    // Open sidenav
    Sidenav.open('milestoneSidenav');
  }

  openEdit(milestoneId) {
    const milestone = this.tm.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    this.editingMilestoneId = milestoneId;

    // Update header
    document.getElementById('milestoneSidenavHeader').textContent = 'Edit Milestone';

    // Fill form
    this.fillForm(milestone);

    // Show delete button and progress
    document.getElementById('milestoneSidenavDelete').classList.remove('hidden');
    this.renderProgress(milestone);

    // Open sidenav
    Sidenav.open('milestoneSidenav');
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    Sidenav.close('milestoneSidenav');
    this.editingMilestoneId = null;
  }

  clearForm() {
    document.getElementById('milestoneSidenavName').value = '';
    document.getElementById('milestoneSidenavTarget').value = '';
    document.getElementById('milestoneSidenavStatus').value = 'pending';
    document.getElementById('milestoneSidenavDescription').value = '';
  }

  fillForm(milestone) {
    document.getElementById('milestoneSidenavName').value = milestone.name || '';
    document.getElementById('milestoneSidenavTarget').value = milestone.target || '';
    document.getElementById('milestoneSidenavStatus').value = milestone.status || 'pending';
    document.getElementById('milestoneSidenavDescription').value = milestone.description || '';
  }

  renderProgress(milestone) {
    const container = document.getElementById('milestoneSidenavProgress');
    container.classList.remove('hidden');

    const progressBar = document.getElementById('milestoneSidenavProgressBar');
    const progressText = document.getElementById('milestoneSidenavProgressText');

    progressBar.style.width = `${milestone.progress || 0}%`;
    progressText.textContent = `${milestone.completedCount || 0}/${milestone.taskCount || 0} tasks (${milestone.progress || 0}%)`;
  }

  getFormData() {
    return {
      name: document.getElementById('milestoneSidenavName').value.trim(),
      target: document.getElementById('milestoneSidenavTarget').value || null,
      status: document.getElementById('milestoneSidenavStatus').value,
      description: document.getElementById('milestoneSidenavDescription').value.trim() || null
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

    try {
      if (this.editingMilestoneId) {
        await MilestonesAPI.update(this.editingMilestoneId, data);
        this.showSaveStatus('Saved');
      } else {
        const response = await MilestonesAPI.create(data);
        const result = await response.json();
        this.editingMilestoneId = result.id;
        this.showSaveStatus('Created');

        // Update header and show delete button
        document.getElementById('milestoneSidenavHeader').textContent = 'Edit Milestone';
        document.getElementById('milestoneSidenavDelete').classList.remove('hidden');
      }

      // Reload and re-render
      await this.tm.milestonesModule.load();
    } catch (error) {
      console.error('Error saving milestone:', error);
      this.showSaveStatus('Error');
      showToast('Error saving milestone', 'error');
    }
  }

  async handleDelete() {
    if (!this.editingMilestoneId) return;

    const milestone = this.tm.milestones.find(m => m.id === this.editingMilestoneId);
    if (!milestone) return;

    if (!confirm(`Delete "${milestone.name}"? This cannot be undone.`)) return;

    try {
      await MilestonesAPI.delete(this.editingMilestoneId);
      showToast('Milestone deleted', 'success');
      await this.tm.milestonesModule.load();
      this.close();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      showToast('Error deleting milestone', 'error');
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById('milestoneSidenavSaveStatus');
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove('hidden', 'text-green-600', 'text-red-500', 'text-gray-500');

    if (text === 'Saved' || text === 'Created') {
      statusEl.classList.add('text-green-600', 'dark:text-green-400');
    } else if (text === 'Error' || text === 'Name required') {
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

export default MilestoneSidenavModule;
