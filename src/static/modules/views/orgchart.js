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
      if (node.department === department) {
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

    const deptColor = this.getDepartmentColor(node.department);
    nodeEl.innerHTML = `
      <div class="orgchart-node-header" style="border-left: 4px solid ${deptColor};">
        <div class="orgchart-drag-handle" title="Drag to change reporting structure">⋮⋮</div>
        <div class="orgchart-node-name">${escapeHtml(node.name)}</div>
        <div class="orgchart-node-title">${escapeHtml(node.title)}</div>
        <div class="orgchart-node-dept">${escapeHtml(node.department)}</div>
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
      filteredMembers = this.members.filter(m => m.department === this.currentDepartment);
    }

    if (filteredMembers.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Group by department
    const byDepartment = {};
    filteredMembers.forEach(member => {
      const dept = member.department || 'No Department';
      if (!byDepartment[dept]) byDepartment[dept] = [];
      byDepartment[dept].push(member);
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

  // Export to PNG using Canvas API
  async exportToPNG() {
    const container = document.getElementById('orgchartTreeContent');
    if (!container || container.children.length === 0) {
      alert('No org chart to export. Add members first.');
      return;
    }

    try {
      // Create a canvas to render the org chart
      const treeEl = container.querySelector('.orgchart-tree') || container.querySelector('.orgchart-card-grid');
      if (!treeEl) return;

      // Use SVG foreignObject approach for HTML-to-Canvas
      const rect = treeEl.getBoundingClientRect();
      const width = Math.max(rect.width, 800);
      const height = Math.max(rect.height, 600);

      // Clone the element for export (to avoid modifying the visible one)
      const clone = treeEl.cloneNode(true);
      clone.style.transform = 'none';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);

      // Get computed styles
      const styles = this.getExportStyles();

      // Create SVG with foreignObject
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <style>${styles}</style>
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="background: white; padding: 20px;">
              ${clone.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      document.body.removeChild(clone);

      // Convert SVG to blob and download
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((pngBlob) => {
          const pngUrl = URL.createObjectURL(pngBlob);
          const link = document.createElement('a');
          link.download = `orgchart-${new Date().toISOString().split('T')[0]}.png`;
          link.href = pngUrl;
          link.click();
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.src = url;

    } catch (error) {
      console.error('Error exporting to PNG:', error);
      alert('Export failed. Try using Print to PDF instead.');
    }
  }

  // Export to PDF using browser print
  exportToPDF() {
    const container = document.getElementById('orgchartTreeContent');
    if (!container || container.children.length === 0) {
      alert('No org chart to export. Add members first.');
      return;
    }

    // Create print-specific window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF.');
      return;
    }

    const treeEl = container.querySelector('.orgchart-tree') || container.querySelector('.orgchart-card-grid');
    if (!treeEl) return;

    const styles = this.getExportStyles();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Org Chart Export</title>
        <style>
          ${styles}
          @page {
            size: landscape;
            margin: 1cm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
            padding: 20px;
          }
          .orgchart-tree {
            transform: none !important;
          }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <h1 style="margin-bottom: 20px; font-size: 24px;">Org Chart</h1>
        <p style="margin-bottom: 20px; color: #666; font-size: 12px;">Exported: ${new Date().toLocaleDateString()}</p>
        ${treeEl.outerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
      </html>
    `);
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
      .orgchart-node.level-0 {
        background-color: #3b82f6;
        border-color: #3b82f6;
        color: white;
      }
      .orgchart-node.level-0 .orgchart-node-name,
      .orgchart-node.level-0 .orgchart-node-title,
      .orgchart-node.level-0 .orgchart-node-dept {
        color: white;
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

    // Root drop zone: make member root by dropping on container background
    const container = document.getElementById('orgchartContainer');
    if (container) {
      container.addEventListener('dragover', (e) => {
        if (this.draggedMemberId && !e.target.closest('.orgchart-node')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          container.classList.add('orgchart-root-drop-zone');
        }
      });
      container.addEventListener('dragleave', (e) => {
        if (!container.contains(e.relatedTarget)) {
          container.classList.remove('orgchart-root-drop-zone');
        }
      });
      container.addEventListener('drop', async (e) => {
        if (this.draggedMemberId && !e.target.closest('.orgchart-node')) {
          e.preventDefault();
          container.classList.remove('orgchart-root-drop-zone');
          await this.makeRoot(this.draggedMemberId);
        }
      });
    }
  }
}
