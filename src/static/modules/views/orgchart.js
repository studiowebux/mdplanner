/**
 * OrgChart View Module.
 * Displays organizational chart with Tree and Card views.
 * Pattern: ViewModule with selector, tree rendering, and sidenav integration.
 * Features: Drag-and-drop hierarchy reordering, PNG/PDF export.
 */
import { OrgChartAPI } from '../api.js';
import { escapeHtml } from '../utils.js';

export class OrgChartModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.members = [];
    this.tree = [];
    this.departments = [];
    this.currentView = 'tree';
    this.currentDepartment = '';
    this.zoom = 1;
    this.offset = { x: 0, y: 0 };
    // Drag-and-drop state
    this.draggedMemberId = null;
    this.dragOverMemberId = null;
  }

  async load() {
    try {
      const [members, tree, departments] = await Promise.all([
        OrgChartAPI.fetchAll(),
        OrgChartAPI.fetchTree(),
        OrgChartAPI.getDepartments()
      ]);
      this.members = members;
      this.tree = tree;
      this.departments = departments;
      this.renderDepartmentFilter();
      this.render();
      this.renderSummary();
    } catch (error) {
      console.error('Error loading org chart:', error);
    }
  }

  renderDepartmentFilter() {
    const filter = document.getElementById('orgchartDepartmentFilter');
    if (!filter) return;

    filter.innerHTML = '<option value="">All Departments</option>';
    this.departments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      filter.appendChild(option);
    });
    filter.value = this.currentDepartment;
  }

  renderSummary() {
    const totalEl = document.getElementById('orgchartTotalMembers');
    const deptsEl = document.getElementById('orgchartTotalDepartments');

    if (totalEl) totalEl.textContent = this.members.length;
    if (deptsEl) deptsEl.textContent = this.departments.length;
  }

  render() {
    if (this.currentView === 'tree') {
      this.renderTreeView();
    } else {
      this.renderCardView();
    }
  }

  renderTreeView() {
    const container = document.getElementById('orgchartTreeContent');
    const emptyState = document.getElementById('orgchartEmptyState');

    if (!container) return;

    // Filter tree by department if selected
    let filteredTree = this.tree;
    if (this.currentDepartment) {
      filteredTree = this.filterTreeByDepartment(this.tree, this.currentDepartment);
    }

    if (filteredTree.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = '';
    const treeContainer = document.createElement('div');
    treeContainer.className = 'orgchart-tree';

    filteredTree.forEach(root => {
      const rootEl = this.renderTreeNode(root, 0);
      treeContainer.appendChild(rootEl);
    });

    container.appendChild(treeContainer);
    this.setupPanning();
  }

  filterTreeByDepartment(nodes, department) {
    const filtered = [];
    for (const node of nodes) {
      if (node.departments && node.departments.includes(department)) {
        filtered.push({
          ...node,
          children: this.filterTreeByDepartment(node.children || [], department)
        });
      } else {
        const childFiltered = this.filterTreeByDepartment(node.children || [], department);
        if (childFiltered.length > 0) {
          filtered.push({
            ...node,
            children: childFiltered
          });
        }
      }
    }
    return filtered;
  }

  renderTreeNode(node, level) {
    const wrapper = document.createElement('div');
    wrapper.className = 'orgchart-node-wrapper';

    const nodeEl = document.createElement('div');
    nodeEl.className = `orgchart-node level-${level}`;
    nodeEl.dataset.memberId = node.id;
    nodeEl.draggable = true;

    const deptColor = this.getDepartmentColor(node.departments?.[0] || '');
    const deptText = node.departments?.join(', ') || '';
    nodeEl.innerHTML = `
      <div class="orgchart-node-header" style="border-left: 4px solid ${deptColor};">
        <div class="orgchart-drag-handle" title="Drag to change reporting structure">⋮⋮</div>
        <div class="orgchart-node-name">${escapeHtml(node.name)}</div>
        <div class="orgchart-node-title">${escapeHtml(node.title)}</div>
        <div class="orgchart-node-dept">${escapeHtml(deptText)}</div>
      </div>
    `;

    // Click handler (only if not dragging)
    nodeEl.addEventListener('click', (e) => {
      if (!this.isDragging) {
        this.openMemberSidenav(node.id);
      }
    });

    // Drag-and-drop handlers
    nodeEl.addEventListener('dragstart', (e) => this.handleDragStart(e, node.id));
    nodeEl.addEventListener('dragend', (e) => this.handleDragEnd(e));
    nodeEl.addEventListener('dragover', (e) => this.handleDragOver(e, node.id));
    nodeEl.addEventListener('dragenter', (e) => this.handleDragEnter(e, node.id));
    nodeEl.addEventListener('dragleave', (e) => this.handleDragLeave(e, node.id));
    nodeEl.addEventListener('drop', (e) => this.handleDrop(e, node.id));

    wrapper.appendChild(nodeEl);

    if (node.children && node.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'orgchart-children';

      node.children.forEach(child => {
        childrenContainer.appendChild(this.renderTreeNode(child, level + 1));
      });

      wrapper.appendChild(childrenContainer);
    }

    return wrapper;
  }

  // Drag-and-drop: Check if targetId is a descendant of sourceId (prevents circular refs)
  isDescendantOf(sourceId, targetId) {
    const findNode = (nodes, id) => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const checkDescendants = (node, targetId) => {
      if (!node || !node.children) return false;
      for (const child of node.children) {
        if (child.id === targetId) return true;
        if (checkDescendants(child, targetId)) return true;
      }
      return false;
    };

    const sourceNode = findNode(this.tree, sourceId);
    return checkDescendants(sourceNode, targetId);
  }

  handleDragStart(e, memberId) {
    this.isDragging = true;
    this.draggedMemberId = memberId;
    e.target.classList.add('orgchart-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', memberId);

    // Show the unlink drop zone
    const unlinkZone = document.getElementById('orgchartUnlinkZone');
    if (unlinkZone) {
      unlinkZone.classList.add('active');
    }
  }

  handleDragEnd(e) {
    this.isDragging = false;
    this.draggedMemberId = null;
    this.dragOverMemberId = null;
    e.target.classList.remove('orgchart-dragging');
    // Remove all drop-target classes
    document.querySelectorAll('.orgchart-drop-target, .orgchart-drop-invalid').forEach(el => {
      el.classList.remove('orgchart-drop-target', 'orgchart-drop-invalid');
    });
    // Hide the unlink drop zone
    const unlinkZone = document.getElementById('orgchartUnlinkZone');
    if (unlinkZone) {
      unlinkZone.classList.remove('active', 'drag-over');
    }
  }

  handleDragOver(e, memberId) {
    e.preventDefault();
    if (this.draggedMemberId && memberId !== this.draggedMemberId) {
      // Check if valid drop target (not dropping on self or descendant)
      if (!this.isDescendantOf(this.draggedMemberId, memberId)) {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    }
  }

  handleDragEnter(e, memberId) {
    e.preventDefault();
    if (this.draggedMemberId && memberId !== this.draggedMemberId) {
      const nodeEl = e.target.closest('.orgchart-node');
      if (nodeEl) {
        // Remove from previous
        document.querySelectorAll('.orgchart-drop-target, .orgchart-drop-invalid').forEach(el => {
          el.classList.remove('orgchart-drop-target', 'orgchart-drop-invalid');
        });
        // Add to current
        if (this.isDescendantOf(this.draggedMemberId, memberId)) {
          nodeEl.classList.add('orgchart-drop-invalid');
        } else {
          nodeEl.classList.add('orgchart-drop-target');
        }
        this.dragOverMemberId = memberId;
      }
    }
  }

  handleDragLeave(e, memberId) {
    // Only clear if actually leaving the node (not entering a child)
    const related = e.relatedTarget;
    if (related && e.target.contains(related)) return;
    const nodeEl = e.target.closest('.orgchart-node');
    if (nodeEl) {
      nodeEl.classList.remove('orgchart-drop-target', 'orgchart-drop-invalid');
    }
  }

  async handleDrop(e, targetMemberId) {
    e.preventDefault();
    e.stopPropagation();

    const sourceMemberId = this.draggedMemberId;
    if (!sourceMemberId || sourceMemberId === targetMemberId) return;

    // Prevent dropping on descendants (would create circular reference)
    if (this.isDescendantOf(sourceMemberId, targetMemberId)) {
      console.warn('Cannot drop on descendant - would create circular reference');
      return;
    }

    // Update the member's reportsTo field
    const sourceMember = this.members.find(m => m.id === sourceMemberId);
    if (!sourceMember) return;

    try {
      await OrgChartAPI.update(sourceMemberId, {
        ...sourceMember,
        reportsTo: targetMemberId
      });
      // Reload to reflect changes
      await this.load();
    } catch (error) {
      console.error('Error updating reporting structure:', error);
    }
  }

  // Make a member a root (no manager) by dropping on empty area
  async makeRoot(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member || !member.reportsTo) return;

    try {
      await OrgChartAPI.update(memberId, {
        ...member,
        reportsTo: null
      });
      await this.load();
    } catch (error) {
      console.error('Error making member root:', error);
    }
  }

  renderCardView() {
    const container = document.getElementById('orgchartTreeContent');
    const emptyState = document.getElementById('orgchartEmptyState');

    if (!container) return;

    let filteredMembers = this.members;
    if (this.currentDepartment) {
      filteredMembers = this.members.filter(m => m.departments?.includes(this.currentDepartment));
    }

    if (filteredMembers.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Group by department (members can appear in multiple departments)
    const byDepartment = {};
    filteredMembers.forEach(member => {
      const depts = member.departments?.length ? member.departments : ['No Department'];
      depts.forEach(dept => {
        if (!byDepartment[dept]) byDepartment[dept] = [];
        byDepartment[dept].push(member);
      });
    });

    let html = '<div class="orgchart-card-grid">';

    Object.entries(byDepartment).sort((a, b) => a[0].localeCompare(b[0])).forEach(([dept, members]) => {
      const deptColor = this.getDepartmentColor(dept);
      html += `
        <div class="orgchart-department-section">
          <h3 class="orgchart-department-header" style="border-left: 4px solid ${deptColor};">
            ${escapeHtml(dept)}
            <span class="text-gray-500 dark:text-gray-400 font-normal">(${members.length})</span>
          </h3>
          <div class="orgchart-cards">
      `;

      members.forEach(member => {
        const manager = member.reportsTo
          ? this.members.find(m => m.id === member.reportsTo)
          : null;
        const managerName = manager ? `Reports to: ${escapeHtml(manager.name)}` : '';

        html += `
          <div class="orgchart-card" data-member-id="${member.id}">
            <div class="orgchart-card-name">${escapeHtml(member.name)}</div>
            <div class="orgchart-card-title">${escapeHtml(member.title)}</div>
            ${member.email ? `<div class="orgchart-card-email">${escapeHtml(member.email)}</div>` : ''}
            ${managerName ? `<div class="orgchart-card-reports">${managerName}</div>` : ''}
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Bind click events to cards
    container.querySelectorAll('.orgchart-card').forEach(card => {
      card.addEventListener('click', () => {
        this.openMemberSidenav(card.dataset.memberId);
      });
    });
  }

  getDepartmentColor(department) {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    const index = this.departments.indexOf(department);
    return colors[index % colors.length] || '#6b7280';
  }

  setupPanning() {
    const viewport = document.getElementById('orgchartViewport');
    const container = document.getElementById('orgchartContainer');
    if (!viewport || !container) return;

    let isDragging = false;
    let startX, startY;
    let startTranslateX = 0, startTranslateY = 0;

    container.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.orgchart-node')) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        container.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newTranslateX = startTranslateX + deltaX;
        const newTranslateY = startTranslateY + deltaY;
        viewport.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${this.zoom})`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = 'grab';
        const transform = viewport.style.transform;
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          startTranslateX = parseFloat(match[1]);
          startTranslateY = parseFloat(match[2]);
        }
      }
    });
  }

  openMemberSidenav(memberId) {
    if (this.tm.orgchartSidenavModule) {
      this.tm.orgchartSidenavModule.open(memberId);
    }
  }

  updateView(view) {
    this.currentView = view;
    this.render();
  }

  filterByDepartment(department) {
    this.currentDepartment = department;
    this.render();
  }

  updateZoom(value) {
    this.zoom = parseFloat(value);
    const viewport = document.getElementById('orgchartViewport');
    if (viewport) {
      viewport.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`;
    }
    const zoomLabel = document.getElementById('orgchartZoomLevel');
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
  }

  async addMember() {
    if (this.tm.orgchartSidenavModule) {
      this.tm.orgchartSidenavModule.openNew();
    }
  }

  // Export to SVG
  async exportToPNG() {
    const container = document.getElementById('orgchartTreeContent');
    if (!container || container.children.length === 0) {
      alert('No org chart to export. Add members first.');
      return;
    }

    try {
      const treeEl = container.querySelector('.orgchart-tree') || container.querySelector('.orgchart-card-grid');
      if (!treeEl) return;

      const rect = treeEl.getBoundingClientRect();
      const width = Math.max(rect.width + 40, 800);
      const height = Math.max(rect.height + 40, 600);

      const styles = this.getExportStyles();

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <style>${styles}</style>
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${treeEl.outerHTML}
    </div>
  </foreignObject>
</svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `orgchart-${new Date().toISOString().split('T')[0]}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting to SVG:', error);
      alert('Export failed.');
    }
  }

  // Export to PDF using browser print
  exportToPDF() {
    const container = document.getElementById('orgchartTreeContent');
    if (!container || container.children.length === 0) {
      alert('No org chart to export. Add members first.');
      return;
    }

    const treeEl = container.querySelector('.orgchart-tree') || container.querySelector('.orgchart-card-grid');
    if (!treeEl) return;

    const styles = this.getExportStyles();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Org Chart</title>
  <style>
    * { box-sizing: border-box; }
    ${styles}
    @page {
      size: A4 landscape;
      margin: 1.5cm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: white;
      margin: 0;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header .date {
      color: #6b7280;
      font-size: 12px;
    }
    .orgchart-tree {
      transform: none !important;
    }
    .print-btn {
      padding: 8px 16px;
      background: #111;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .print-btn:hover {
      background: #333;
    }
    @media print {
      .no-print { display: none !important; }
      .header { border-bottom-color: #000; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Organization Chart</h1>
    <div>
      <span class="date">Exported: ${new Date().toLocaleDateString()}</span>
      <button class="print-btn no-print" onclick="window.print()" style="margin-left: 15px;">Print / Save PDF</button>
    </div>
  </div>
  ${treeEl.outerHTML}
</body>
</html>`);
    printWindow.document.close();
  }

  // Get styles needed for export (subset of orgchart.css)
  getExportStyles() {
    return `
      .orgchart-tree {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
        gap: 3rem;
      }
      .orgchart-tree > .orgchart-node-wrapper {
        padding-top: 1.5rem;
        border-top: 1px dashed #e5e7eb;
      }
      .orgchart-tree > .orgchart-node-wrapper:first-child {
        padding-top: 0;
        border-top: none;
      }
      .orgchart-node-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .orgchart-node {
        background-color: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        min-width: 180px;
        max-width: 220px;
      }
      .orgchart-node-header {
        padding-left: 0.5rem;
      }
      .orgchart-node-name {
        font-weight: 600;
        font-size: 0.875rem;
        color: #111827;
        margin-bottom: 0.125rem;
      }
      .orgchart-node-title {
        font-size: 0.75rem;
        color: #6b7280;
        margin-bottom: 0.125rem;
      }
      .orgchart-node-dept {
        font-size: 0.625rem;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .orgchart-children {
        display: flex;
        gap: 1.5rem;
        padding-top: 2rem;
        position: relative;
      }
      .orgchart-children::before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        width: 1px;
        height: 1rem;
        background-color: #e5e7eb;
      }
      .orgchart-children::after {
        content: '';
        position: absolute;
        top: 1rem;
        left: 0;
        right: 0;
        height: 1px;
        background-color: #e5e7eb;
      }
      .orgchart-children > .orgchart-node-wrapper {
        position: relative;
      }
      .orgchart-children > .orgchart-node-wrapper::before {
        content: '';
        position: absolute;
        top: -1rem;
        left: 50%;
        width: 1px;
        height: 1rem;
        background-color: #e5e7eb;
      }
      .orgchart-drag-handle {
        display: none;
      }
      .orgchart-card-grid {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      .orgchart-department-section {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
      }
      .orgchart-department-header {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
        padding: 0.75rem 1rem;
        background-color: #f9fafb;
      }
      .orgchart-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
        padding: 1rem;
      }
      .orgchart-card {
        background-color: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
      }
      .orgchart-card-name {
        font-weight: 600;
        font-size: 0.9375rem;
        color: #111827;
        margin-bottom: 0.25rem;
      }
      .orgchart-card-title {
        font-size: 0.8125rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
      }
      .orgchart-card-email {
        font-size: 0.75rem;
        color: #3b82f6;
        margin-bottom: 0.25rem;
      }
      .orgchart-card-reports {
        font-size: 0.6875rem;
        color: #6b7280;
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid #e5e7eb;
      }
    `;
  }

  bindEvents() {
    document.getElementById('addOrgchartMemberBtn')?.addEventListener('click', () => this.addMember());
    document.getElementById('orgchartViewToggle')?.addEventListener('change', (e) => this.updateView(e.target.value));
    document.getElementById('orgchartDepartmentFilter')?.addEventListener('change', (e) => this.filterByDepartment(e.target.value));
    document.getElementById('orgchartZoom')?.addEventListener('input', (e) => this.updateZoom(e.target.value));
    document.getElementById('orgchartExportPNG')?.addEventListener('click', () => this.exportToPNG());
    document.getElementById('orgchartExportPDF')?.addEventListener('click', () => this.exportToPDF());

    // Dedicated unlink drop zone
    const unlinkZone = document.getElementById('orgchartUnlinkZone');
    if (unlinkZone) {
      unlinkZone.addEventListener('dragover', (e) => {
        if (this.draggedMemberId) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      });
      unlinkZone.addEventListener('dragenter', (e) => {
        if (this.draggedMemberId) {
          e.preventDefault();
          unlinkZone.classList.add('drag-over');
        }
      });
      unlinkZone.addEventListener('dragleave', (e) => {
        unlinkZone.classList.remove('drag-over');
      });
      unlinkZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlinkZone.classList.remove('drag-over');
        if (this.draggedMemberId) {
          await this.makeRoot(this.draggedMemberId);
        }
      });
    }

    // Container drop zone for making root
    const container = document.getElementById('orgchartContainer');
    if (container) {
      container.addEventListener('dragover', (e) => {
        if (this.draggedMemberId) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      });
      container.addEventListener('drop', async (e) => {
        if (this.draggedMemberId && !e.target.closest('.orgchart-node')) {
          e.preventDefault();
          e.stopPropagation();
          await this.makeRoot(this.draggedMemberId);
        }
      });
    }
  }
}
