import { CanvasAPI } from "../api.js";

export class CanvasModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.stickyNotes = [];
    this.selectedColor = "yellow";
    this.zoom = 1;
    this.offset = { x: 0, y: 0 };
    this.resizableEvents = [];
  }

  async load() {
    try {
      this.stickyNotes = await CanvasAPI.fetchAll();
      this.render();
    } catch (error) {
      console.error("Error loading canvas:", error);
    }
  }

  render() {
    const canvasContent = document.getElementById("canvasContent");
    canvasContent.innerHTML = "";

    this.stickyNotes.forEach((stickyNote) => {
      const stickyNoteElement = this.createElement({
        ...stickyNote,
        content: stickyNote.content.replaceAll(/\n/g, "<br>"),
      });
      canvasContent.appendChild(stickyNoteElement);
    });

    this.setupPanning();
  }

  setupPanning() {
    const viewport = document.getElementById("canvasViewport");
    if (!viewport || viewport.hasAttribute("data-panning-setup")) return;

    viewport.setAttribute("data-panning-setup", "true");
    viewport.style.cursor = "grab";
    viewport.title = "Click and drag to pan the canvas";

    let isDragging = false;
    let startX,
      startY,
      startTranslateX = 0,
      startTranslateY = 0;

    viewport.addEventListener("mousedown", (e) => {
      if (e.target === viewport || e.target.id === "canvasContent") {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        viewport.style.cursor = "grabbing";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newTranslateX = startTranslateX + deltaX;
        const newTranslateY = startTranslateY + deltaY;

        this.offset.x = newTranslateX;
        this.offset.y = newTranslateY;

        viewport.style.transform =
          `translate(${newTranslateX}px, ${newTranslateY}px) scale(${this.zoom})`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        viewport.style.cursor = "grab";
        const transform = viewport.style.transform;
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          startTranslateX = parseFloat(match[1]);
          startTranslateY = parseFloat(match[2]);
          this.offset.x = startTranslateX;
          this.offset.y = startTranslateY;
        }
      }
    });
  }

  createElement(stickyNote) {
    const element = document.createElement("div");
    element.className = `sticky-note ${stickyNote.color}`;
    element.style.left = `${stickyNote.position.x}px`;
    element.style.top = `${stickyNote.position.y}px`;
    element.dataset.id = stickyNote.id;

    if (stickyNote.size) {
      element.style.width = `${stickyNote.size.width}px`;
      element.style.height = `${stickyNote.size.height}px`;
    }

    element.setAttribute("data-sticky-note-id", stickyNote.id);
    element.innerHTML = `
            <div class="sticky-note-controls">
                <button onclick="taskManager.editStickyNote('${stickyNote.id}')" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button onclick="taskManager.deleteStickyNote('${stickyNote.id}')" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            <div contenteditable="true" onblur="taskManager.updateStickyNoteContent('${stickyNote.id}', this.innerText)">${stickyNote.content}</div>
        `;

    this.makeDraggable(element);
    this.makeResizable(element);
    return element;
  }

  makeDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const onMouseDown = (e) => {
      if (e.target.contentEditable === "true") return;
      isDragging = true;
      element.classList.add("dragging");
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left) || 0;
      startTop = parseInt(element.style.top) || 0;

      // Add document listeners only when dragging starts
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const newLeft = startLeft + (e.clientX - startX);
      const newTop = startTop + (e.clientY - startY);
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        element.classList.remove("dragging");

        const newX = parseInt(element.style.left) || 0;
        const newY = parseInt(element.style.top) || 0;
        const id = element.dataset.id;

        console.log("Canvas: Saving position for", id, "to", newX, newY);

        this.updatePosition(id, { x: newX, y: newY });

        // Remove document listeners when dragging ends
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }
    };

    element.addEventListener("mousedown", onMouseDown);
  }

  makeResizable(element) {
    if (!window.ResizeObserver) return;

    let isInitialSetup = true;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (isInitialSetup) {
          isInitialSetup = false;
          continue;
        }

        const { inlineSize: width, blockSize: height } = entry.borderBoxSize.at(
          0,
        );
        clearTimeout(element.resizeTimeout);
        element.resizeTimeout = setTimeout(() => {
          this.updateSize(element.dataset.id, { width, height });
        }, 500);
      }
    });

    resizeObserver.observe(element, { box: "border-box" });
    element.resizeObserver = resizeObserver;
    this.resizableEvents.push(resizeObserver);
  }

  async updateSize(id, size) {
    try {
      if (this.tm.notesLoaded === false) {
        return;
      }
      await CanvasAPI.update(id, { size });
    } catch (error) {
      console.error("Error updating sticky note size:", error);
    }
  }

  openModal() {
    document.getElementById("stickyNoteModal").classList.remove("hidden");
    document.getElementById("stickyNoteModal").classList.add("flex");
    document.getElementById("stickyNoteContent").value = "";
    this.selectedColor = "yellow";
    document
      .querySelectorAll(".color-option")
      .forEach((opt) => opt.classList.remove("selected"));
    document.querySelector('[data-color="yellow"]').classList.add("selected");
  }

  closeModal() {
    document.getElementById("stickyNoteModal").classList.add("hidden");
    document.getElementById("stickyNoteModal").classList.remove("flex");
  }

  async handleSubmit(e) {
    e.preventDefault();
    const content = document.getElementById("stickyNoteContent").value.trim();

    if (!content.trim()) {
      alert("Please enter some content for the sticky note");
      return;
    }

    try {
      const postData = {
        content: content.trim(),
        color: this.selectedColor || "yellow",
        position: {
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
        },
      };

      const response = await CanvasAPI.create(postData);

      if (response.ok) {
        this.closeModal();
        this.load();
      } else {
        const error = await response.text();
        console.error("Failed to create sticky note:", error);
        alert("Failed to create sticky note: " + error);
      }
    } catch (error) {
      console.error("Error creating sticky note:", error);
      alert("Error creating sticky note: " + error.message);
    }
  }

  edit(id) {
    // Open sidenav for editing
    this.tm.stickyNoteSidenavModule.openEdit(id);
  }

  async updateContent(id, content) {
    try {
      await CanvasAPI.update(id, { content: content.trim() });
    } catch (error) {
      console.error("Error updating sticky note:", error);
    }
  }

  async updatePosition(id, position) {
    try {
      await CanvasAPI.update(id, { position });
    } catch (error) {
      console.error("Error updating sticky note position:", error);
    }
  }

  async delete(id) {
    if (confirm("Delete this sticky note?")) {
      try {
        await CanvasAPI.delete(id);
        this.load();
      } catch (error) {
        console.error("Error deleting sticky note:", error);
      }
    }
  }

  updateZoom(value) {
    this.zoom = parseFloat(value);
    const viewport = document.getElementById("canvasViewport");
    viewport.style.transform =
      `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`;
    document.getElementById("zoomLevel").textContent = `${
      Math.round(this.zoom * 100)
    }%`;
  }

  selectColor(color) {
    this.selectedColor = color;
  }

  bindEvents() {
    document
      .getElementById("addStickyNoteBtn")
      ?.addEventListener(
        "click",
        () => this.tm.stickyNoteSidenavModule.openNew(),
      );
    document
      .getElementById("cancelStickyNoteBtn")
      ?.addEventListener("click", () => this.closeModal());
    document
      .getElementById("stickyNoteForm")
      ?.addEventListener("submit", (e) => this.handleSubmit(e));
    document
      .getElementById("canvasZoom")
      ?.addEventListener("input", (e) => this.updateZoom(e.target.value));

    // Color picker events
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("color-option")) {
        document
          .querySelectorAll(".color-option")
          .forEach((opt) => opt.classList.remove("selected"));
        e.target.classList.add("selected");
        this.selectColor(e.target.dataset.color);
      }
    });

    // Modal close on background click
    document
      .getElementById("stickyNoteModal")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "stickyNoteModal") {
          this.closeModal();
        }
      });
  }
}
