import { C4API } from '../api.js';

export class C4Module {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async load() {
    try {
      const data = await C4API.fetchAll();
      this.tm.c4Components = data.components || [];
    } catch (error) {
      console.error('Failed to load C4 components:', error);
      this.tm.c4Components = this.getDefault();
    }
    this.validate();

    // Auto-spread overlapping components at initial level
    const levelComponents = this.getCurrentLevelComponents();
    if (this.hasOverlappingComponents(levelComponents)) {
      this.spreadComponents(levelComponents);
      this.save();
    }

    this.render();

    setTimeout(() => {
      const resetBtn = document.getElementById('c4ResetViewBtn');
      if (resetBtn && !resetBtn.hasAttribute('data-listener-bound')) {
        resetBtn.addEventListener('click', () => this.resetView());
        resetBtn.setAttribute('data-listener-bound', 'true');
      }
    }, 100);
  }

  getDefault() {
    return [
      {
        id: '1',
        name: 'Web Application',
        level: 'context',
        type: 'System',
        technology: 'React, Node.js',
        description: 'Main web application for task management',
        position: { x: 300, y: 200 },
        connections: [],
        children: ['2', '3', '4']
      },
      {
        id: '2',
        name: 'Frontend',
        level: 'container',
        type: 'Container',
        technology: 'React',
        description: 'User interface layer',
        position: { x: 200, y: 100 },
        connections: [{ target: 'Backend API', label: 'API calls' }],
        parent: '1',
        children: []
      },
      {
        id: '3',
        name: 'Backend API',
        level: 'container',
        type: 'Container',
        technology: 'Node.js, Deno',
        description: 'REST API for data management',
        position: { x: 400, y: 100 },
        connections: [{ target: 'Database', label: 'reads/writes' }],
        parent: '1',
        children: []
      },
      {
        id: '4',
        name: 'Database',
        level: 'container',
        type: 'Container',
        technology: 'File System',
        description: 'Data storage layer',
        position: { x: 300, y: 300 },
        connections: [],
        parent: '1',
        children: []
      }
    ];
  }

  render() {
    const container = document.getElementById('c4ComponentsContainer');
    const emptyState = document.getElementById('c4EmptyState');
    const svg = document.getElementById('c4Connections');

    if (svg) {
      const isDark = document.documentElement.classList.contains('dark');
      const arrowColor = isDark ? '#9ca3af' : '#6b7280';
      svg.innerHTML = `
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7"
                  refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="${arrowColor}" />
          </marker>
        </defs>
      `;
    }

    const currentComponents = this.getCurrentLevelComponents();

    if (!this.tm.c4Components || this.tm.c4Components.length === 0 || currentComponents.length === 0) {
      emptyState.classList.remove('hidden');
      container.classList.add('hidden');

      container.querySelectorAll('[data-c4-id]').forEach(el => {
        if (el._c4Cleanup) el._c4Cleanup();
      });
      container.innerHTML = '';

      emptyState.style.cursor = 'pointer';
      emptyState.onclick = () => this.openModalWithLevel();

      this.updateBreadcrumb();
      return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    container.querySelectorAll('[data-c4-id]').forEach(el => {
      if (el._c4Cleanup) el._c4Cleanup();
    });
    container.innerHTML = '';

    // Double-click to add component (single click is for panning)
    container.ondblclick = (e) => {
      if (!e.target.closest('.c4-component')) {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.tm.c4Zoom - this.tm.c4Offset.x;
        const y = (e.clientY - rect.top) / this.tm.c4Zoom - this.tm.c4Offset.y;
        this.openModalWithLevel(x, y);
      }
    };
    container.onclick = null;

    currentComponents.forEach(component => {
      this.createElement(component, container);
    });

    this.updateBreadcrumb();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.drawConnections(currentComponents);
      });
    });

    if (!this.tm.c4PanningInitialized) {
      this.initializePanning();
      this.initializeDragHandlers();
      this.tm.c4PanningInitialized = true;
    }

    if (this.tm.c4PhysicsEnabled) {
      setTimeout(() => this.initializeForceLayout(currentComponents), 200);
    }
  }

  getCurrentLevelComponents() {
    const hasParentRelationships = this.tm.c4Components.some(c => c.parent);

    if (this.tm.c4NavigationStack.length === 0) {
      // Root level
      if (hasParentRelationships) {
        // Show components without parents
        return this.tm.c4Components.filter(comp => !comp.parent);
      }
      // Fallback: show context-level components
      return this.tm.c4Components.filter(comp => comp.level === 'context');
    } else {
      const currentParentId = this.tm.c4NavigationStack[this.tm.c4NavigationStack.length - 1];
      const currentParent = this.tm.c4Components.find(c => c.id === currentParentId);
      if (!currentParent) return [];

      // Show direct children (components with this as parent)
      const directChildren = this.tm.c4Components.filter(comp => comp.parent === currentParentId);
      if (directChildren.length > 0) {
        return directChildren;
      }

      // Show children listed in parent's children array
      if (currentParent.children && currentParent.children.length > 0) {
        return this.tm.c4Components.filter(comp => currentParent.children.includes(comp.id));
      }

      // No children defined - return empty (don't show unrelated components)
      return [];
    }
  }

  createElement(component, container) {
    const element = document.createElement('div');
    element.className = `c4-component c4-level-${component.level}`;
    element.style.left = `${component.position.x}px`;
    element.style.top = `${component.position.y}px`;
    element.setAttribute('data-c4-id', component.id);

    const canDrillDown = this.canBeDrilledDown(component);

    element.innerHTML = `
      <div class="c4-component-controls" style="position: absolute; top: 4px; right: 4px; display: none; gap: 2px; z-index: 10;">
        <button class="c4-edit-btn" title="Edit" style="background: rgba(0,0,0,0.6); border: none; color: white; width: 20px; height: 20px; border-radius: 3px; cursor: pointer; font-size: 10px;">E</button>
        <button class="c4-delete-btn" title="Delete" style="background: rgba(0,0,0,0.6); border: none; color: white; width: 20px; height: 20px; border-radius: 3px; cursor: pointer; font-size: 10px;">X</button>
      </div>
      <div class="c4-component-type">${component.type}</div>
      <div class="c4-component-title">${component.name}</div>
      ${component.technology ? `<div class="c4-component-description">${component.technology}</div>` : ''}
      <div class="c4-component-description">${component.description}</div>
      ${canDrillDown ? '<div class="c4-component-drilldown">></div>' : ''}
    `;

    element.addEventListener('mouseenter', () => {
      element.querySelector('.c4-component-controls').style.display = 'flex';
    });
    element.addEventListener('mouseleave', () => {
      element.querySelector('.c4-component-controls').style.display = 'none';
    });

    element.querySelector('.c4-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(component);
    });

    element.querySelector('.c4-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${component.name}"? This will also remove any children and connections.`)) {
        this.delete(component.id);
      }
    });

    this.makeDraggable(element, component);

    container.appendChild(element);
  }

  canBeDrilledDown(component) {
    // Check if component has explicit children array
    if (component.children && component.children.length > 0) {
      return true;
    }

    // Check if any components have this as their parent
    if (this.tm.c4Components.some(c => c.parent === component.id)) {
      return true;
    }

    // No explicit children - cannot drill down
    return false;
  }

  drillDown(component) {
    this.stopForceLayout();
    this.tm.c4NavigationStack.push(component.id);
    document.getElementById('c4BackBtn').classList.remove('hidden');

    // Reset view to center when drilling down
    this.resetView();

    // Auto-layout components at the new level if they overlap
    const levelComponents = this.getCurrentLevelComponents();
    if (this.hasOverlappingComponents(levelComponents)) {
      this.spreadComponents(levelComponents);
      this.save();
    }

    this.render();
    document.getElementById('c4Container').style.cursor = 'grab';
  }

  hasOverlappingComponents(components) {
    if (components.length < 2) return false;

    const threshold = 50;
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const dx = Math.abs(components[i].position.x - components[j].position.x);
        const dy = Math.abs(components[i].position.y - components[j].position.y);
        if (dx < threshold && dy < threshold) {
          return true;
        }
      }
    }
    return false;
  }

  spreadComponents(components) {
    const spacingX = 250;
    const spacingY = 180;
    const cols = Math.ceil(Math.sqrt(components.length));
    const startX = 100;
    const startY = 100;

    components.forEach((comp, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      comp.position.x = startX + col * spacingX;
      comp.position.y = startY + row * spacingY;
    });
  }

  getNavigationComponent(index) {
    const id = this.tm.c4NavigationStack[index];
    return this.tm.c4Components.find(c => c.id === id);
  }

  navigateBack() {
    if (this.tm.c4NavigationStack.length > 0) {
      this.stopForceLayout();
      this.tm.c4NavigationStack.pop();
      if (this.tm.c4NavigationStack.length === 0) {
        document.getElementById('c4BackBtn').classList.add('hidden');
      }
      this.resetView();
      this.render();
      document.getElementById('c4Container').style.cursor = 'grab';
    }
  }

  updateBreadcrumb() {
    const breadcrumb = document.getElementById('c4Breadcrumb');
    const levels = ['context', 'container', 'component', 'code'];
    const levelLabels = { context: 'Context', container: 'Container', component: 'Component', code: 'Code' };

    let html = `<span class="c4-breadcrumb-item" onclick="taskManager.c4Module.navigateToRoot()">Context</span>`;

    this.tm.c4NavigationStack.forEach((componentId, index) => {
      const component = this.tm.c4Components.find(c => c.id === componentId);
      if (component) {
        html += `<span class="c4-breadcrumb-separator">/</span>`;
        const levelIndex = levels.indexOf(component.level);
        const nextLevel = levelIndex < levels.length - 1 ? levelLabels[levels[levelIndex + 1]] : '';
        const label = nextLevel ? `${component.name} (${nextLevel})` : component.name;
        html += `<span class="c4-breadcrumb-item" onclick="taskManager.c4Module.navigateToLevel(${index})">${label}</span>`;
      }
    });

    breadcrumb.innerHTML = html;
  }

  navigateToRoot() {
    this.stopForceLayout();
    this.tm.c4NavigationStack = [];
    document.getElementById('c4BackBtn').classList.add('hidden');
    this.resetView();
    this.render();
    document.getElementById('c4Container').style.cursor = 'grab';
  }

  navigateToLevel(index) {
    this.stopForceLayout();
    this.tm.c4NavigationStack = this.tm.c4NavigationStack.slice(0, index + 1);
    if (this.tm.c4NavigationStack.length === 0) {
      document.getElementById('c4BackBtn').classList.add('hidden');
    }
    this.resetView();
    this.render();
    document.getElementById('c4Container').style.cursor = 'grab';
  }

  drawConnections(components) {
    const svg = document.getElementById('c4Connections');
    const isDark = document.documentElement.classList.contains('dark');
    const arrowColor = isDark ? '#9ca3af' : '#6b7280';
    svg.innerHTML = `
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7"
                refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="${arrowColor}" />
        </marker>
      </defs>
    `;

    components.forEach(component => {
      component.connections?.forEach(connection => {
        const targetComponent = components.find(c =>
          c.id === connection.target || c.name === connection.target
        );
        if (targetComponent) {
          this.drawConnection(svg, component, targetComponent, connection.label);
        }
      });
    });
  }

  getRectEdgePoint(centerX, centerY, width, height, targetX, targetY) {
    const dx = targetX - centerX;
    const dy = targetY - centerY;

    if (dx === 0 && dy === 0) return { x: centerX, y: centerY };

    const halfW = width / 2;
    const halfH = height / 2;

    // Calculate intersection with rectangle edges
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let edgeX, edgeY;

    if (absDx * halfH > absDy * halfW) {
      // Intersects left or right edge
      edgeX = centerX + (dx > 0 ? halfW : -halfW);
      edgeY = centerY + dy * (halfW / absDx);
    } else {
      // Intersects top or bottom edge
      edgeX = centerX + dx * (halfH / absDy);
      edgeY = centerY + (dy > 0 ? halfH : -halfH);
    }

    return { x: edgeX, y: edgeY };
  }

  drawConnection(svg, fromComponent, toComponent, label) {
    // Get actual rendered dimensions from DOM elements
    const fromEl = document.querySelector(`[data-c4-id="${fromComponent.id}"]`);
    const toEl = document.querySelector(`[data-c4-id="${toComponent.id}"]`);

    const fromWidth = fromEl ? fromEl.offsetWidth : 180;
    const fromHeight = fromEl ? fromEl.offsetHeight : 120;
    const toWidth = toEl ? toEl.offsetWidth : 180;
    const toHeight = toEl ? toEl.offsetHeight : 120;

    const fromCenterX = fromComponent.position.x + fromWidth / 2;
    const fromCenterY = fromComponent.position.y + fromHeight / 2;
    const toCenterX = toComponent.position.x + toWidth / 2;
    const toCenterY = toComponent.position.y + toHeight / 2;

    if (fromCenterX === toCenterX && fromCenterY === toCenterY) return;

    const fromEdge = this.getRectEdgePoint(fromCenterX, fromCenterY, fromWidth, fromHeight, toCenterX, toCenterY);
    const toEdge = this.getRectEdgePoint(toCenterX, toCenterY, toWidth, toHeight, fromCenterX, fromCenterY);

    const fromX = fromEdge.x;
    const fromY = fromEdge.y;
    const toX = toEdge.x;
    const toY = toEdge.y;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', toX);
    line.setAttribute('y2', toY);
    line.setAttribute('class', 'c4-connection');
    svg.appendChild(line);

    if (label) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const offsetX = Math.sin(angle) * 12;
      const offsetY = -Math.cos(angle) * 12;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX + offsetX);
      text.setAttribute('y', midY + offsetY);
      text.setAttribute('class', 'c4-connection-label');
      text.textContent = label;
      svg.appendChild(text);
    }
  }

  updateZoom(value) {
    this.tm.c4Zoom = parseFloat(value);
    document.getElementById('c4ZoomLevel').textContent = `${Math.round(this.tm.c4Zoom * 100)}%`;
    this.updateViewTransform();
  }

  makeDraggable(element, component) {
    const onMouseDown = (e) => {
      if (e.target.classList.contains('c4-component-drilldown') ||
          e.target.classList.contains('c4-edit-btn') ||
          e.target.classList.contains('c4-delete-btn')) return;

      this.tm._c4ActiveDrag = {
        element,
        component,
        startX: e.clientX,
        startY: e.clientY,
        initialX: component.position.x,
        initialY: component.position.y,
        dragStarted: false
      };

      this.stopForceLayout();

      e.preventDefault();
      e.stopPropagation();
    };

    element.addEventListener('mousedown', onMouseDown);

    element._c4Cleanup = () => {
      element.removeEventListener('mousedown', onMouseDown);
    };
  }

  initializeDragHandlers() {
    if (this.tm._c4DragHandlersInitialized) return;
    this.tm._c4DragHandlersInitialized = true;

    document.addEventListener('mousemove', (e) => {
      if (!this.tm._c4ActiveDrag) return;

      const drag = this.tm._c4ActiveDrag;
      const deltaX = (e.clientX - drag.startX) / this.tm.c4Zoom;
      const deltaY = (e.clientY - drag.startY) / this.tm.c4Zoom;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!drag.dragStarted && distance > 5) {
        drag.dragStarted = true;
        drag.element.style.cursor = 'grabbing';
        drag.element.classList.add('dragging');
        drag.element.style.transition = 'none';
      }

      if (drag.dragStarted) {
        drag.component.position.x = drag.initialX + deltaX;
        drag.component.position.y = drag.initialY + deltaY;
        drag.element.style.left = `${drag.component.position.x}px`;
        drag.element.style.top = `${drag.component.position.y}px`;
        if (this.tm._c4ConnectionFrame) {
          cancelAnimationFrame(this.tm._c4ConnectionFrame);
        }
        this.tm._c4ConnectionFrame = requestAnimationFrame(() => {
          this.drawConnections(this.getCurrentLevelComponents());
        });
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!this.tm._c4ActiveDrag) return;

      const drag = this.tm._c4ActiveDrag;
      const wasDragging = drag.dragStarted;
      const component = drag.component;

      drag.element.style.cursor = 'pointer';
      drag.element.classList.remove('dragging');
      drag.element.style.transition = '';
      this.tm._c4ActiveDrag = null;

      if (!wasDragging && this.canBeDrilledDown(component)) {
        e.stopPropagation();
        this.drillDown(component);
        return;
      }

      if (wasDragging) {
        this.save();
        this.drawConnections(this.getCurrentLevelComponents());
      }
    });
  }

  openModal() {
    this.tm.editingC4Component = null;
    document.getElementById('c4ComponentModalTitle').textContent = 'Add C4 Component';
    document.getElementById('c4ComponentIdDisplay')?.classList.add('hidden');
    document.getElementById('c4ComponentForm').reset();
    document.getElementById('c4ComponentLevel').value = this.tm.currentC4Level;
    document.getElementById('c4ComponentType').value = this.getDefaultTypeForLevel(this.tm.currentC4Level);

    document.getElementById('c4ConnectionsForm').innerHTML = '';

    const levelSelect = document.getElementById('c4ComponentLevel');
    if (!levelSelect.hasAttribute('data-change-bound')) {
      levelSelect.addEventListener('change', (e) => {
        document.getElementById('c4ComponentType').value = this.getDefaultTypeForLevel(e.target.value);
      });
      levelSelect.setAttribute('data-change-bound', 'true');
    }
    document.getElementById('c4ComponentModal').classList.remove('hidden');
    document.getElementById('c4ComponentModal').classList.add('flex');

    setTimeout(() => {
      document.querySelectorAll('.c4-target-input').forEach(input => {
        if (!input.hasAttribute('data-autocomplete-setup')) {
          this.setupTargetAutocomplete(input);
          input.setAttribute('data-autocomplete-setup', 'true');
        }
      });
    }, 0);
  }

  openModalWithLevel(x = 300, y = 200) {
    this.tm.editingC4Component = null;
    document.getElementById('c4ComponentModalTitle').textContent = 'Add C4 Component';
    document.getElementById('c4ComponentIdDisplay')?.classList.add('hidden');
    document.getElementById('c4ComponentForm').reset();

    const levels = ['context', 'container', 'component', 'code'];
    let targetLevel = this.tm.currentC4Level;

    if (this.tm.c4NavigationStack.length > 0) {
      const currentParentId = this.tm.c4NavigationStack[this.tm.c4NavigationStack.length - 1];
      const currentParent = this.tm.c4Components.find(c => c.id === currentParentId);
      if (currentParent) {
        const currentIndex = levels.indexOf(currentParent.level);
        if (currentIndex < levels.length - 1) {
          targetLevel = levels[currentIndex + 1];
        } else {
          targetLevel = 'code';
        }
      }
    }

    document.getElementById('c4ComponentLevel').value = targetLevel;
    document.getElementById('c4ComponentType').value = this.getDefaultTypeForLevel(targetLevel);
    document.getElementById('c4ComponentX').value = Math.round(x);
    document.getElementById('c4ComponentY').value = Math.round(y);
    document.getElementById('c4ComponentModal').classList.remove('hidden');
    document.getElementById('c4ComponentModal').classList.add('flex');

    setTimeout(() => {
      document.querySelectorAll('.c4-target-input').forEach(input => {
        if (!input.hasAttribute('data-autocomplete-setup')) {
          this.setupTargetAutocomplete(input);
          input.setAttribute('data-autocomplete-setup', 'true');
        }
      });
    }, 0);
  }

  closeModal() {
    document.getElementById('c4ComponentModal').classList.add('hidden');
    document.getElementById('c4ComponentModal').classList.remove('flex');
  }

  handleSubmit(e) {
    e.preventDefault();

    const component = {
      id: this.tm.editingC4Component?.id || this.generateId(),
      name: document.getElementById('c4ComponentName').value,
      level: document.getElementById('c4ComponentLevel').value,
      type: document.getElementById('c4ComponentType').value,
      technology: document.getElementById('c4ComponentTechnology').value,
      description: document.getElementById('c4ComponentDescription').value,
      position: {
        x: parseInt(document.getElementById('c4ComponentX').value),
        y: parseInt(document.getElementById('c4ComponentY').value)
      },
      connections: this.getConnectionsFromForm(),
      children: this.tm.editingC4Component?.children || []
    };

    if (this.tm.editingC4Component) {
      const index = this.tm.c4Components.findIndex(c => c.id === this.tm.editingC4Component.id);
      if (index !== -1) {
        component.parent = this.tm.c4Components[index].parent;
        this.tm.c4Components[index] = component;
      }
    } else {
      if (this.tm.c4NavigationStack.length > 0) {
        component.parent = this.tm.c4NavigationStack[this.tm.c4NavigationStack.length - 1];
        const parent = this.tm.c4Components.find(c => c.id === component.parent);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          if (!parent.children.includes(component.id)) {
            parent.children.push(component.id);
          }
        }
      }

      this.tm.c4Components.push(component);
    }

    this.closeModal();
    this.render();
    this.save();
  }

  getDefaultTypeForLevel(level) {
    switch (level) {
      case 'context':
        return 'System';
      case 'container':
        return 'Container';
      case 'component':
        return 'Component';
      case 'code':
        return 'Class';
      default:
        return 'System';
    }
  }

  getConnectionsFromForm() {
    const connections = [];
    const connectionRows = document.querySelectorAll('#c4ConnectionsForm .flex');

    connectionRows.forEach(row => {
      const targetInput = row.querySelector('.c4-target-input');
      const labelInput = row.querySelector('input[placeholder="Relationship label"]');
      const target = targetInput ? targetInput.value : '';
      const label = labelInput ? labelInput.value : '';
      if (target && label) {
        connections.push({ target, label });
      }
    });

    return connections;
  }

  addConnectionInput() {
    const container = document.getElementById('c4ConnectionsForm');
    const div = document.createElement('div');
    div.className = 'flex space-x-2';
    div.innerHTML = `
      <div class="flex-1 relative">
        <input type="text" placeholder="Target component name" class="c4-target-input w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm" autocomplete="off">
        <div class="c4-target-dropdown hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-b-md max-h-32 overflow-y-auto z-50"></div>
      </div>
      <input type="text" placeholder="Relationship label" class="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm">
      <button type="button" class="px-2 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);

    this.setupTargetAutocomplete(div.querySelector('.c4-target-input'));
  }

  setupTargetAutocomplete(input) {
    const dropdown = input.nextElementSibling;

    input.addEventListener('input', (e) => {
      const value = e.target.value.toLowerCase();
      const matches = this.tm.c4Components.filter(comp =>
        comp.name.toLowerCase().includes(value) && value.length > 0
      );

      if (matches.length > 0 && value.length > 0) {
        dropdown.innerHTML = matches.map(comp =>
          `<div class="c4-target-dropdown-item" data-id="${comp.id}" data-name="${comp.name}">${comp.name} <span style="opacity:0.6;font-size:10px">(${comp.level})</span></div>`
        ).join('');
        dropdown.classList.remove('hidden');
      } else {
        dropdown.classList.add('hidden');
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => dropdown.classList.add('hidden'), 150);
    });

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.c4-target-dropdown-item');
      if (item) {
        input.value = item.dataset.id;
        input.setAttribute('data-display-name', item.dataset.name);
        dropdown.classList.add('hidden');
        input.focus();
      }
    });
  }

  async save() {
    try {
      await C4API.save({ components: this.tm.c4Components });
    } catch (error) {
      console.error('Failed to save C4 components:', error);
    }
  }

  delete(componentId) {
    const idsToDelete = new Set();
    const collectChildren = (id) => {
      idsToDelete.add(id);
      const comp = this.tm.c4Components.find(c => c.id === id);
      if (comp && comp.children) {
        comp.children.forEach(childId => collectChildren(childId));
      }
    };
    collectChildren(componentId);

    const component = this.tm.c4Components.find(c => c.id === componentId);
    if (component && component.parent) {
      const parent = this.tm.c4Components.find(c => c.id === component.parent);
      if (parent && parent.children) {
        parent.children = parent.children.filter(id => id !== componentId);
      }
    }

    this.tm.c4Components.forEach(comp => {
      if (comp.connections) {
        comp.connections = comp.connections.filter(conn =>
          !idsToDelete.has(conn.target) && !idsToDelete.has(conn.target)
        );
      }
    });

    this.tm.c4Components = this.tm.c4Components.filter(c => !idsToDelete.has(c.id));

    this.save();
    this.render();
  }

  openEditModal(component) {
    this.tm.editingC4Component = component;
    document.getElementById('c4ComponentModalTitle').textContent = 'Edit C4 Component';

    // Show component ID
    const idDisplay = document.getElementById('c4ComponentIdDisplay');
    const idValue = document.getElementById('c4ComponentIdValue');
    if (idDisplay && idValue) {
      idDisplay.classList.remove('hidden');
      idValue.textContent = component.id;
    }

    document.getElementById('c4ComponentName').value = component.name;
    document.getElementById('c4ComponentLevel').value = component.level;
    document.getElementById('c4ComponentType').value = component.type;
    document.getElementById('c4ComponentTechnology').value = component.technology || '';
    document.getElementById('c4ComponentDescription').value = component.description || '';
    document.getElementById('c4ComponentX').value = component.position.x;
    document.getElementById('c4ComponentY').value = component.position.y;

    const connectionsContainer = document.getElementById('c4ConnectionsForm');
    connectionsContainer.innerHTML = '';

    if (component.connections && component.connections.length > 0) {
      component.connections.forEach(conn => {
        const div = document.createElement('div');
        div.className = 'flex space-x-2';
        div.innerHTML = `
          <div class="flex-1 relative">
            <input type="text" placeholder="Target component name" class="c4-target-input w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm" autocomplete="off" value="${conn.target}">
            <div class="c4-target-dropdown hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-b-md max-h-32 overflow-y-auto z-50"></div>
          </div>
          <input type="text" placeholder="Relationship label" class="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm" value="${conn.label}">
          <button type="button" class="px-2 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm" onclick="this.parentElement.remove()">X</button>
        `;
        connectionsContainer.appendChild(div);
        this.setupTargetAutocomplete(div.querySelector('.c4-target-input'));
      });
    }

    document.getElementById('c4ComponentModal').classList.remove('hidden');
    document.getElementById('c4ComponentModal').classList.add('flex');
  }

  generateId() {
    let maxId = 0;
    this.tm.c4Components.forEach(comp => {
      const match = comp.id.match(/c4_component_(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) {
          maxId = num;
        }
      }
    });
    return `c4_component_${maxId + 1}`;
  }

  validate() {
    const seenIds = new Set();
    this.tm.c4Components = this.tm.c4Components.filter(comp => {
      if (seenIds.has(comp.id)) {
        console.warn(`Removing duplicate C4 component with ID: ${comp.id}`);
        return false;
      }
      seenIds.add(comp.id);
      return true;
    });

    this.tm.c4Components.forEach(comp => {
      if (comp.children) {
        comp.children = comp.children.filter(childId =>
          this.tm.c4Components.some(c => c.id === childId)
        );
      }
      if (comp.connections) {
        comp.connections = comp.connections.filter(conn =>
          this.tm.c4Components.some(c => c.id === conn.target || c.name === conn.target)
        );
      }
      if (comp.parent && !this.tm.c4Components.some(c => c.id === comp.parent)) {
        console.warn(`Removing invalid parent reference ${comp.parent} from ${comp.id}`);
        delete comp.parent;
      }
    });

    let offsetX = 100;
    let offsetY = 100;
    this.tm.c4Components.forEach(comp => {
      if (comp.position.x === 0 && comp.position.y === 0) {
        comp.position.x = offsetX;
        comp.position.y = offsetY;
        offsetX += 200;
        if (offsetX > 800) {
          offsetX = 100;
          offsetY += 150;
        }
      }
    });
  }

  initializePanning() {
    const viewport = document.getElementById('c4Viewport');
    const content = document.getElementById('c4Content');
    const container = document.getElementById('c4Container');
    const componentsContainer = document.getElementById('c4ComponentsContainer');

    let isPanning = false;
    let startX, startY, initialOffsetX, initialOffsetY;

    container.addEventListener('mousedown', (e) => {
      // Allow panning when clicking on background elements, not on components
      const isBackground = e.target === container ||
                          e.target === viewport ||
                          e.target === content ||
                          e.target === componentsContainer ||
                          e.target.id === 'c4Connections' ||
                          e.target.tagName === 'svg';

      if (isBackground && !e.target.closest('.c4-component')) {
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        initialOffsetX = this.tm.c4Offset.x;
        initialOffsetY = this.tm.c4Offset.y;

        container.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isPanning) return;

      const deltaX = (e.clientX - startX) / this.tm.c4Zoom;
      const deltaY = (e.clientY - startY) / this.tm.c4Zoom;

      this.tm.c4Offset.x = initialOffsetX + deltaX;
      this.tm.c4Offset.y = initialOffsetY + deltaY;

      this.updateViewTransform();
    });

    document.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        container.style.cursor = 'grab';
      }
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = this.tm.c4Zoom;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.tm.c4Zoom = Math.max(0.25, Math.min(3, this.tm.c4Zoom * zoomFactor));

      const zoomChange = this.tm.c4Zoom / oldZoom;
      this.tm.c4Offset.x = (this.tm.c4Offset.x + mouseX / oldZoom) * zoomChange - mouseX / this.tm.c4Zoom;
      this.tm.c4Offset.y = (this.tm.c4Offset.y + mouseY / oldZoom) * zoomChange - mouseY / this.tm.c4Zoom;

      document.getElementById('c4ZoomLevel').textContent = `${Math.round(this.tm.c4Zoom * 100)}%`;
      document.getElementById('c4Zoom').value = this.tm.c4Zoom;
      this.updateViewTransform();
    });
  }

  updateViewTransform() {
    const content = document.getElementById('c4Content');
    content.style.transform = `translate(${this.tm.c4Offset.x}px, ${this.tm.c4Offset.y}px) scale(${this.tm.c4Zoom})`;
  }

  resetView() {
    this.tm.c4Zoom = 1;
    this.tm.c4Offset = { x: 0, y: 0 };
    document.getElementById('c4ZoomLevel').textContent = '100%';
    document.getElementById('c4Zoom').value = 1;
    this.updateViewTransform();
  }

  toggleViewMode(mode) {
    const diagramContainer = document.getElementById('c4Container');
    const listContainer = document.getElementById('c4ListView');
    const diagramControls = document.getElementById('c4DiagramControls');
    const diagramOptions = document.getElementById('c4DiagramOptions');

    if (mode === 'list') {
      diagramContainer.classList.add('hidden');
      listContainer.classList.remove('hidden');
      diagramControls.classList.add('hidden');
      diagramOptions.classList.add('hidden');
      this.renderListView();
    } else {
      diagramContainer.classList.remove('hidden');
      listContainer.classList.add('hidden');
      diagramControls.classList.remove('hidden');
      diagramOptions.classList.remove('hidden');
    }
  }

  renderListView() {
    const container = document.getElementById('c4ListContent');

    if (!this.tm.c4Components || this.tm.c4Components.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No C4 components yet. Add components to see them here.</p>
        </div>
      `;
      return;
    }

    const hasParentRelationships = this.tm.c4Components.some(c => c.parent);

    if (hasParentRelationships) {
      // Use parent-based nesting
      const rootComponents = this.tm.c4Components.filter(c => !c.parent);
      container.innerHTML = this.renderListItems(rootComponents, 0);
    } else {
      // Use C4 level-based indentation
      container.innerHTML = this.renderListItemsByLevel();
    }

    container.querySelectorAll('.c4-list-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.c4-list-item');
        const children = item.querySelector('.c4-list-children');
        const icon = btn.querySelector('svg');
        if (children) {
          children.classList.toggle('hidden');
          icon.classList.toggle('rotate-90');
        }
      });
    });

    container.querySelectorAll('.c4-list-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const componentId = btn.dataset.componentId;
        const component = this.tm.c4Components.find(c => c.id === componentId);
        if (component) {
          this.openEditModal(component);
        }
      });
    });

    container.querySelectorAll('.c4-list-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const componentId = btn.dataset.componentId;
        const component = this.tm.c4Components.find(c => c.id === componentId);
        if (component && confirm(`Delete "${component.name}"?`)) {
          this.delete(componentId);
          this.renderListView();
        }
      });
    });
  }

  renderListItems(components, level) {
    if (!components || components.length === 0) return '';

    const levelColors = {
      context: 'border-l-gray-800 dark:border-l-gray-200',
      container: 'border-l-gray-600 dark:border-l-gray-400',
      component: 'border-l-gray-400 dark:border-l-gray-500',
      code: 'border-l-gray-300 dark:border-l-gray-600'
    };

    const levelBadgeColors = {
      context: 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800',
      container: 'bg-gray-600 text-white dark:bg-gray-400 dark:text-gray-800',
      component: 'bg-gray-400 text-white dark:bg-gray-500 dark:text-gray-100',
      code: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
    };

    return components.map(component => {
      const children = this.tm.c4Components.filter(c => c.parent === component.id);
      const hasChildren = children.length > 0;
      const borderColor = levelColors[component.level] || levelColors.context;
      const badgeColor = levelBadgeColors[component.level] || levelBadgeColors.context;

      return `
        <div class="c4-list-item border-l-4 ${borderColor} mb-2" style="margin-left: ${level * 20}px;">
          <div class="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-r-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            ${hasChildren ? `
              <button class="c4-list-toggle p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                <svg class="w-4 h-4 text-gray-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            ` : '<div class="w-6"></div>'}
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-gray-100">${component.name}</span>
                <span class="px-2 py-0.5 text-xs rounded ${badgeColor}">${component.level}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${component.type}</span>
              </div>
              ${component.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 truncate">${component.description}</p>` : ''}
              ${component.connections && component.connections.length > 0 ? `
                <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Connects to: ${component.connections.map(c => c.target).join(', ')}
                </div>
              ` : ''}
            </div>
            <div class="flex items-center gap-1">
              <button class="c4-list-edit p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" data-component-id="${component.id}" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="c4-list-delete p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" data-component-id="${component.id}" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
          ${hasChildren ? `<div class="c4-list-children">${this.renderListItems(children, level + 1)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  renderListItemsByLevel() {
    const levels = ['context', 'container', 'component', 'code'];
    const levelIndent = { context: 0, container: 1, component: 2, code: 3 };

    const levelColors = {
      context: 'border-l-gray-800 dark:border-l-gray-200',
      container: 'border-l-gray-600 dark:border-l-gray-400',
      component: 'border-l-gray-400 dark:border-l-gray-500',
      code: 'border-l-gray-300 dark:border-l-gray-600'
    };

    const levelBadgeColors = {
      context: 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800',
      container: 'bg-gray-600 text-white dark:bg-gray-400 dark:text-gray-800',
      component: 'bg-gray-400 text-white dark:bg-gray-500 dark:text-gray-100',
      code: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
    };

    // Sort components by level order
    const sortedComponents = [...this.tm.c4Components].sort((a, b) => {
      return levels.indexOf(a.level) - levels.indexOf(b.level);
    });

    return sortedComponents.map(component => {
      const indent = levelIndent[component.level] || 0;
      const borderColor = levelColors[component.level] || levelColors.context;
      const badgeColor = levelBadgeColors[component.level] || levelBadgeColors.context;

      return `
        <div class="c4-list-item border-l-4 ${borderColor} mb-2" style="margin-left: ${indent * 24}px;">
          <div class="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-r-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <div class="w-6"></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-gray-100">${component.name}</span>
                <span class="px-2 py-0.5 text-xs rounded ${badgeColor}">${component.level}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${component.type}</span>
              </div>
              ${component.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 truncate">${component.description}</p>` : ''}
              ${component.connections && component.connections.length > 0 ? `
                <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Connects to: ${component.connections.map(c => c.target).join(', ')}
                </div>
              ` : ''}
            </div>
            <div class="flex items-center gap-1">
              <button class="c4-list-edit p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" data-component-id="${component.id}" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="c4-list-delete p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" data-component-id="${component.id}" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  triggerAutoLayout() {
    const currentComponents = this.getCurrentLevelComponents();
    if (currentComponents.length > 0) {
      // Get viewport dimensions for centering
      const container = document.getElementById('c4Container');
      const viewportWidth = container ? container.clientWidth : 1200;
      const viewportHeight = container ? container.clientHeight : 600;

      this.applyHierarchicalLayout(currentComponents, viewportWidth, viewportHeight);
      this.updatePositions(currentComponents);
      this.drawConnections(currentComponents);
      this.save();

      // Reset view to show centered components
      this.resetView();
    }
  }

  initializeForceLayout(components) {
    if (!this.tm.c4PhysicsEnabled || components.length === 0) return;

    this.stopForceLayout();

    const container = document.getElementById('c4Container');
    const viewportWidth = container ? container.clientWidth : 1200;
    const viewportHeight = container ? container.clientHeight : 600;
    this.applyHierarchicalLayout(components, viewportWidth, viewportHeight);

    components.forEach(component => {
      if (!component.physics) {
        component.physics = {
          vx: 0,
          vy: 0,
          fx: null,
          fy: null
        };
      }
    });

    this.tm.c4ForceSimulation = {
      components: components,
      alpha: 0.15,
      alphaMin: 0.001,
      alphaDecay: 0.1,
      velocityDecay: 0.9,
      velocityThreshold: 0.05
    };

    this.runForceSimulation();
  }

  applyHierarchicalLayout(components, viewportWidth = 1200, viewportHeight = 600) {
    const nodeSpacing = 250;
    const nodeWidth = 180;
    const nodeHeight = 120;

    // Simple horizontal layout centered in viewport
    const totalWidth = components.length * nodeWidth + (components.length - 1) * (nodeSpacing - nodeWidth);
    const startX = Math.max(50, (viewportWidth - totalWidth) / 2);
    const startY = Math.max(50, (viewportHeight - nodeHeight) / 3);

    components.forEach((comp, index) => {
      comp.position.x = startX + index * nodeSpacing;
      comp.position.y = startY;
    });

    this.adjustForOverlaps(components);
  }

  layoutInRow(components, y, containerWidth, spacing) {
    if (components.length === 0) return;

    const totalWidth = (components.length - 1) * spacing;
    const startX = (containerWidth - totalWidth) / 2;

    components.forEach((comp, index) => {
      comp.position.x = startX + index * spacing;
      comp.position.y = y;
    });
  }

  adjustForOverlaps(components) {
    const componentWidth = 180;
    const componentHeight = 120;
    const minGap = 60;

    const sortedComponents = [...components].sort((a, b) => a.position.y - b.position.y);

    sortedComponents.forEach((comp1, i) => {
      sortedComponents.slice(i + 1).forEach(comp2 => {
        const dx = Math.abs(comp1.position.x - comp2.position.x);
        const dy = Math.abs(comp1.position.y - comp2.position.y);

        const minDx = componentWidth + minGap;
        const minDy = componentHeight + minGap;

        if (dx < minDx && dy < minDy) {
          if (dx < dy) {
            const direction = comp2.position.x > comp1.position.x ? 1 : -1;
            comp2.position.x = comp1.position.x + direction * minDx;
          } else {
            comp2.position.y = comp1.position.y + minDy;
          }
        }
      });
    });
  }

  runForceSimulation() {
    if (!this.tm.c4ForceSimulation || this.tm.c4ForceSimulation.alpha < this.tm.c4ForceSimulation.alphaMin) {
      return;
    }

    const sim = this.tm.c4ForceSimulation;
    const components = sim.components;

    this.applyRepulsionForce(components, sim.alpha);
    this.applyAttractionForce(components, sim.alpha);
    this.applyCenteringForce(components, sim.alpha);

    components.forEach(component => {
      if (component.physics.fx == null) {
        component.physics.vx *= sim.velocityDecay;

        if (Math.abs(component.physics.vx) < sim.velocityThreshold) {
          component.physics.vx = 0;
        } else {
          component.position.x += component.physics.vx;
        }
      } else {
        component.position.x = component.physics.fx;
        component.physics.vx = 0;
      }

      if (component.physics.fy == null) {
        component.physics.vy *= sim.velocityDecay;

        if (Math.abs(component.physics.vy) < sim.velocityThreshold) {
          component.physics.vy = 0;
        } else {
          component.position.y += component.physics.vy;
        }
      } else {
        component.position.y = component.physics.fy;
        component.physics.vy = 0;
      }
    });

    this.updatePositions(components);

    sim.alpha += (sim.alphaMin - sim.alpha) * sim.alphaDecay;

    this.tm.c4AnimationFrame = requestAnimationFrame(() => this.runForceSimulation());
  }

  applyRepulsionForce(components, alpha) {
    const strength = -800;
    const minDistance = 180;

    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const a = components[i];
        const b = components[j];

        let dx = a.position.x - b.position.x;
        let dy = a.position.y - b.position.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          distance = 1;
        }

        if (distance < minDistance) {
          const force = strength * alpha / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          a.physics.vx += fx;
          a.physics.vy += fy;
          b.physics.vx -= fx;
          b.physics.vy -= fy;
        }
      }
    }
  }

  applyAttractionForce(components, alpha) {
    const strength = 0.3;
    const idealDistance = 200;
    const maxDistance = 400;

    components.forEach(component => {
      component.connections?.forEach(connection => {
        const target = components.find(c =>
          c.id === connection.target || c.name === connection.target
        );

        if (target) {
          let dx = target.position.x - component.position.x;
          let dy = target.position.y - component.position.y;
          let dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > maxDistance) {
            const force = strength * alpha * (dist - idealDistance) / dist;
            const fx = dx * force * 0.5;
            const fy = dy * force * 0.5;

            component.physics.vx += fx;
            component.physics.vy += fy;
            target.physics.vx -= fx;
            target.physics.vy -= fy;
          }
        }
      });
    });
  }

  applyCenteringForce(components, alpha) {
    const strength = 0.02;
    const centerX = 400;
    const centerY = 300;

    components.forEach(component => {
      const fx = (centerX - component.position.x) * strength * alpha;
      const fy = (centerY - component.position.y) * strength * alpha;

      component.physics.vx += fx;
      component.physics.vy += fy;
    });
  }

  updatePositions(components) {
    components.forEach(component => {
      const element = document.querySelector(`[data-c4-id="${component.id}"]`);
      if (element) {
        element.style.left = `${component.position.x}px`;
        element.style.top = `${component.position.y}px`;
      }
    });

    this.drawConnections(components);
  }

  stopForceLayout() {
    if (this.tm.c4AnimationFrame) {
      cancelAnimationFrame(this.tm.c4AnimationFrame);
      this.tm.c4AnimationFrame = null;
    }
    this.tm.c4ForceSimulation = null;
  }

  togglePhysics() {
    this.tm.c4PhysicsEnabled = !this.tm.c4PhysicsEnabled;

    if (this.tm.c4PhysicsEnabled) {
      const currentComponents = this.getCurrentLevelComponents();
      this.initializeForceLayout(currentComponents);
    } else {
      this.stopForceLayout();
    }
  }

  bindEvents() {
    document.getElementById('addC4ComponentBtn')
      .addEventListener('click', () => this.openModal());

    document.getElementById('cancelC4ComponentBtn')
      .addEventListener('click', () => this.closeModal());

    document.getElementById('c4ComponentForm')
      .addEventListener('submit', (e) => this.handleSubmit(e));

    document.getElementById('c4ViewMode')
      .addEventListener('change', (e) => this.toggleViewMode(e.target.value));

    const addConnectionBtn = document.getElementById('addC4ConnectionBtn');
    if (addConnectionBtn) {
      addConnectionBtn.addEventListener('click', () => this.addConnectionInput());
    }

    const backBtn = document.getElementById('c4BackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.navigateBack());
    }

    const zoomSlider = document.getElementById('c4Zoom');
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => this.updateZoom(e.target.value));
    }

    const autoLayoutBtn = document.getElementById('c4AutoLayoutBtn');
    if (autoLayoutBtn) {
      autoLayoutBtn.addEventListener('click', () => this.triggerAutoLayout());
    }

    const physicsToggle = document.getElementById('c4PhysicsToggle');
    if (physicsToggle) {
      physicsToggle.addEventListener('change', () => this.togglePhysics());
    }
  }
}
