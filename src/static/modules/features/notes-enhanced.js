// Enhanced Notes Module - Paragraphs, Custom Sections, Tabs, Timeline, Split View
import { NotesAPI } from "../api.js";
import { escapeHtml, markdownToHtml } from "../utils.js";

export class EnhancedNotesModule {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  // Mode Toggle
  toggleMode() {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote) return;

    this.tm.enhancedMode = !this.tm.enhancedMode;

    if (this.tm.enhancedMode) {
      currentNote.mode = "enhanced";
      if (!currentNote.paragraphs || currentNote.paragraphs.length === 0) {
        const parsed = this.parseContentAndCustomSections(currentNote.content);
        currentNote.paragraphs = parsed.paragraphs;
        currentNote.customSections = parsed.customSections;
      }
    } else {
      currentNote.mode = "simple";
    }

    const btn = document.getElementById("toggleModeBtn");
    const btnText = document.getElementById("toggleModeText");
    if (this.tm.enhancedMode) {
      btn.classList.add("toggle-active");
      btn.classList.remove("toggle-inactive");
      btn.title = "Switch to Simple Mode";
      btnText.textContent = "Simple";
    } else {
      btn.classList.remove("toggle-active");
      btn.classList.add("toggle-inactive");
      btn.title = "Switch to Enhanced Mode";
      btnText.textContent = "Enhanced";
    }

    this.tm.renderActiveNote();
  }

  // Content Parsing
  parseContentAndCustomSections(content) {
    if (!content) return { paragraphs: [], customSections: [] };

    const customSections = [];
    let cleanContent = content;

    const sectionRegex =
      /<!-- Custom Section: (.+?) -->\n<!-- section-id: (.+?), type: (.+?) -->\n([\s\S]*?)<!-- End Custom Section -->/g;
    let match;

    while ((match = sectionRegex.exec(content)) !== null) {
      const [fullMatch, title, sectionId, type, sectionContent] = match;
      const section = {
        id: sectionId,
        title: title,
        type: type,
        order: customSections.length,
        config: this.parseCustomSectionContent(type, sectionContent),
      };
      customSections.push(section);
      cleanContent = cleanContent.replace(fullMatch, "");
    }

    const paragraphs = this.convertContentToParagraphs(cleanContent);
    return { paragraphs, customSections };
  }

  parseCustomSectionContent(type, content) {
    if (type === "tabs") {
      const tabs = [];
      const tabRegex =
        /### Tab: (.+?)\n<!-- tab-id: (.+?) -->\n([\s\S]*?)(?=### Tab:|$)/g;
      let match;
      while ((match = tabRegex.exec(content)) !== null) {
        const [, title, tabId, tabContent] = match;
        tabs.push({
          id: tabId,
          title: title,
          content: this.parseContentBlocks(tabContent.trim()),
        });
      }
      return { tabs };
    } else if (type === "timeline") {
      const timeline = [];
      const itemRegex =
        /## (.+?) \((.+?)\)\n<!-- item-id: (.+?), status: (.+?)(?:, date: (.+?))? -->\n([\s\S]*?)(?=## |$)/g;
      let match;
      while ((match = itemRegex.exec(content)) !== null) {
        const [, title, status, itemId, , date, itemContent] = match;
        timeline.push({
          id: itemId,
          title: title,
          status: status,
          date: date || "",
          content: this.parseContentBlocks(itemContent.trim()),
        });
      }
      return { timeline };
    } else if (type === "split-view") {
      const columns = [];
      const columnRegex =
        /### Column (\d+)\n<!-- column-index: (\d+) -->\n([\s\S]*?)(?=### Column|$)/g;
      let match;
      while ((match = columnRegex.exec(content)) !== null) {
        const [, , columnIndex, columnContent] = match;
        const index = parseInt(columnIndex);
        columns[index] = this.parseContentBlocks(columnContent.trim());
      }
      return { splitView: { columns } };
    }
    return {};
  }

  parseContentBlocks(content) {
    if (!content) return [];
    const blocks = [];
    const parts = content.split(/\n\n+/);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const codeMatch = trimmed.match(/^```(\w+)?\n([\s\S]*?)\n```$/);
      if (codeMatch) {
        blocks.push({
          id: this.generateParagraphId(),
          type: "code",
          language: codeMatch[1] || "text",
          content: codeMatch[2],
        });
      } else {
        blocks.push({
          id: this.generateParagraphId(),
          type: "text",
          content: trimmed,
        });
      }
    }
    return blocks;
  }

  convertContentToParagraphs(content) {
    if (!content) return [];

    const paragraphs = [];
    const lines = content.split("\n");
    let currentParagraph = "";
    let order = 0;
    let inCodeBlock = false;
    let codeLanguage = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith("## ") || line.trim().startsWith("### ")) {
        if (currentParagraph.trim()) {
          paragraphs.push({
            id: this.generateParagraphId(),
            type: "text",
            content: currentParagraph.trim(),
            order: order++,
          });
          currentParagraph = "";
        }
        continue;
      }

      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          if (currentParagraph.trim()) {
            paragraphs.push({
              id: this.generateParagraphId(),
              type: "code",
              content: currentParagraph.trim(),
              language: codeLanguage,
              order: order++,
            });
          }
          currentParagraph = "";
          inCodeBlock = false;
          codeLanguage = "";
        } else {
          if (currentParagraph.trim()) {
            paragraphs.push({
              id: this.generateParagraphId(),
              type: "text",
              content: currentParagraph.trim(),
              order: order++,
            });
          }
          inCodeBlock = true;
          codeLanguage = line.replace("```", "").trim();
          currentParagraph = "";
        }
        continue;
      }

      if (inCodeBlock) {
        currentParagraph += (currentParagraph ? "\n" : "") + line;
      } else if (line.trim() === "") {
        if (currentParagraph.trim()) {
          paragraphs.push({
            id: this.generateParagraphId(),
            type: "text",
            content: currentParagraph.trim(),
            order: order++,
          });
          currentParagraph = "";
        }
      } else {
        currentParagraph += (currentParagraph ? "\n" : "") + line;
      }
    }

    if (currentParagraph.trim()) {
      paragraphs.push({
        id: this.generateParagraphId(),
        type: inCodeBlock ? "code" : "text",
        content: currentParagraph.trim(),
        language: inCodeBlock ? codeLanguage : undefined,
        order: order++,
      });
    }

    return paragraphs.length > 0 ? paragraphs : [{
      id: this.generateParagraphId(),
      type: "text",
      content: "",
      order: 0,
    }];
  }

  // ID Generators
  generateParagraphId() {
    return "para_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  generateSectionId() {
    return "section_" + Date.now() + "_" +
      Math.random().toString(36).substr(2, 9);
  }

  generateTabId() {
    return "tab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  generateTimelineId() {
    return "timeline_" + Date.now() + "_" +
      Math.random().toString(36).substr(2, 9);
  }

  // Paragraph Management
  addParagraph(type = "text") {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote) return;

    if (!currentNote.paragraphs) {
      currentNote.paragraphs = [];
    }

    const newParagraph = {
      id: this.generateParagraphId(),
      type: type,
      content: "",
      language: type === "code" ? "javascript" : undefined,
      order: currentNote.paragraphs.length,
    };

    currentNote.paragraphs.push(newParagraph);
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });

    setTimeout(() => {
      const paragraphElement = document.querySelector(
        `[data-paragraph-id="${newParagraph.id}"] textarea, [data-paragraph-id="${newParagraph.id}"] [contenteditable]`,
      );
      if (paragraphElement) {
        paragraphElement.focus();
      }
    }, 100);
  }

  duplicateParagraph(paragraphId) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const originalParagraph = currentNote.paragraphs.find((p) =>
      p.id === paragraphId
    );
    if (!originalParagraph) return;

    const newParagraph = {
      ...originalParagraph,
      id: this.generateParagraphId(),
      order: originalParagraph.order + 0.5,
    };

    currentNote.paragraphs.push(newParagraph);
    currentNote.paragraphs.sort((a, b) => a.order - b.order);
    currentNote.paragraphs.forEach((p, index) => p.order = index);

    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  deleteParagraph(paragraphId) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    if (!confirm("Delete this paragraph?")) return;

    currentNote.paragraphs = currentNote.paragraphs.filter((p) =>
      p.id !== paragraphId
    );
    currentNote.paragraphs.forEach((p, index) => p.order = index);

    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  toggleParagraphType(paragraphId) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const paragraph = currentNote.paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) return;

    paragraph.type = paragraph.type === "code" ? "text" : "code";
    if (paragraph.type === "code" && !paragraph.language) {
      paragraph.language = "javascript";
    }

    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  updateParagraphContent(paragraphId, content) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const paragraph = currentNote.paragraphs.find((p) => p.id === paragraphId);
    if (paragraph && paragraph.content !== content) {
      paragraph.content = content;
      this.syncParagraphsToContent();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  updateParagraphLanguage(paragraphId, language) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const paragraph = currentNote.paragraphs.find((p) => p.id === paragraphId);
    if (paragraph && paragraph.language !== language) {
      paragraph.language = language;
      this.syncParagraphsToContent();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
      this.tm.renderActiveNote();
    }
  }

  handleParagraphBlur(event, paragraphId, content) {
    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget && (
        relatedTarget.classList.contains("language-selector") ||
        relatedTarget.closest(".paragraph-controls") ||
        relatedTarget.onclick &&
          relatedTarget.onclick.toString().includes("deleteTabContent")
      )
    ) {
      return;
    }
    setTimeout(() => {
      this.updateParagraphContent(paragraphId, content);
    }, 100);
  }

  handleParagraphKeyDown(event, paragraphId) {
    if (event.key === "Tab") {
      event.preventDefault();
      const target = event.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      if (event.shiftKey) {
        const beforeCursor = target.value.substring(0, start);
        const afterCursor = target.value.substring(end);
        if (beforeCursor.endsWith("  ")) {
          target.value = beforeCursor.slice(0, -2) + afterCursor;
          target.selectionStart = target.selectionEnd = start - 2;
        } else if (beforeCursor.endsWith("\t")) {
          target.value = beforeCursor.slice(0, -1) + afterCursor;
          target.selectionStart = target.selectionEnd = start - 1;
        }
      } else {
        target.value = target.value.substring(0, start) + "  " +
          target.value.substring(end);
        target.selectionStart = target.selectionEnd = start + 2;
      }

      this.updateParagraphContent(paragraphId, target.value);
    }
  }

  toggleParagraphSelection(paragraphId) {
    const index = this.tm.selectedParagraphs.indexOf(paragraphId);
    if (index > -1) {
      this.tm.selectedParagraphs.splice(index, 1);
    } else {
      this.tm.selectedParagraphs.push(paragraphId);
    }
    this.tm.renderActiveNote();
  }

  // Multi-Select
  toggleMultiSelect() {
    this.tm.multiSelectMode = !this.tm.multiSelectMode;
    const btn = document.getElementById("enableMultiSelectBtn");
    btn.textContent = this.tm.multiSelectMode
      ? "Exit Multi-Select"
      : "Multi-Select";
    btn.className = this.tm.multiSelectMode
      ? "bg-error text-white px-3 py-1 rounded text-sm hover:bg-error"
      : "bg-warning text-white px-3 py-1 rounded text-sm hover:bg-warning";

    if (!this.tm.multiSelectMode) {
      this.tm.selectedParagraphs = [];
      this.hideMultiSelectActions();
    } else {
      this.showMultiSelectActions();
    }
    this.tm.renderActiveNote();
  }

  showMultiSelectActions() {
    const container = document.getElementById("paragraphsContainer");
    let actionBar = document.getElementById("multiSelectActions");

    if (!actionBar) {
      actionBar = document.createElement("div");
      actionBar.id = "multiSelectActions";
      actionBar.className =
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-primary border border-strong rounded-lg shadow-lg p-3 flex space-x-2 z-50";
      actionBar.innerHTML = `
        <button onclick="taskManager.deleteSelectedParagraphs()" class="bg-error text-white px-3 py-1 rounded text-sm hover:bg-error">Delete Selected</button>
        <button onclick="taskManager.duplicateSelectedParagraphs()" class="bg-inverse text-inverse px-3 py-1 rounded text-sm hover:bg-inverse">Duplicate Selected</button>
        <button onclick="taskManager.moveSelectedParagraphs('up')" class="bg-inverse text-inverse px-3 py-1 rounded text-sm hover:bg-inverse">Move Up</button>
        <button onclick="taskManager.moveSelectedParagraphs('down')" class="bg-inverse text-inverse px-3 py-1 rounded text-sm hover:bg-inverse">Move Down</button>
      `;
      document.body.appendChild(actionBar);
    }
    actionBar.style.display = "flex";
  }

  hideMultiSelectActions() {
    const actionBar = document.getElementById("multiSelectActions");
    if (actionBar) {
      actionBar.style.display = "none";
    }
  }

  deleteSelectedParagraphs() {
    if (this.tm.selectedParagraphs.length === 0) return;
    if (
      !confirm(
        `Delete ${this.tm.selectedParagraphs.length} selected paragraph(s)?`,
      )
    ) return;

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    currentNote.paragraphs = currentNote.paragraphs.filter((p) =>
      !this.tm.selectedParagraphs.includes(p.id)
    );
    currentNote.paragraphs.forEach((p, index) => p.order = index);
    this.tm.selectedParagraphs = [];

    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  duplicateSelectedParagraphs() {
    if (this.tm.selectedParagraphs.length === 0) return;

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const selectedParagraphs = currentNote.paragraphs.filter((p) =>
      this.tm.selectedParagraphs.includes(p.id)
    );
    const newParagraphs = selectedParagraphs.map((p) => ({
      ...p,
      id: this.generateParagraphId(),
      order: p.order + 0.1,
    }));

    currentNote.paragraphs.push(...newParagraphs);
    currentNote.paragraphs.sort((a, b) => a.order - b.order);
    currentNote.paragraphs.forEach((p, index) => p.order = index);
    this.tm.selectedParagraphs = [];

    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  moveSelectedParagraphs(direction) {
    if (this.tm.selectedParagraphs.length === 0) return;

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const sortedParagraphs = [...currentNote.paragraphs].sort((a, b) =>
      a.order - b.order
    );
    const selectedIndices = this.tm.selectedParagraphs.map((id) =>
      sortedParagraphs.findIndex((p) => p.id === id)
    ).sort((a, b) => a - b);

    let moved = false;
    if (direction === "up" && selectedIndices[0] > 0) {
      selectedIndices.forEach((index) => {
        [sortedParagraphs[index], sortedParagraphs[index - 1]] = [
          sortedParagraphs[index - 1],
          sortedParagraphs[index],
        ];
      });
      moved = true;
    } else if (
      direction === "down" &&
      selectedIndices[selectedIndices.length - 1] < sortedParagraphs.length - 1
    ) {
      selectedIndices.reverse().forEach((index) => {
        [sortedParagraphs[index], sortedParagraphs[index + 1]] = [
          sortedParagraphs[index + 1],
          sortedParagraphs[index],
        ];
      });
      moved = true;
    }

    if (moved) {
      sortedParagraphs.forEach((p, index) => p.order = index);
      this.syncParagraphsToContent();
      this.tm.renderActiveNote();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  // Content Sync
  syncParagraphsToContent() {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote) return;

    let content = "";

    if (currentNote.paragraphs && currentNote.paragraphs.length > 0) {
      const sortedParagraphs = [...currentNote.paragraphs].sort((a, b) =>
        a.order - b.order
      );
      sortedParagraphs.forEach((paragraph) => {
        if (paragraph.type === "code") {
          content += `\`\`\`${
            paragraph.language || "text"
          }\n${paragraph.content}\n\`\`\`\n\n`;
        } else {
          content += `${paragraph.content}\n\n`;
        }
      });
    }

    if (currentNote.customSections && currentNote.customSections.length > 0) {
      const sortedSections = [...currentNote.customSections].sort((a, b) =>
        a.order - b.order
      );
      sortedSections.forEach((section) => {
        content += this.renderCustomSectionAsMarkdown(section);
      });
    }

    currentNote.content = content.trim();
  }

  renderCustomSectionAsMarkdown(section) {
    let markdown = `\n<!-- Custom Section: ${section.title} -->\n`;
    markdown += `<!-- section-id: ${section.id}, type: ${section.type} -->\n\n`;

    if (section.type === "tabs") {
      section.config.tabs?.forEach((tab) => {
        markdown += `### Tab: ${tab.title}\n`;
        markdown += `<!-- tab-id: ${tab.id} -->\n\n`;
        tab.content?.forEach((item) => {
          if (item.type === "code") {
            markdown += `\`\`\`${
              item.language || "text"
            }\n${item.content}\n\`\`\`\n\n`;
          } else {
            markdown += `${item.content}\n\n`;
          }
        });
      });
    } else if (section.type === "timeline") {
      section.config.timeline?.forEach((item) => {
        markdown += `## ${item.title} (${item.status})\n`;
        markdown += `<!-- item-id: ${item.id}, status: ${item.status}`;
        if (item.date) markdown += `, date: ${item.date}`;
        markdown += ` -->\n\n`;
        item.content?.forEach((contentItem) => {
          if (contentItem.type === "code") {
            markdown += `\`\`\`${
              contentItem.language || "text"
            }\n${contentItem.content}\n\`\`\`\n\n`;
          } else {
            markdown += `${contentItem.content}\n\n`;
          }
        });
      });
    } else if (section.type === "split-view") {
      section.config.splitView?.columns?.forEach((column, index) => {
        markdown += `### Column ${index + 1}\n`;
        markdown += `<!-- column-index: ${index} -->\n\n`;
        column.forEach((item) => {
          if (item.type === "code") {
            markdown += `\`\`\`${
              item.language || "text"
            }\n${item.content}\n\`\`\`\n\n`;
          } else {
            markdown += `${item.content}\n\n`;
          }
        });
      });
    }

    markdown += `<!-- End Custom Section -->\n\n`;
    return markdown;
  }

  // Auto Save Indicator
  showAutoSaveIndicator() {
    const indicator = document.getElementById("autoSaveIndicator");
    if (indicator) {
      indicator.classList.add("show");
      setTimeout(() => {
        indicator.classList.remove("show");
      }, 2000);
    }
  }

  // Custom Section Management
  addCustomSection() {
    this.openCustomSectionModal();
  }

  openCustomSectionModal() {
    document.getElementById("customSectionTitle").value = "";
    document.getElementById("customSectionType").value = "tabs";
    document.getElementById("customSectionModal").classList.remove("hidden");
    document.getElementById("customSectionModal").classList.add("flex");
  }

  closeCustomSectionModal() {
    document.getElementById("customSectionModal").classList.add("hidden");
    document.getElementById("customSectionModal").classList.remove("flex");
  }

  createCustomSection() {
    const type = document.getElementById("customSectionType").value;
    const title = document.getElementById("customSectionTitle").value.trim();

    if (!title) {
      alert("Please enter a section title");
      return;
    }

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote) return;

    if (!currentNote.customSections) {
      currentNote.customSections = [];
    }

    const newSection = {
      id: this.generateSectionId(),
      type: type,
      title: title,
      order: currentNote.customSections.length,
      config: this.getInitialSectionConfig(type),
    };

    currentNote.customSections.push(newSection);
    this.closeCustomSectionModal();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  getInitialSectionConfig(type) {
    switch (type) {
      case "tabs":
        return {
          tabs: [
            { id: this.generateTabId(), title: "Tab 1", content: [] },
            { id: this.generateTabId(), title: "Tab 2", content: [] },
          ],
        };
      case "timeline":
        return {
          timeline: [{
            id: this.generateTimelineId(),
            title: "Initial Step",
            status: "pending",
            date: new Date().toISOString().split("T")[0],
            content: [],
          }],
        };
      case "split-view":
        return {
          splitView: { columns: [[], []] },
        };
      default:
        return {};
    }
  }

  deleteCustomSection(sectionId) {
    if (!confirm("Delete this custom section?")) return;

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    currentNote.customSections = currentNote.customSections.filter((s) =>
      s.id !== sectionId
    );
    if (this.tm.activeTabState[sectionId]) {
      delete this.tm.activeTabState[sectionId];
    }

    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  // Rendering

  // View mode: renders enhanced note content as beautiful HTML without editing controls
  renderEnhancedViewMode() {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote) return "";

    let html =
      '<div class="enhanced-note-view prose max-w-none">';

    // Render paragraphs as formatted content
    const sortedParagraphs = [...(currentNote.paragraphs || [])].sort((a, b) =>
      a.order - b.order
    );
    sortedParagraphs.forEach((paragraph) => {
      if (paragraph.type === "code") {
        const lang = paragraph.language || "text";
        html +=
          `<pre class="bg-tertiary rounded-lg p-4 overflow-x-auto my-4"><code class="language-${lang} text-sm">${
            escapeHtml(paragraph.content)
          }</code></pre>`;
      } else {
        html += `<div class="my-4">${markdownToHtml(paragraph.content)}</div>`;
      }
    });

    // Render custom sections
    const sortedSections = [...(currentNote.customSections || [])].sort((
      a,
      b,
    ) => a.order - b.order);
    sortedSections.forEach((section) => {
      html += this.renderCustomSectionPreview(section);
    });

    html += "</div>";
    return html;
  }

  renderParagraphs() {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const container = document.getElementById("paragraphsContainer");
    container.innerHTML = "";

    const sortedParagraphs = [...currentNote.paragraphs].sort((a, b) =>
      a.order - b.order
    );
    sortedParagraphs.forEach((paragraph) => {
      const paragraphElement = this.createParagraphElement(paragraph);
      container.appendChild(paragraphElement);
    });

    this.initDragAndDrop();
  }

  createParagraphElement(paragraph) {
    const div = document.createElement("div");
    div.className = `paragraph-section ${
      this.tm.selectedParagraphs.includes(paragraph.id) ? "selected" : ""
    }`;
    div.setAttribute("data-paragraph-id", paragraph.id);

    const isCodeBlock = paragraph.type === "code";

    div.innerHTML = `
      <div class="paragraph-handle" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); cursor: grab; color: #9ca3af; font-size: 14px; padding: 4px; background: #f9fafb; border-radius: 3px;" draggable="true" onmousedown="this.parentElement.draggable=true" onmouseup="this.parentElement.draggable=false">
        ::
      </div>
      <div class="paragraph-controls flex flex-wrap items-center gap-2 mb-2">
        ${
      isCodeBlock
        ? `
          <div class="flex items-center gap-2">
            <span class="text-xs text-secondary">Language:</span>
            <select class="language-selector text-xs border rounded px-2 py-1 min-w-24"
                    onchange="taskManager.updateParagraphLanguage('${paragraph.id}', this.value)"
                    onmousedown="event.stopPropagation()"
                    onclick="event.stopPropagation()">
              <option value="javascript" ${
          paragraph.language === "javascript" ? "selected" : ""
        }>JavaScript</option>
              <option value="python" ${
          paragraph.language === "python" ? "selected" : ""
        }>Python</option>
              <option value="typescript" ${
          paragraph.language === "typescript" ? "selected" : ""
        }>TypeScript</option>
              <option value="html" ${
          paragraph.language === "html" ? "selected" : ""
        }>HTML</option>
              <option value="css" ${
          paragraph.language === "css" ? "selected" : ""
        }>CSS</option>
              <option value="sql" ${
          paragraph.language === "sql" ? "selected" : ""
        }>SQL</option>
              <option value="bash" ${
          paragraph.language === "bash" ? "selected" : ""
        }>Bash</option>
              <option value="json" ${
          paragraph.language === "json" ? "selected" : ""
        }>JSON</option>
              <option value="markdown" ${
          paragraph.language === "markdown" ? "selected" : ""
        }>Markdown</option>
              <option value="text" ${
          paragraph.language === "text" ? "selected" : ""
        }>Plain Text</option>
            </select>
          </div>
        `
        : ""
    }
        <div class="flex gap-2">
          <button onclick="taskManager.duplicateParagraph('${paragraph.id}')"
                  class="px-2 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse" title="Duplicate">Copy</button>
          <button onclick="taskManager.toggleParagraphType('${paragraph.id}')"
                  class="px-2 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse" title="Toggle Type">${
      isCodeBlock ? "Text" : "Code"
    }</button>
          <button onclick="taskManager.deleteParagraph('${paragraph.id}')"
                  class="px-2 py-1 text-xs bg-error text-white rounded hover:bg-error" title="Delete">Delete</button>
        </div>
      </div>
      <div class="paragraph-content mt-2" style="margin-left: 40px;">
        ${this.renderParagraphContent(paragraph)}
      </div>
    `;

    if (this.tm.multiSelectMode) {
      div.addEventListener("click", (e) => {
        if (!e.target.closest(".paragraph-content")) {
          e.preventDefault();
          this.toggleParagraphSelection(paragraph.id);
        }
      });
    }

    const dragHandle = div.querySelector(".paragraph-handle");
    dragHandle.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", paragraph.id);
      div.classList.add("dragging");
    });
    dragHandle.addEventListener("dragend", (e) => {
      div.classList.remove("dragging");
      div.draggable = false;
    });
    dragHandle.addEventListener("mousedown", () => {
      div.draggable = true;
    });

    return div;
  }

  renderParagraphContent(paragraph) {
    const isCodeBlock = paragraph.type === "code";
    const elementType = isCodeBlock ? "textarea" : "div";
    const attrs = isCodeBlock
      ? `rows="10" class="w-full p-3 code-block border-0 resize-none focus:outline-none text-primary bg-secondary"`
      : `contenteditable="true" class="w-full p-3 border-0 focus:outline-none min-h-[100px] text-primary bg-primary"`;

    return `<${elementType} ${attrs}
              onblur="taskManager.handleParagraphBlur(event, '${paragraph.id}', this.${
      isCodeBlock ? "value" : "innerText"
    })"
              onkeydown="taskManager.handleParagraphKeyDown(event, '${paragraph.id}')">${paragraph.content}</${elementType}>`;
  }

  renderCustomSections() {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const container = document.getElementById("customSectionsContainer");
    container.innerHTML = "";

    const sortedSections = [...currentNote.customSections].sort((a, b) =>
      a.order - b.order
    );
    sortedSections.forEach((section) => {
      const sectionElement = this.createCustomSectionElement(section);
      container.appendChild(sectionElement);
    });
  }

  createCustomSectionElement(section) {
    const div = document.createElement("div");
    div.className = "custom-section";
    div.setAttribute("data-section-id", section.id);

    const headerHtml = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-primary">${section.title}</h3>
        <div class="flex space-x-2">
          <button onclick="taskManager.deleteCustomSection('${section.id}')"
                  class="px-2 py-1 text-xs bg-error text-white rounded hover:bg-error">Delete</button>
        </div>
      </div>
    `;

    let contentHtml = "";
    switch (section.type) {
      case "tabs":
        contentHtml = this.renderTabsSection(section);
        break;
      case "timeline":
        contentHtml = this.renderTimelineSection(section);
        break;
      case "split-view":
        contentHtml = this.renderSplitViewSection(section);
        break;
    }

    div.innerHTML = headerHtml + contentHtml;
    return div;
  }

  renderTabsSection(section) {
    const tabs = section.config.tabs || [];
    const storedActiveTab = this.tm.activeTabState[section.id];
    const activeTabId =
      storedActiveTab && tabs.find((t) => t.id === storedActiveTab)
        ? storedActiveTab
        : (tabs.length > 0 ? tabs[0].id : null);

    if (activeTabId) {
      this.tm.activeTabState[section.id] = activeTabId;
    }

    let tabNavHtml =
      '<div class="border-b border-default mb-4"><nav class="flex space-x-8">';
    tabs.forEach((tab) => {
      const isActive = tab.id === activeTabId;
      tabNavHtml += `
        <button onclick="taskManager.switchTab('${section.id}', '${tab.id}')"
                class="py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
        isActive
          ? "border-strong text-primary"
          : "border-transparent text-muted hover:text-secondary hover:border-strong"
      }"
                data-tab-id="${tab.id}">
          ${tab.title}
        </button>
      `;
    });
    tabNavHtml += `
      <button onclick="taskManager.addTab('${section.id}')"
              class="py-2 px-1 text-sm text-secondary hover:text-primary">
        + Add Tab
      </button>
    </nav></div>`;

    let tabContentHtml = '<div class="tab-contents">';
    tabs.forEach((tab) => {
      const isActive = tab.id === activeTabId;
      tabContentHtml += `
        <div class="tab-content ${
        isActive ? "active" : ""
      }" data-tab-id="${tab.id}">
          <div class="mb-2">
            <input type="text" value="${tab.title}"
                   onblur="taskManager.updateTabTitle('${section.id}', '${tab.id}', this.value)"
                   class="text-sm font-medium border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-1 rounded px-2 py-1">
          </div>
          <div class="space-y-2">
            <button onclick="taskManager.addContentToTab('${section.id}', '${tab.id}', 'text')"
                    class="mr-2 px-3 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">+ Text</button>
            <button onclick="taskManager.addContentToTab('${section.id}', '${tab.id}', 'code')"
                    class="mr-2 px-3 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">+ Code</button>
            <button onclick="taskManager.deleteTab('${section.id}', '${tab.id}')"
                    class="px-3 py-1 text-xs bg-error text-white rounded hover:bg-error">Delete Tab</button>
          </div>
          <div class="mt-4 space-y-2" id="tab-content-${tab.id}">
            ${this.renderTabContent(tab.content)}
          </div>
        </div>
      `;
    });
    tabContentHtml += "</div>";

    return tabNavHtml + tabContentHtml;
  }

  renderTimelineSection(section) {
    const timeline = section.config.timeline || [];

    let html = `
      <div class="mb-4">
        <button onclick="taskManager.addTimelineItem('${section.id}')"
                class="px-3 py-1 text-sm bg-success text-white rounded hover:bg-success">+ Add Step</button>
      </div>
      <div class="space-y-4">
    `;

    timeline.forEach((item) => {
      const statusColor = {
        "success": "border-success text-success-text",
        "failed": "border-error text-error-text",
        "pending": "border-warning text-warning-text",
      }[item.status] || "border-strong text-secondary";

      html += `
        <div class="timeline-item ${item.status}">
          <div class="flex items-center justify-between mb-2">
            <input type="text" value="${item.title}"
                   onblur="taskManager.updateTimelineItemTitle('${section.id}', '${item.id}', this.value)"
                   class="font-medium text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-1 rounded px-2 py-1 text-primary">
            <div class="flex items-center space-x-2">
              <input type="date" value="${item.date}"
                     onchange="taskManager.updateTimelineItemDate('${section.id}', '${item.id}', this.value)"
                     class="text-xs border rounded px-2 py-1 border-strong bg-primary text-primary">
              <select onchange="taskManager.updateTimelineItemStatus('${section.id}', '${item.id}', this.value)"
                      class="text-xs border rounded px-2 py-1 border-strong bg-primary text-primary ${statusColor}">
                <option value="pending" ${
        item.status === "pending" ? "selected" : ""
      }>Pending</option>
                <option value="success" ${
        item.status === "success" ? "selected" : ""
      }>Success</option>
                <option value="failed" ${
        item.status === "failed" ? "selected" : ""
      }>Failed</option>
              </select>
              <button onclick="taskManager.deleteTimelineItem('${section.id}', '${item.id}')"
                      class="px-2 py-1 text-xs bg-error text-white rounded hover:bg-error">Delete</button>
            </div>
          </div>
          <div class="space-y-2">
            <button onclick="taskManager.addContentToTimeline('${section.id}', '${item.id}', 'text')"
                    class="mr-2 px-3 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">+ Text</button>
            <button onclick="taskManager.addContentToTimeline('${section.id}', '${item.id}', 'code')"
                    class="px-3 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">+ Code</button>
          </div>
          <div class="mt-2 space-y-2" id="timeline-content-${item.id}">
            ${this.renderTabContent(item.content)}
          </div>
        </div>
      `;
    });

    html += "</div>";
    return html;
  }

  renderSplitViewSection(section) {
    const columns = section.config.splitView?.columns || [[], []];

    let html = `
      <div class="mb-4 flex space-x-2">
        <button onclick="taskManager.addColumnToSplitView('${section.id}')"
                class="px-3 py-1 text-sm bg-info text-white rounded hover:bg-info">+ Add Column</button>
        <span class="text-sm text-secondary">${columns.length} columns</span>
      </div>
      <div class="flex space-x-4">
    `;

    columns.forEach((column, columnIndex) => {
      html += `
        <div class="split-view-column flex-1">
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-sm font-medium text-secondary">Column ${
        columnIndex + 1
      }</h4>
            <button onclick="taskManager.removeColumnFromSplitView('${section.id}', ${columnIndex})"
                    class="px-2 py-1 text-xs bg-error text-white rounded hover:bg-error">Remove</button>
          </div>
          <div class="space-y-2 mb-4">
            <button onclick="taskManager.addContentToSplitView('${section.id}', ${columnIndex}, 'text')"
                    class="mr-2 px-3 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">+ Text</button>
            <button onclick="taskManager.addContentToSplitView('${section.id}', ${columnIndex}, 'code')"
                    class="px-3 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">+ Code</button>
          </div>
          <div class="space-y-2" id="split-column-${section.id}-${columnIndex}">
            ${this.renderTabContent(column)}
          </div>
        </div>
      `;
    });

    html += "</div>";
    return html;
  }

  renderTabContent(content) {
    if (!content || content.length === 0) {
      return '<p class="text-sm text-muted italic">No content yet</p>';
    }

    return content.map((item) => {
      const isCodeBlock = item.type === "code";
      if (isCodeBlock) {
        return `
          <div class="relative border border-default rounded mb-2">
            <textarea rows="8"
                      class="w-full p-3 code-block border-0 resize-none focus:outline-none text-sm text-primary bg-secondary"
                      onblur="taskManager.updateCustomContent('${item.id}', this.value)"
                      placeholder="Enter your code here...">${item.content}</textarea>
            <button onclick="taskManager.deleteTabContent('${item.id}')"
                    class="absolute top-2 right-2 px-1 py-1 text-xs bg-error text-white rounded hover:bg-error">x</button>
          </div>
        `;
      } else {
        return `
          <div class="relative border border-default rounded mb-2">
            <textarea rows="8"
                      class="w-full p-3 border-0 resize-none focus:outline-none text-sm text-primary bg-primary"
                      onblur="taskManager.updateCustomContent('${item.id}', this.value)"
                      placeholder="Enter your text here...">${item.content}</textarea>
            <button onclick="taskManager.deleteTabContent('${item.id}')"
                    class="absolute top-2 right-2 px-1 py-1 text-xs bg-error text-white rounded hover:bg-error">x</button>
          </div>
        `;
      }
    }).join("");
  }

  // Tab Functions
  switchTab(sectionId, tabId) {
    const section = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!section) return;

    this.tm.activeTabState[sectionId] = tabId;

    section.querySelectorAll("[data-tab-id]").forEach((btn) => {
      btn.classList.remove(
        "border-strong",
        "text-primary",
      );
      btn.classList.add(
        "border-transparent",
        "text-muted",
        "hover:text-secondary",
        "hover:border-strong",
      );
    });

    const activeTab = section.querySelector(`button[data-tab-id="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.add(
        "border-strong",
        "text-primary",
      );
      activeTab.classList.remove(
        "border-transparent",
        "text-muted",
        "hover:text-secondary",
        "hover:border-strong",
      );
    }

    section.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });

    const activeContent = section.querySelector(
      `.tab-content[data-tab-id="${tabId}"]`,
    );
    if (activeContent) {
      activeContent.classList.add("active");
    }
  }

  addTab(sectionId) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "tabs") return;

    const newTab = {
      id: this.generateTabId(),
      title: `Tab ${section.config.tabs.length + 1}`,
      content: [],
    };

    section.config.tabs.push(newTab);
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  updateTabTitle(sectionId, tabId, title) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "tabs") return;

    const tab = section.config.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.title = title;
      this.syncParagraphsToContent();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  deleteTab(sectionId, tabId) {
    if (!confirm("Delete this entire tab and all its content?")) return;

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "tabs") return;

    section.config.tabs = section.config.tabs.filter((t) => t.id !== tabId);
    if (this.tm.activeTabState[sectionId] === tabId) {
      delete this.tm.activeTabState[sectionId];
    }

    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  addContentToTab(sectionId, tabId, type) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "tabs") return;

    const tab = section.config.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const newContent = {
      id: this.generateParagraphId(),
      type: type,
      content: type === "code"
        ? "// Enter your code here"
        : "Enter your text here",
      language: type === "code" ? "javascript" : undefined,
    };

    tab.content.push(newContent);
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  // Timeline Functions
  addTimelineItem(sectionId) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "timeline") return;

    const newItem = {
      id: this.generateTimelineId(),
      title: "New Step",
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      content: [],
    };

    section.config.timeline.push(newItem);
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  updateTimelineItemTitle(sectionId, itemId, title) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "timeline") return;

    const item = section.config.timeline.find((i) => i.id === itemId);
    if (item) {
      item.title = title;
      this.syncParagraphsToContent();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  updateTimelineItemDate(sectionId, itemId, date) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "timeline") return;

    const item = section.config.timeline.find((i) => i.id === itemId);
    if (item) {
      item.date = date;
      this.syncParagraphsToContent();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  updateTimelineItemStatus(sectionId, itemId, status) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "timeline") return;

    const item = section.config.timeline.find((i) => i.id === itemId);
    if (item) {
      item.status = status;
      this.syncParagraphsToContent();
      this.tm.renderActiveNote();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  deleteTimelineItem(sectionId, itemId) {
    if (!confirm("Delete this timeline item?")) return;

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "timeline") return;

    section.config.timeline = section.config.timeline.filter((i) =>
      i.id !== itemId
    );
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  addContentToTimeline(sectionId, itemId, type) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "timeline") return;

    const item = section.config.timeline.find((i) => i.id === itemId);
    if (!item) return;

    const newContent = {
      id: this.generateParagraphId(),
      type: type,
      content: type === "code"
        ? "// Enter your code here"
        : "Enter your text here",
      language: type === "code" ? "javascript" : undefined,
    };

    item.content.push(newContent);
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  // Split View Functions
  addColumnToSplitView(sectionId) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "split-view") return;

    section.config.splitView.columns.push([]);
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  removeColumnFromSplitView(sectionId, columnIndex) {
    if (!confirm("Remove this column and all its content?")) return;

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "split-view") return;

    section.config.splitView.columns.splice(columnIndex, 1);
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  addContentToSplitView(sectionId, columnIndex, type) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find((s) => s.id === sectionId);
    if (!section || section.type !== "split-view") return;

    if (!section.config.splitView.columns[columnIndex]) return;

    const newContent = {
      id: this.generateParagraphId(),
      type: type,
      content: type === "code"
        ? "// Enter your code here"
        : "Enter your text here",
      language: type === "code" ? "javascript" : undefined,
    };

    section.config.splitView.columns[columnIndex].push(newContent);
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  // Debounced save for custom content (saves after 1 second of no typing)
  scheduleCustomContentSave(contentId, content) {
    if (this.customContentSaveTimeout) {
      clearTimeout(this.customContentSaveTimeout);
    }
    this.customContentSaveTimeout = setTimeout(() => {
      this.updateCustomContent(contentId, content);
    }, 1000);
  }

  // General Content Update/Delete
  updateCustomContent(contentId, content) {
    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    let found = false;
    let oldContent = null;

    currentNote.customSections.forEach((section) => {
      if (section.type === "tabs") {
        section.config.tabs.forEach((tab) => {
          const item = tab.content.find((c) => c.id === contentId);
          if (item) {
            oldContent = item.content;
            item.content = content;
            found = true;
          }
        });
      } else if (section.type === "timeline") {
        section.config.timeline.forEach((item) => {
          const contentItem = item.content.find((c) => c.id === contentId);
          if (contentItem) {
            oldContent = contentItem.content;
            contentItem.content = content;
            found = true;
          }
        });
      } else if (section.type === "split-view") {
        section.config.splitView.columns.forEach((column) => {
          const item = column.find((c) => c.id === contentId);
          if (item) {
            oldContent = item.content;
            item.content = content;
            found = true;
          }
        });
      }
    });

    if (found && oldContent !== content) {
      this.syncParagraphsToContent();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  deleteTabContent(contentId) {
    if (!confirm("Delete this content?")) return;

    const currentNote = this.tm.notes[this.tm.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    let found = false;
    currentNote.customSections.forEach((section) => {
      if (section.type === "tabs") {
        section.config.tabs.forEach((tab) => {
          const originalLength = tab.content.length;
          tab.content = tab.content.filter((c) => c.id !== contentId);
          if (tab.content.length < originalLength) found = true;
        });
      } else if (section.type === "timeline") {
        section.config.timeline.forEach((item) => {
          const originalLength = item.content.length;
          item.content = item.content.filter((c) => c.id !== contentId);
          if (item.content.length < originalLength) found = true;
        });
      } else if (section.type === "split-view") {
        section.config.splitView.columns.forEach((column) => {
          const index = column.findIndex((c) => c.id === contentId);
          if (index > -1) {
            column.splice(index, 1);
            found = true;
          }
        });
      }
    });

    if (found) {
      this.syncParagraphsToContent();
      this.tm.renderActiveNote();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  // File Handling
  openMarkdownFile() {
    document.getElementById("markdownFileInput").click();
  }

  async handleMarkdownFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const content = await file.text();
      const title = file.name.replace(/\.(md|markdown)$/i, "");

      const parsed = this.parseContentAndCustomSections(content);
      const newNote = {
        title: title,
        content: content,
        mode: "enhanced",
        paragraphs: parsed.paragraphs,
        customSections: parsed.customSections,
      };

      const response = await NotesAPI.create(newNote);
      if (response.ok) {
        await this.tm.loadNotes();
        this.tm.activeNote = this.tm.notes.length - 1;
        this.tm.enhancedMode = true;
        this.tm.renderNotesView();
        this.showAutoSaveIndicator();
      }
    } catch (error) {
      console.error("Error importing markdown file:", error);
      alert("Error importing markdown file");
    }

    event.target.value = "";
  }

  // Drag and Drop
  initDragAndDrop() {
    const dropZone = document.getElementById("fileDropZone");
    if (dropZone) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, this.preventDefaults, false);
      });

      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, () => {
          dropZone.classList.remove("hidden");
          dropZone.classList.add("drop-zone-active");
        }, false);
      });

      ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, () => {
          dropZone.classList.add("hidden");
          dropZone.classList.remove("drop-zone-active");
        }, false);
      });

      dropZone.addEventListener("drop", (e) => {
        this.handleFileDrop(e);
      }, false);
    }

    this.initParagraphDragAndDrop();
  }

  initParagraphDragAndDrop() {
    const container = document.getElementById("paragraphsContainer");
    if (!container) return;

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = this.getDragAfterElement(container, e.clientY);
      const draggedElement = container.querySelector(".dragging");

      if (draggedElement) {
        if (afterElement == null) {
          container.appendChild(draggedElement);
        } else {
          container.insertBefore(draggedElement, afterElement);
        }
      }
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
      this.updateParagraphOrder();
    });

    container.addEventListener("dragenter", (e) => {
      e.preventDefault();
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".paragraph-section:not(.dragging)"),
    ];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  updateParagraphOrder() {
    const container = document.getElementById("paragraphsContainer");
    const paragraphElements = container.querySelectorAll(".paragraph-section");
    const currentNote = this.tm.notes[this.tm.activeNote];

    if (!currentNote || !currentNote.paragraphs) return;

    let orderChanged = false;
    paragraphElements.forEach((element, index) => {
      const paragraphId = element.getAttribute("data-paragraph-id");
      const paragraph = currentNote.paragraphs.find((p) =>
        p.id === paragraphId
      );
      if (paragraph && paragraph.order !== index) {
        paragraph.order = index;
        orderChanged = true;
      }
    });

    if (orderChanged) {
      this.syncParagraphsToContent();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  async handleFileDrop(e) {
    const files = [...e.dataTransfer.files];

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        await this.addImageToNote(file);
      } else if (
        file.type === "text/plain" || file.name.endsWith(".md") ||
        file.name.endsWith(".txt")
      ) {
        await this.addTextFileToNote(file);
      } else {
        await this.addFileReference(file);
      }
    }
  }

  async addImageToNote(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageMarkdown = `![${file.name}](${e.target.result})`;
      this.addParagraph("text");
      const currentNote = this.tm.notes[this.tm.activeNote];
      const lastParagraph =
        currentNote.paragraphs[currentNote.paragraphs.length - 1];
      lastParagraph.content = imageMarkdown;
      this.syncParagraphsToContent();
      this.tm.renderActiveNote();
      this.tm.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    };
    reader.readAsDataURL(file);
  }

  async addTextFileToNote(file) {
    const content = await file.text();
    const isMarkdown = file.name.endsWith(".md");

    if (isMarkdown) {
      const parsed = this.parseContentAndCustomSections(content);
      const currentNote = this.tm.notes[this.tm.activeNote];
      currentNote.paragraphs.push(
        ...parsed.paragraphs.map((p) => ({
          ...p,
          order: currentNote.paragraphs.length + p.order,
        })),
      );

      if (parsed.customSections && parsed.customSections.length > 0) {
        if (!currentNote.customSections) currentNote.customSections = [];
        currentNote.customSections.push(...parsed.customSections.map((s) => ({
          ...s,
          order: currentNote.customSections.length + s.order,
        })));
      }
    } else {
      this.addParagraph("text");
      const currentNote = this.tm.notes[this.tm.activeNote];
      const lastParagraph =
        currentNote.paragraphs[currentNote.paragraphs.length - 1];
      lastParagraph.content = content;
    }

    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  async addFileReference(file) {
    const fileRef = `[Attachment: ${file.name}](attachment:${file.name})`;
    this.addParagraph("text");
    const currentNote = this.tm.notes[this.tm.activeNote];
    const lastParagraph =
      currentNote.paragraphs[currentNote.paragraphs.length - 1];
    lastParagraph.content = fileRef;
    this.syncParagraphsToContent();
    this.tm.renderActiveNote();
    this.tm.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  bindEvents() {
    // Toggle enhanced mode
    document
      .getElementById("toggleModeBtn")
      .addEventListener("click", () => this.toggleMode());

    // Open markdown file
    document
      .getElementById("openMarkdownBtn")
      .addEventListener("click", () => this.openMarkdownFile());

    // Add paragraph buttons
    document
      .getElementById("addParagraphBtn")
      .addEventListener("click", () => this.addParagraph("text"));
    document
      .getElementById("addCodeBlockBtn")
      .addEventListener("click", () => this.addParagraph("code"));

    // Add custom section
    document
      .getElementById("addCustomSectionBtn")
      .addEventListener("click", () => this.addCustomSection());

    // Multi-select toggle
    document
      .getElementById("enableMultiSelectBtn")
      .addEventListener("click", () => this.toggleMultiSelect());

    // Markdown file input
    document
      .getElementById("markdownFileInput")
      .addEventListener("change", (e) => this.handleMarkdownFileSelect(e));

    // Custom section modal events
    document
      .getElementById("cancelCustomSectionBtn")
      .addEventListener("click", () => this.closeCustomSectionModal());
    document
      .getElementById("createCustomSectionBtn")
      .addEventListener("click", () => this.createCustomSection());

    // Close custom section modal on background click
    document.getElementById("customSectionModal")?.addEventListener(
      "click",
      (e) => {
        if (e.target.id === "customSectionModal") {
          this.closeCustomSectionModal();
        }
      },
    );
  }

  // Preview Rendering
  renderCustomSectionPreview(section) {
    let sectionHtml =
      `<div class="mt-6 border border-default rounded-lg p-4" data-section-preview-id="${section.id}">
      <h2 class="text-xl font-bold text-primary mb-4">${section.title}</h2>`;

    if (section.type === "tabs") {
      const tabs = section.config.tabs || [];
      if (tabs.length > 0) {
        // Tab navigation
        sectionHtml +=
          '<div class="border-b border-default mb-4"><nav class="flex space-x-8">';
        tabs.forEach((tab, index) => {
          const isActive = index === 0;
          sectionHtml += `
            <button class="py-2 px-1 border-b-2 font-medium text-sm ${
            isActive
              ? "border-strong text-primary"
              : "border-transparent text-muted"
          }" onclick="taskManager.switchPreviewTab('${section.id}', '${tab.id}')">
              ${tab.title}
            </button>`;
        });
        sectionHtml += "</nav></div>";

        // Tab content
        tabs.forEach((tab, index) => {
          const isActive = index === 0;
          sectionHtml += `<div class="tab-preview-content ${
            isActive ? "" : "hidden"
          }" data-preview-tab-id="${tab.id}">`;
          tab.content.forEach((item) => {
            if (item.type === "code") {
              sectionHtml +=
                `<pre class="bg-tertiary p-3 rounded mb-2 overflow-x-auto"><code class="text-sm text-primary">${
                  escapeHtml(item.content)
                }</code></pre>`;
            } else {
              sectionHtml += `<div class="mb-2">${
                markdownToHtml(item.content)
              }</div>`;
            }
          });
          sectionHtml += "</div>";
        });
      }
    } else if (section.type === "timeline") {
      section.config.timeline?.forEach((item) => {
        const statusClass = item.status === "success"
          ? "text-success"
          : item.status === "failed"
          ? "text-error"
          : "text-warning";
        sectionHtml += `
          <div class="mb-4 p-3 border-l-4 border-strong bg-secondary">
            <h3 class="font-semibold ${statusClass}">${item.title} (${item.status})</h3>
            ${
          item.date
            ? `<p class="text-sm text-secondary">Date: ${item.date}</p>`
            : ""
        }
            <div class="mt-2">`;
        item.content?.forEach((contentItem) => {
          if (contentItem.type === "code") {
            sectionHtml +=
              `<pre class="bg-tertiary p-3 rounded mb-2 overflow-x-auto"><code class="text-sm text-primary">${
                escapeHtml(contentItem.content)
              }</code></pre>`;
          } else {
            sectionHtml += `<div class="mb-2">${
              markdownToHtml(contentItem.content)
            }</div>`;
          }
        });
        sectionHtml += "</div></div>";
      });
    } else if (section.type === "split-view") {
      sectionHtml += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
      section.config.splitView?.columns?.forEach((column, index) => {
        sectionHtml +=
          `<div class="border border-default rounded p-3">
          <h4 class="font-medium mb-2 text-primary">Column ${
            index + 1
          }</h4>`;
        column.forEach((item) => {
          if (item.type === "code") {
            sectionHtml +=
              `<pre class="bg-tertiary p-3 rounded mb-2 overflow-x-auto"><code class="text-sm">${
                escapeHtml(item.content)
              }</code></pre>`;
          } else {
            sectionHtml += `<div class="mb-2">${
              markdownToHtml(item.content)
            }</div>`;
          }
        });
        sectionHtml += "</div>";
      });
      sectionHtml += "</div>";
    }

    sectionHtml += "</div>";
    return sectionHtml;
  }

  switchPreviewTab(sectionId, tabId) {
    // Find the section container
    const sectionElement = document.querySelector(
      `[data-section-preview-id="${sectionId}"]`,
    );
    if (!sectionElement) return;

    // Hide all tab contents in this section only
    sectionElement.querySelectorAll("[data-preview-tab-id]").forEach(
      (content) => {
        content.classList.add("hidden");
      },
    );

    // Show the selected tab content
    const activeContent = sectionElement.querySelector(
      `[data-preview-tab-id="${tabId}"]`,
    );
    if (activeContent) {
      activeContent.classList.remove("hidden");
    }

    // Update tab button states in this section only
    sectionElement.querySelectorAll('button[onclick*="switchPreviewTab"]')
      .forEach((btn) => {
        btn.classList.remove(
          "border-strong",
          "text-primary",
        );
        btn.classList.add("border-transparent", "text-muted");
      });

    const activeBtn = sectionElement.querySelector(`[onclick*="${tabId}"]`);
    if (activeBtn) {
      activeBtn.classList.add(
        "border-strong",
        "text-primary",
      );
      activeBtn.classList.remove("border-transparent", "text-muted");
    }
  }
}
