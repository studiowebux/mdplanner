// Mindmap Sidenav Module
// Slide-in panel for mindmap creation and editing

import { Sidenav } from "../ui/sidenav.js";
import { MindmapsAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class MindmapSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingMindmapId = null;
    this.autoSaveTimeout = null;
  }

  bindEvents() {
    // Close button
    document.getElementById("mindmapSidenavClose")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Cancel button
    document.getElementById("mindmapSidenavCancel")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Delete button
    document.getElementById("mindmapSidenavDelete")?.addEventListener(
      "click",
      () => {
        this.handleDelete();
      },
    );

    // Form submit
    document.getElementById("mindmapSidenavForm")?.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();
        await this.save();
      },
    );

    // Auto-save on input changes
    document.getElementById("mindmapSidenavTitle")?.addEventListener(
      "input",
      () => {
        if (this.editingMindmapId) {
          this.scheduleAutoSave();
        }
      },
    );

    document.getElementById("mindmapSidenavStructure")?.addEventListener(
      "input",
      () => {
        this.updatePreview();
        if (this.editingMindmapId) {
          this.scheduleAutoSave();
        }
      },
    );

    // Keyboard handling for structure editor
    document.getElementById("mindmapSidenavStructure")?.addEventListener(
      "keydown",
      (e) => {
        this.handleKeyDown(e);
      },
    );

    // Toolbar buttons
    document.getElementById("mmSidenavAddRoot")?.addEventListener(
      "click",
      () => this.addRoot(),
    );
    document.getElementById("mmSidenavAddChild")?.addEventListener(
      "click",
      () => this.addChild(),
    );
    document.getElementById("mmSidenavAddSibling")?.addEventListener(
      "click",
      () => this.addSibling(),
    );
    document.getElementById("mmSidenavIndent")?.addEventListener(
      "click",
      () => this.indent(),
    );
    document.getElementById("mmSidenavUnindent")?.addEventListener(
      "click",
      () => this.unindent(),
    );
    document.getElementById("mmSidenavMoveUp")?.addEventListener(
      "click",
      () => this.moveLine(-1),
    );
    document.getElementById("mmSidenavMoveDown")?.addEventListener(
      "click",
      () => this.moveLine(1),
    );
    document.getElementById("mmSidenavDeleteLine")?.addEventListener(
      "click",
      () => this.deleteLine(),
    );
  }

  openNew() {
    this.editingMindmapId = null;

    // Update header
    document.getElementById("mindmapSidenavHeader").textContent = "New Mindmap";

    // Reset form
    this.clearForm();

    // Hide delete button
    document.getElementById("mindmapSidenavDelete").classList.add("hidden");

    // Open sidenav
    Sidenav.open("mindmapSidenav");

    // Update preview
    this.updatePreview();
  }

  openEdit(mindmapId) {
    const mindmap = this.tm.mindmapModule.mindmaps.find((m) =>
      m.id === mindmapId
    );
    if (!mindmap) return;

    this.editingMindmapId = mindmapId;

    // Update header
    document.getElementById("mindmapSidenavHeader").textContent =
      "Edit Mindmap";

    // Fill form
    this.fillForm(mindmap);

    // Show delete button
    document.getElementById("mindmapSidenavDelete").classList.remove("hidden");

    // Open sidenav
    Sidenav.open("mindmapSidenav");

    // Update preview
    this.updatePreview();
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    Sidenav.close("mindmapSidenav");
    this.editingMindmapId = null;
  }

  clearForm() {
    document.getElementById("mindmapSidenavTitle").value = "";
    document.getElementById("mindmapSidenavStructure").value = "";
  }

  fillForm(mindmap) {
    document.getElementById("mindmapSidenavTitle").value = mindmap.title || "";
    document.getElementById("mindmapSidenavStructure").value = this
      .convertNodesToStructure(mindmap.nodes || []);
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

  getFormData() {
    const structure = document.getElementById("mindmapSidenavStructure").value;
    return {
      title: document.getElementById("mindmapSidenavTitle").value.trim(),
      nodes: this.parseStructure(structure),
    };
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.showSaveStatus("Saving...");

    this.autoSaveTimeout = setTimeout(async () => {
      await this.save();
    }, 1000);
  }

  async save() {
    const data = this.getFormData();

    if (!data.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingMindmapId) {
        await MindmapsAPI.update(this.editingMindmapId, data);
        this.showSaveStatus("Saved");
      } else {
        const response = await MindmapsAPI.create(data);
        const result = await response.json();
        this.editingMindmapId = result.id;
        this.showSaveStatus("Created");

        // Update header and show delete button
        document.getElementById("mindmapSidenavHeader").textContent =
          "Edit Mindmap";
        document.getElementById("mindmapSidenavDelete").classList.remove(
          "hidden",
        );
      }

      // Reload and re-render
      await this.tm.mindmapModule.load(false);
      if (this.editingMindmapId) {
        this.tm.mindmapModule.select(this.editingMindmapId);
      }
    } catch (error) {
      console.error("Error saving mindmap:", error);
      this.showSaveStatus("Error");
      showToast("Error saving mindmap", "error");
    }
  }

  async handleDelete() {
    if (!this.editingMindmapId) return;

    const mindmap = this.tm.mindmapModule.mindmaps.find((m) =>
      m.id === this.editingMindmapId
    );
    if (!mindmap) return;

    if (!confirm(`Delete "${mindmap.title}"? This cannot be undone.`)) return;

    try {
      await MindmapsAPI.delete(this.editingMindmapId);
      showToast("Mindmap deleted", "success");
      await this.tm.mindmapModule.load(false);
      this.close();
    } catch (error) {
      console.error("Error deleting mindmap:", error);
      showToast("Error deleting mindmap", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("mindmapSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "text-green-600",
      "text-red-500",
      "text-gray-500",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("text-green-600", "dark:text-green-400");
    } else if (text === "Error" || text === "Title required") {
      statusEl.classList.add("text-red-500");
    } else {
      statusEl.classList.add("text-gray-500", "dark:text-gray-400");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => {
        statusEl.classList.add("hidden");
      }, 2000);
    }
  }

  updatePreview() {
    const structure = document.getElementById("mindmapSidenavStructure").value;
    const preview = document.getElementById("mindmapSidenavPreview");

    if (!structure.trim()) {
      preview.innerHTML =
        '<div class="text-gray-400 dark:text-gray-500 italic">Enter structure to see preview</div>';
      return;
    }

    const nodes = this.parseStructure(structure);
    if (nodes.length === 0) {
      preview.innerHTML =
        '<div class="text-gray-400 dark:text-gray-500 italic">Enter structure to see preview</div>';
      return;
    }

    const buildTree = (parentId = undefined, level = 0) => {
      const children = nodes.filter((n) => n.parent === parentId);
      if (children.length === 0) return "";

      let html =
        '<ul class="pl-3 border-l border-gray-300 dark:border-gray-600">';
      for (const node of children) {
        html +=
          `<li class="py-0.5"><span class="text-gray-800 dark:text-gray-200">${
            escapeHtml(node.text)
          }</span>`;
        html += buildTree(node.id, level + 1);
        html += "</li>";
      }
      html += "</ul>";
      return html;
    };

    const roots = nodes.filter((n) => !n.parent);
    let html = '<div class="space-y-1">';
    for (const root of roots) {
      html += `<div class="font-medium text-gray-900 dark:text-gray-100">${
        escapeHtml(root.text)
      }</div>`;
      html += buildTree(root.id, 1);
    }
    html += "</div>";

    preview.innerHTML = html;
  }

  // Editor helper methods
  getCurrentLineInfo() {
    const textarea = document.getElementById("mindmapSidenavStructure");
    const value = textarea.value;
    const start = textarea.selectionStart;
    const lines = value.split("\n");
    const lineIndex = value.substring(0, start).split("\n").length - 1;
    const currentLine = lines[lineIndex] || "";
    const indent = currentLine.match(/^(\s*)/)?.[1] || "";
    return { textarea, value, start, lines, lineIndex, currentLine, indent };
  }

  handleKeyDown(e) {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        this.unindent();
      } else {
        this.indent();
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const lines = value.split("\n");
      const currentLineIndex = value.substring(0, start).split("\n").length - 1;
      const currentLine = lines[currentLineIndex];
      const indent = currentLine.match(/^(\s*)/)[1];
      const newLine = indent + "- ";

      const lineEnd = value.indexOf("\n", start);
      const insertPos = lineEnd === -1 ? value.length : lineEnd;
      const newValue = value.substring(0, insertPos) + "\n" + newLine +
        value.substring(insertPos);
      textarea.value = newValue;
      textarea.selectionStart = textarea.selectionEnd = insertPos + 1 +
        newLine.length;
      this.updatePreview();
    } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      this.moveLine(e.key === "ArrowUp" ? -1 : 1);
    }
  }

  addRoot() {
    const textarea = document.getElementById("mindmapSidenavStructure");
    const value = textarea.value;
    const newLine = "- New Node";
    const newValue = value ? value + "\n" + newLine : newLine;
    textarea.value = newValue;
    textarea.focus();
    textarea.selectionStart = newValue.length - 8;
    textarea.selectionEnd = newValue.length;
    this.updatePreview();
  }

  addChild() {
    const { textarea, value, lines, lineIndex, indent } = this
      .getCurrentLineInfo();
    if (lines.length === 0 || !lines[lineIndex].trim()) {
      this.addRoot();
      return;
    }
    const newIndent = indent + "  ";
    const newLine = newIndent + "- New Child";
    const lineEnd = value.split("\n").slice(0, lineIndex + 1).join("\n").length;
    const newValue = value.substring(0, lineEnd) + "\n" + newLine +
      value.substring(lineEnd);
    textarea.value = newValue;
    textarea.focus();
    const cursorStart = lineEnd + 1 + newIndent.length + 2;
    textarea.selectionStart = cursorStart;
    textarea.selectionEnd = cursorStart + 9;
    this.updatePreview();
  }

  addSibling() {
    const { textarea, value, lines, lineIndex, indent } = this
      .getCurrentLineInfo();
    if (lines.length === 0 || !lines[lineIndex].trim()) {
      this.addRoot();
      return;
    }
    const newLine = indent + "- New Sibling";
    const lineEnd = value.split("\n").slice(0, lineIndex + 1).join("\n").length;
    const newValue = value.substring(0, lineEnd) + "\n" + newLine +
      value.substring(lineEnd);
    textarea.value = newValue;
    textarea.focus();
    const cursorStart = lineEnd + 1 + indent.length + 2;
    textarea.selectionStart = cursorStart;
    textarea.selectionEnd = cursorStart + 11;
    this.updatePreview();
  }

  indent() {
    const { textarea, value, start, lines, lineIndex } = this
      .getCurrentLineInfo();
    if (
      lines[lineIndex].startsWith("  ") ||
      lines[lineIndex].trim().startsWith("-")
    ) {
      lines[lineIndex] = "  " + lines[lineIndex];
      textarea.value = lines.join("\n");
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = (textarea.selectionEnd || start) + 2;
      this.updatePreview();
    }
    textarea.focus();
  }

  unindent() {
    const { textarea, value, start, lines, lineIndex } = this
      .getCurrentLineInfo();
    if (lines[lineIndex].startsWith("  ")) {
      lines[lineIndex] = lines[lineIndex].substring(2);
      textarea.value = lines.join("\n");
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
    const newStart = beforeLines.join("\n").length +
      (beforeLines.length > 0 ? 1 : 0);

    textarea.value = lines.join("\n");
    textarea.focus();
    textarea.selectionStart = newStart;
    textarea.selectionEnd = newStart + lines[targetIndex].length;
    this.updatePreview();
  }

  deleteLine() {
    const { textarea, lines, lineIndex } = this.getCurrentLineInfo();
    if (lines.length === 0) return;

    lines.splice(lineIndex, 1);
    const newValue = lines.join("\n");
    textarea.value = newValue;

    const newLineIndex = Math.min(lineIndex, lines.length - 1);
    if (newLineIndex >= 0) {
      const beforeLines = lines.slice(0, newLineIndex);
      const newStart = beforeLines.join("\n").length +
        (beforeLines.length > 0 ? 1 : 0);
      textarea.selectionStart = textarea.selectionEnd = newStart;
    }
    textarea.focus();
    this.updatePreview();
  }
}

export default MindmapSidenavModule;
