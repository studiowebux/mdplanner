import { MindmapsAPI } from '../api.js';
import { escapeHtml } from '../utils.js';

export class MindmapModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.mindmaps = [];
    this.selectedMindmap = null;
    this.editingMindmap = null;
    this.zoom = 1;
    this.offset = { x: 0, y: 0 };
    this.currentLayout = "horizontal";
  }

  async load(autoSelect = true) {
    try {
      this.mindmaps = await MindmapsAPI.fetchAll();
      this.renderSelector();
      if (this.mindmaps.length > 0 && autoSelect) {
        this.select(this.mindmaps[0].id);
      } else if (this.mindmaps.length === 0) {
        this.selectedMindmap = null;
        const content = document.getElementById("mindmapContent");
        const emptyState = document.getElementById("mindmapEmptyState");
        const editBtn = document.getElementById("editMindmapBtn");
        const deleteBtn = document.getElementById("deleteMindmapBtn");

        if (content) content.innerHTML = "";
        if (emptyState) emptyState.style.display = "flex";
        if (editBtn) editBtn.style.display = "none";
        if (deleteBtn) deleteBtn.style.display = "none";
      }
    } catch (error) {
      console.error("Error loading mindmaps:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("mindmapSelector");
    selector.innerHTML = '<option value="">Select Mindmap</option>';

    this.mindmaps.forEach((mindmap) => {
      const option = document.createElement("option");
      option.value = mindmap.id;
      option.textContent = mindmap.title;
      selector.appendChild(option);
    });
  }

  select(mindmapId) {
    const selector = document.getElementById("mindmapSelector");
    if (selector) {
      selector.value = mindmapId;
    }

    if (!mindmapId || mindmapId === "") {
      this.selectedMindmap = null;
      const content = document.getElementById("mindmapContent");
      const emptyState = document.getElementById("mindmapEmptyState");
      const editBtn = document.getElementById("editMindmapBtn");
      const deleteBtn = document.getElementById("deleteMindmapBtn");

      if (content) content.innerHTML = "";
      if (emptyState) emptyState.style.display = "flex";
      if (editBtn) editBtn.style.display = "none";
      if (deleteBtn) deleteBtn.style.display = "none";
      return;
    }

    this.selectedMindmap = this.mindmaps.find((m) => m.id === mindmapId);

    if (this.selectedMindmap) {
      this.render();
      const editBtn = document.getElementById("editMindmapBtn");
      const deleteBtn = document.getElementById("deleteMindmapBtn");
      if (editBtn && deleteBtn) {
        editBtn.style.display = "block";
        deleteBtn.style.display = "block";
      }
    } else {
      const content = document.getElementById("mindmapContent");
      const emptyState = document.getElementById("mindmapEmptyState");
      const editBtn = document.getElementById("editMindmapBtn");
      const deleteBtn = document.getElementById("deleteMindmapBtn");

      if (content) content.innerHTML = "";
      if (emptyState) emptyState.style.display = "flex";
      if (editBtn) editBtn.style.display = "none";
      if (deleteBtn) deleteBtn.style.display = "none";
    }
  }

  render() {
    const content = document.getElementById("mindmapContent");
    const emptyState = document.getElementById("mindmapEmptyState");

    if (!content) {
      console.error("mindmapContent element not found");
      return;
    }

    if (!this.selectedMindmap || this.selectedMindmap.nodes.length === 0) {
      if (emptyState) {
        emptyState.style.display = "flex";
      }
      return;
    }

    if (emptyState) {
      emptyState.style.display = "none";
    }
    content.innerHTML = "";

    this.setupPanning();

    const rootNodes = this.selectedMindmap.nodes.filter(
      (node) => node.level === 0,
    );

    if (rootNodes.length === 0) {
      emptyState.style.display = "flex";
      return;
    }

    this.renderTreeLayout(rootNodes, content);
    // Defer connection drawing to ensure DOM is laid out
    requestAnimationFrame(() => {
      this.drawConnections(content);
    });
  }

  renderTreeLayout(rootNodes, content) {
    const isVertical = this.currentLayout === "vertical";
    const levelSpacing = 180;
    const nodeSpacing = 20;
    const nodeWidth = 150;
    const nodeHeight = 40;

    // First pass: calculate subtree sizes
    rootNodes.forEach((rootNode) => {
      this.calculateSubtreeSize(rootNode, nodeSpacing, nodeWidth, nodeHeight, isVertical);
    });

    // Second pass: position nodes
    if (isVertical) {
      // Vertical: root at top, children below
      let currentX = 100;
      rootNodes.forEach((rootNode) => {
        const subtreeWidth = rootNode._subtreeWidth || nodeWidth;
        const rootX = currentX + subtreeWidth / 2 - nodeWidth / 2;
        this.positionNodeAndChildren(
          rootNode,
          rootX,
          60,
          levelSpacing,
          nodeSpacing,
          content,
          nodeWidth,
          nodeHeight,
        );
        currentX += subtreeWidth + nodeSpacing * 2;
      });
    } else {
      // Horizontal: root on left, children to the right
      let currentY = 60;
      rootNodes.forEach((rootNode) => {
        const subtreeHeight = rootNode._subtreeHeight || nodeHeight;
        const rootY = currentY + subtreeHeight / 2 - nodeHeight / 2;
        this.positionNodeAndChildren(
          rootNode,
          60,
          rootY,
          levelSpacing,
          nodeSpacing,
          content,
          nodeWidth,
          nodeHeight,
        );
        currentY += subtreeHeight + nodeSpacing * 2;
      });
    }
  }

  calculateSubtreeSize(node, nodeSpacing, nodeWidth, nodeHeight, isVertical) {
    const children = this.selectedMindmap.nodes.filter(
      (n) => n.parent === node.id,
    );

    if (children.length === 0) {
      node._subtreeWidth = nodeWidth;
      node._subtreeHeight = nodeHeight;
      return;
    }

    children.forEach((child) => {
      this.calculateSubtreeSize(child, nodeSpacing, nodeWidth, nodeHeight, isVertical);
    });

    if (isVertical) {
      // Vertical: width = sum of children widths
      const totalChildWidth = children.reduce(
        (sum, child) => sum + (child._subtreeWidth || nodeWidth),
        0,
      );
      const spacing = (children.length - 1) * nodeSpacing;
      node._subtreeWidth = Math.max(nodeWidth, totalChildWidth + spacing);
      node._subtreeHeight = nodeHeight;
    } else {
      // Horizontal: height = sum of children heights
      const totalChildHeight = children.reduce(
        (sum, child) => sum + (child._subtreeHeight || nodeHeight),
        0,
      );
      const spacing = (children.length - 1) * nodeSpacing;
      node._subtreeHeight = Math.max(nodeHeight, totalChildHeight + spacing);
      node._subtreeWidth = nodeWidth;
    }
  }

  createElement(node, x, y, container) {
    const element = document.createElement("div");
    element.className = `mindmap-node level-${node.level}`;
    element.textContent = node.text;
    element.dataset.nodeId = node.id;

    if (node.level === 0) {
      element.classList.add("root");
    }

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    container.appendChild(element);
  }

  positionNodeAndChildren(node, x, y, levelSpacing, nodeSpacing, container, nodeWidth, nodeHeight) {
    const isVertical = this.currentLayout === "vertical";

    const element = document.createElement("div");
    element.className = `mindmap-node level-${node.level}`;
    element.textContent = node.text;
    element.dataset.nodeId = node.id;

    if (node.level === 0) {
      element.classList.add("root");
    }

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    container.appendChild(element);

    node.x = x;
    node.y = y;
    node._width = nodeWidth;
    node._height = nodeHeight;

    const children = this.selectedMindmap.nodes.filter(
      (n) => n.parent === node.id,
    );

    if (children.length > 0) {
      if (isVertical) {
        // Calculate total width needed for all children
        const totalChildWidth = children.reduce(
          (sum, child) => sum + (child._subtreeWidth || nodeWidth),
          0,
        );
        const totalSpacing = (children.length - 1) * nodeSpacing;
        const totalWidth = totalChildWidth + totalSpacing;

        // Start from left edge, centering under parent
        let childX = x + nodeWidth / 2 - totalWidth / 2;

        children.forEach((child) => {
          const childSubtreeWidth = child._subtreeWidth || nodeWidth;
          const childCenterX = childX + childSubtreeWidth / 2 - nodeWidth / 2;
          const childY = y + levelSpacing;

          this.positionNodeAndChildren(
            child,
            childCenterX,
            childY,
            levelSpacing,
            nodeSpacing,
            container,
            nodeWidth,
            nodeHeight,
          );

          childX += childSubtreeWidth + nodeSpacing;
        });
      } else {
        // Calculate total height needed for all children
        const totalChildHeight = children.reduce(
          (sum, child) => sum + (child._subtreeHeight || nodeHeight),
          0,
        );
        const totalSpacing = (children.length - 1) * nodeSpacing;
        const totalHeight = totalChildHeight + totalSpacing;

        // Start from top edge, centering beside parent
        let childY = y + nodeHeight / 2 - totalHeight / 2;

        children.forEach((child) => {
          const childSubtreeHeight = child._subtreeHeight || nodeHeight;
          const childCenterY = childY + childSubtreeHeight / 2 - nodeHeight / 2;
          const childX = x + levelSpacing;

          this.positionNodeAndChildren(
            child,
            childX,
            childCenterY,
            levelSpacing,
            nodeSpacing,
            container,
            nodeWidth,
            nodeHeight,
          );

          childY += childSubtreeHeight + nodeSpacing;
        });
      }
    }
  }

  drawConnections(container) {
    const isVertical = this.currentLayout === "vertical";

    this.selectedMindmap.nodes.forEach((node) => {
      if (node.parent) {
        const parent = this.selectedMindmap.nodes.find(
          (n) => n.id === node.parent,
        );
        if (parent && parent.x !== undefined && node.x !== undefined) {
          // Get actual rendered dimensions from DOM
          const parentEl = container.querySelector(`[data-node-id="${parent.id}"]`);
          const nodeEl = container.querySelector(`[data-node-id="${node.id}"]`);

          const parentWidth = parentEl ? parentEl.offsetWidth : 150;
          const parentHeight = parentEl ? parentEl.offsetHeight : 40;
          const nodeWidth = nodeEl ? nodeEl.offsetWidth : 150;
          const nodeHeight = nodeEl ? nodeEl.offsetHeight : 40;

          const line = document.createElement("div");
          line.className = "mindmap-connection";

          let x1, y1, x2, y2;

          if (isVertical) {
            // Parent: bottom-center, Child: top-center
            x1 = parent.x + parentWidth / 2;
            y1 = parent.y + parentHeight;
            x2 = node.x + nodeWidth / 2;
            y2 = node.y;
          } else {
            // Parent: right-center, Child: left-center
            x1 = parent.x + parentWidth;
            y1 = parent.y + parentHeight / 2;
            x2 = node.x;
            y2 = node.y + nodeHeight / 2;
          }

          const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

          line.style.width = `${length}px`;
          line.style.height = "2px";
          line.style.left = `${x1}px`;
          line.style.top = `${y1}px`;
          line.style.transform = `rotate(${angle}deg)`;
          line.style.transformOrigin = "0 50%";
          line.style.backgroundColor = "var(--color-text-muted)";
          line.style.zIndex = "1";

          container.appendChild(line);
        }
      }
    });
  }

  setupPanning() {
    const viewport = document.getElementById("mindmapViewport");
    const container = document.getElementById("mindmapContainer");
    let isDragging = false;
    let startX,
      startY,
      startTranslateX = 0,
      startTranslateY = 0;

    container.addEventListener("mousedown", (e) => {
      // Allow panning unless clicking on a mindmap node
      if (!e.target.closest(".mindmap-node")) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        container.style.cursor = "grabbing";
        e.preventDefault();
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newTranslateX = startTranslateX + deltaX;
        const newTranslateY = startTranslateY + deltaY;

        viewport.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${this.zoom})`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = "grab";
        const transform = viewport.style.transform;
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          startTranslateX = parseFloat(match[1]);
          startTranslateY = parseFloat(match[2]);
        }
      }
    });
  }

  editSelected() {
    if (!this.selectedMindmap) return;
    this.tm.mindmapSidenavModule.openEdit(this.selectedMindmap.id);
  }

  async deleteSelected() {
    if (!this.selectedMindmap) return;

    if (confirm(`Delete mindmap "${this.selectedMindmap.title}"?`)) {
      try {
        await MindmapsAPI.delete(this.selectedMindmap.id);
        this.selectedMindmap = null;
        this.load(false);
        document.getElementById("mindmapSelector").value = "";
        document.getElementById("editMindmapBtn").style.display = "none";
        document.getElementById("deleteMindmapBtn").style.display = "none";
      } catch (error) {
        console.error("Error deleting mindmap:", error);
      }
    }
  }

  convertNodesToStructure(nodes) {
    const rootNodes = nodes.filter((node) => node.level === 0);
    let structure = "";

    rootNodes.forEach((rootNode) => {
      structure += this.nodeToString(rootNode, nodes, 0);
    });

    return structure.trim();
  }

  nodeToString(node, allNodes, level) {
    const indent = "  ".repeat(level);
    let result = `${indent}- ${node.text}\n`;

    const children = allNodes.filter((n) => n.parent === node.id);
    children.forEach((child) => {
      result += this.nodeToString(child, allNodes, level + 1);
    });

    return result;
  }

  updateZoom(value) {
    this.zoom = parseFloat(value);
    const viewport = document.getElementById("mindmapViewport");
    viewport.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`;
    document.getElementById("mindmapZoomLevel").textContent =
      `${Math.round(this.zoom * 100)}%`;
  }

  updateLayout(layout) {
    this.currentLayout = layout;
    if (this.selectedMindmap) {
      this.render();
    }
  }

  openModal() {
    document.getElementById("mindmapModal").classList.remove("hidden");
    document.getElementById("mindmapModal").classList.add("flex");

    if (!this.editingMindmap) {
      document.getElementById("mindmapModalTitle").textContent = "Add Mindmap";
      document.getElementById("mindmapTitle").value = "";
      document.getElementById("mindmapStructure").value = "";
    }
    setTimeout(() => this.updatePreview(), 0);
  }

  closeModal() {
    document.getElementById("mindmapModal").classList.add("hidden");
    document.getElementById("mindmapModal").classList.remove("flex");
    this.editingMindmap = null;
    document.getElementById("mindmapModalTitle").textContent = "Add Mindmap";
  }

  handleKeyDown(e) {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        const lines = value.split('\n');
        const startLine = value.substring(0, start).split('\n').length - 1;
        const endLine = value.substring(0, end).split('\n').length - 1;

        let newValue = '';
        let cursorOffset = 0;

        for (let i = 0; i < lines.length; i++) {
          if (i >= startLine && i <= endLine) {
            if (lines[i].startsWith('  ')) {
              lines[i] = lines[i].substring(2);
              if (i === startLine) cursorOffset = -2;
            }
          }
          newValue += lines[i] + (i < lines.length - 1 ? '\n' : '');
        }

        textarea.value = newValue;
        textarea.selectionStart = Math.max(0, start + cursorOffset);
        textarea.selectionEnd = Math.max(0, end + cursorOffset);
      } else {
        if (start === end) {
          const newValue = value.substring(0, start) + '  ' + value.substring(end);
          textarea.value = newValue;
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        } else {
          const lines = value.split('\n');
          const startLine = value.substring(0, start).split('\n').length - 1;
          const endLine = value.substring(0, end).split('\n').length - 1;

          let newValue = '';
          let cursorOffset = 0;

          for (let i = 0; i < lines.length; i++) {
            if (i >= startLine && i <= endLine) {
              lines[i] = '  ' + lines[i];
              if (i === startLine) cursorOffset = 2;
            }
            newValue += lines[i] + (i < lines.length - 1 ? '\n' : '');
          }

          textarea.value = newValue;
          textarea.selectionStart = start + cursorOffset;
          textarea.selectionEnd = end + (cursorOffset * (endLine - startLine + 1));
        }
      }
      this.updatePreview();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const lines = value.split('\n');
      const currentLineIndex = value.substring(0, start).split('\n').length - 1;
      const currentLine = lines[currentLineIndex];
      const indent = currentLine.match(/^(\s*)/)[1];
      const newLine = indent + '- ';

      const lineEnd = value.indexOf('\n', start);
      const insertPos = lineEnd === -1 ? value.length : lineEnd;
      const newValue = value.substring(0, insertPos) + '\n' + newLine + value.substring(insertPos);
      textarea.value = newValue;
      textarea.selectionStart = textarea.selectionEnd = insertPos + 1 + newLine.length;
      this.updatePreview();
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      this.moveLine(e.key === 'ArrowUp' ? -1 : 1);
    }
  }

  getCurrentLineInfo() {
    const textarea = document.getElementById('mindmapStructure');
    const value = textarea.value;
    const start = textarea.selectionStart;
    const lines = value.split('\n');
    const lineIndex = value.substring(0, start).split('\n').length - 1;
    const currentLine = lines[lineIndex];
    const indent = currentLine.match(/^(\s*)/)?.[1] || '';
    return { textarea, value, start, lines, lineIndex, currentLine, indent };
  }

  addRoot() {
    const textarea = document.getElementById('mindmapStructure');
    const value = textarea.value;
    const newLine = '- New Node';
    const newValue = value ? value + '\n' + newLine : newLine;
    textarea.value = newValue;
    textarea.focus();
    textarea.selectionStart = newValue.length - 8;
    textarea.selectionEnd = newValue.length;
    this.updatePreview();
  }

  addChild() {
    const { textarea, value, lines, lineIndex, indent } = this.getCurrentLineInfo();
    if (lines.length === 0 || !lines[lineIndex].trim()) {
      this.addRoot();
      return;
    }
    const newIndent = indent + '  ';
    const newLine = newIndent + '- New Child';
    const lineEnd = value.split('\n').slice(0, lineIndex + 1).join('\n').length;
    const newValue = value.substring(0, lineEnd) + '\n' + newLine + value.substring(lineEnd);
    textarea.value = newValue;
    textarea.focus();
    const cursorStart = lineEnd + 1 + newIndent.length + 2;
    textarea.selectionStart = cursorStart;
    textarea.selectionEnd = cursorStart + 9;
    this.updatePreview();
  }

  addSibling() {
    const { textarea, value, lines, lineIndex, indent } = this.getCurrentLineInfo();
    if (lines.length === 0 || !lines[lineIndex].trim()) {
      this.addRoot();
      return;
    }
    const newLine = indent + '- New Sibling';
    const lineEnd = value.split('\n').slice(0, lineIndex + 1).join('\n').length;
    const newValue = value.substring(0, lineEnd) + '\n' + newLine + value.substring(lineEnd);
    textarea.value = newValue;
    textarea.focus();
    const cursorStart = lineEnd + 1 + indent.length + 2;
    textarea.selectionStart = cursorStart;
    textarea.selectionEnd = cursorStart + 11;
    this.updatePreview();
  }

  indent() {
    const { textarea, value, start, lines, lineIndex } = this.getCurrentLineInfo();
    if (lines[lineIndex].startsWith('  ') || lines[lineIndex].trim().startsWith('-')) {
      lines[lineIndex] = '  ' + lines[lineIndex];
      textarea.value = lines.join('\n');
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = (textarea.selectionEnd || start) + 2;
      this.updatePreview();
    }
    textarea.focus();
  }

  unindent() {
    const { textarea, value, start, lines, lineIndex } = this.getCurrentLineInfo();
    if (lines[lineIndex].startsWith('  ')) {
      lines[lineIndex] = lines[lineIndex].substring(2);
      textarea.value = lines.join('\n');
      textarea.selectionStart = Math.max(0, start - 2);
      textarea.selectionEnd = Math.max(0, (textarea.selectionEnd || start) - 2);
      this.updatePreview();
    }
    textarea.focus();
  }

  moveLine(direction) {
    const { textarea, lines, lineIndex } = this.getCurrentLineInfo();
    const targetIndex = lineIndex + direction;
    if (targetIndex < 0 || targetIndex >= lines.length) return;

    const temp = lines[lineIndex];
    lines[lineIndex] = lines[targetIndex];
    lines[targetIndex] = temp;

    const beforeLines = lines.slice(0, targetIndex);
    const newStart = beforeLines.join('\n').length + (beforeLines.length > 0 ? 1 : 0);

    textarea.value = lines.join('\n');
    textarea.focus();
    textarea.selectionStart = newStart;
    textarea.selectionEnd = newStart + lines[targetIndex].length;
    this.updatePreview();
  }

  deleteLine() {
    const { textarea, lines, lineIndex } = this.getCurrentLineInfo();
    if (lines.length === 0) return;

    lines.splice(lineIndex, 1);
    const newValue = lines.join('\n');
    textarea.value = newValue;

    const newLineIndex = Math.min(lineIndex, lines.length - 1);
    if (newLineIndex >= 0) {
      const beforeLines = lines.slice(0, newLineIndex);
      const newStart = beforeLines.join('\n').length + (beforeLines.length > 0 ? 1 : 0);
      textarea.selectionStart = textarea.selectionEnd = newStart;
    }
    textarea.focus();
    this.updatePreview();
  }

  updatePreview() {
    const structure = document.getElementById('mindmapStructure').value;
    const preview = document.getElementById('mindmapPreview');

    if (!structure.trim()) {
      preview.innerHTML = '<div class="text-gray-400 dark:text-gray-500 italic">Enter structure to see preview</div>';
      return;
    }

    const nodes = this.parseStructure(structure);
    if (nodes.length === 0) {
      preview.innerHTML = '<div class="text-gray-400 dark:text-gray-500 italic">Enter structure to see preview</div>';
      return;
    }

    const buildTree = (parentId = undefined, level = 0) => {
      const children = nodes.filter(n => n.parent === parentId);
      if (children.length === 0) return '';

      let html = '<ul class="pl-3 border-l border-gray-300 dark:border-gray-600">';
      for (const node of children) {
        html += `<li class="py-0.5"><span class="text-gray-800 dark:text-gray-200">${escapeHtml(node.text)}</span>`;
        html += buildTree(node.id, level + 1);
        html += '</li>';
      }
      html += '</ul>';
      return html;
    };

    const roots = nodes.filter(n => !n.parent);
    let html = '<div class="space-y-1">';
    for (const root of roots) {
      html += `<div class="font-medium text-gray-900 dark:text-gray-100">${escapeHtml(root.text)}</div>`;
      html += buildTree(root.id, 1);
    }
    html += '</div>';

    preview.innerHTML = html;
  }

  async handleSubmit(e) {
    e.preventDefault();
    const title = document.getElementById("mindmapTitle").value;
    const structure = document.getElementById("mindmapStructure").value;

    const nodes = this.parseStructure(structure);

    try {
      let response;
      if (this.editingMindmap) {
        response = await MindmapsAPI.update(this.editingMindmap.id, { title, nodes });
      } else {
        response = await MindmapsAPI.create({ title, nodes });
      }

      if (response.ok) {
        const editingId = this.editingMindmap?.id;
        let newId = null;

        if (!this.editingMindmap) {
          const result = await response.json();
          newId = result.id;
        }

        this.closeModal();
        await this.load();

        const selectId = editingId || newId;
        if (selectId) {
          document.getElementById("mindmapSelector").value = selectId;
          this.select(selectId);
        }
      }
    } catch (error) {
      console.error("Error saving mindmap:", error);
    }
  }

  parseStructure(structure) {
    const lines = structure.split("\n").filter((line) => line.trim());
    const nodes = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        const level = (line.length - line.trimStart().length) / 2;
        const text = trimmed.substring(2);

        const node = {
          id: `node_${index + 1}`,
          text,
          level,
          children: [],
        };

        if (level > 0) {
          for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].level === level - 1) {
              node.parent = nodes[i].id;
              nodes[i].children.push(node);
              break;
            }
          }
        }

        nodes.push(node);
      }
    });

    return nodes;
  }

  bindEvents() {
    document
      .getElementById("addMindmapBtn")
      ?.addEventListener("click", () => this.tm.mindmapSidenavModule.openNew());
    document
      .getElementById("cancelMindmapBtn")
      ?.addEventListener("click", () => this.closeModal());
    document
      .getElementById("mindmapForm")
      ?.addEventListener("submit", (e) => this.handleSubmit(e));
    document
      .getElementById("mindmapSelector")
      ?.addEventListener("change", (e) => this.select(e.target.value));
    document
      .getElementById("mindmapStructure")
      ?.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document
      .getElementById("mindmapStructure")
      ?.addEventListener("input", () => this.updatePreview());

    // Toolbar buttons
    document
      .getElementById("mmAddRootBtn")
      ?.addEventListener("click", () => this.addRoot());
    document
      .getElementById("mmAddChildBtn")
      ?.addEventListener("click", () => this.addChild());
    document
      .getElementById("mmAddSiblingBtn")
      ?.addEventListener("click", () => this.addSibling());
    document
      .getElementById("mmIndentBtn")
      ?.addEventListener("click", () => this.indent());
    document
      .getElementById("mmUnindentBtn")
      ?.addEventListener("click", () => this.unindent());
    document
      .getElementById("mmMoveUpBtn")
      ?.addEventListener("click", () => this.moveLine(-1));
    document
      .getElementById("mmMoveDownBtn")
      ?.addEventListener("click", () => this.moveLine(1));
    document
      .getElementById("mmDeleteLineBtn")
      ?.addEventListener("click", () => this.deleteLine());

    document
      .getElementById("editMindmapBtn")
      ?.addEventListener("click", () => this.editSelected());
    document
      .getElementById("deleteMindmapBtn")
      ?.addEventListener("click", () => this.deleteSelected());
    document
      .getElementById("mindmapZoom")
      ?.addEventListener("input", (e) => this.updateZoom(e.target.value));
    document
      .getElementById("mindmapLayout")
      ?.addEventListener("change", (e) => this.updateLayout(e.target.value));

    // Modal close on background click
    document.getElementById("mindmapModal")?.addEventListener("click", (e) => {
      if (e.target.id === "mindmapModal") {
        this.closeModal();
      }
    });
  }
}
