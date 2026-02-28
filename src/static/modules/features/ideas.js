import { IdeasAPI } from "../api.js";

/**
 * IdeasModule - Handles ideas CRUD and Zettelkasten-style linking
 */
export class IdeasModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.ideas = await IdeasAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading ideas:", error);
    }
  }

  renderView() {
    const container = document.getElementById("ideasContainer");
    const emptyState = document.getElementById("emptyIdeasState");

    if (!this.taskManager.ideas || this.taskManager.ideas.length === 0) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");
    const statusColors = {
      new:
        "bg-tertiary text-primary border border-default",
      considering:
        "bg-warning-bg text-warning-text",
      planned: "bg-info-bg text-info-text",
      approved:
        "bg-success-bg text-success-text",
      rejected: "bg-error-bg text-error-text",
    };

    container.innerHTML = this.taskManager.ideas
      .map((idea) => {
        const linkedIdeas = (idea.links || [])
          .map((id) => this.taskManager.ideas.find((i) => i.id === id))
          .filter(Boolean);
        const backlinkedIdeas = (idea.backlinks || [])
          .map((id) => this.taskManager.ideas.find((i) => i.id === id))
          .filter(Boolean);
        return `
      <div class="bg-secondary rounded-lg p-4 border border-default">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-primary">${idea.title}</h3>
          <span class="px-2 py-1 text-xs rounded ${
          statusColors[idea.status] || statusColors.new
        }">${idea.status}</span>
        </div>
        ${
          idea.category
            ? `<span class="inline-block px-2 py-0.5 text-xs bg-active text-secondary rounded mb-2">${idea.category}</span>`
            : ""
        }
        <p class="text-xs text-muted mb-2">Created: ${idea.created}</p>
        ${
          idea.description
            ? `<p class="text-sm text-secondary mb-2">${idea.description}</p>`
            : ""
        }
        ${
          linkedIdeas.length > 0
            ? `
          <div class="mb-2">
            <span class="text-xs text-muted">Links:</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${
              linkedIdeas.map((li) =>
                `<span class="inline-block px-2 py-0.5 text-xs bg-info-bg text-info-text rounded cursor-pointer hover:bg-info-bg" onclick="taskManager.openIdeaModal('${li.id}')">${li.title}</span>`
              ).join("")
            }
            </div>
          </div>
        `
            : ""
        }
        ${
          backlinkedIdeas.length > 0
            ? `
          <div class="mb-2">
            <span class="text-xs text-muted">Backlinks:</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${
              backlinkedIdeas.map((bi) =>
                `<span class="inline-block px-2 py-0.5 text-xs bg-info-bg text-info rounded cursor-pointer hover:bg-info-bg" onclick="taskManager.openIdeaModal('${bi.id}')">${bi.title}</span>`
              ).join("")
            }
            </div>
          </div>
        `
            : ""
        }
        <div class="flex justify-end gap-1 mt-3">
          <button type="button" onclick="taskManager.openIdeaModal('${idea.id}')" class="btn-ghost">Edit</button>
          <button type="button" onclick="taskManager.deleteIdea('${idea.id}')" class="btn-danger-ghost">Delete</button>
        </div>
      </div>
    `;
      })
      .join("");
  }

  openModal(id = null) {
    this.taskManager.editingIdeaId = id;
    const modal = document.getElementById("ideaModal");
    const title = document.getElementById("ideaModalTitle");
    const form = document.getElementById("ideaForm");
    const linksSection = document.getElementById("ideaLinksSection");

    form.reset();
    title.textContent = id ? "Edit Idea" : "Add Idea";
    this.taskManager.tempIdeaLinks = [];

    if (id && this.taskManager.ideas) {
      const idea = this.taskManager.ideas.find((i) => i.id === id);
      if (idea) {
        document.getElementById("ideaTitle").value = idea.title;
        document.getElementById("ideaStatus").value = idea.status;
        document.getElementById("ideaCategory").value = idea.category || "";
        document.getElementById("ideaDescription").value = idea.description ||
          "";
        this.taskManager.tempIdeaLinks = [...(idea.links || [])];
        linksSection?.classList.remove("hidden");
        this.updateLinksDisplay();
      }
    } else {
      linksSection?.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeModal() {
    const modal = document.getElementById("ideaModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.editingIdeaId = null;
  }

  async save(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById("ideaTitle").value,
      status: document.getElementById("ideaStatus").value,
      category: document.getElementById("ideaCategory").value || null,
      description: document.getElementById("ideaDescription").value || null,
      links: this.taskManager.tempIdeaLinks &&
          this.taskManager.tempIdeaLinks.length > 0
        ? this.taskManager.tempIdeaLinks
        : null,
    };

    try {
      if (this.taskManager.editingIdeaId) {
        await IdeasAPI.update(this.taskManager.editingIdeaId, data);
      } else {
        await IdeasAPI.create(data);
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving idea:", error);
    }
  }

  async delete(id) {
    if (!confirm("Delete this idea?")) return;
    try {
      await IdeasAPI.delete(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting idea:", error);
    }
  }

  // Zettelkasten linking methods
  openLinkPicker() {
    if (!this.taskManager.editingIdeaId) return;
    const modal = document.getElementById("ideaLinkPickerModal");
    this.taskManager.tempIdeaLinks = [
      ...(this.taskManager.ideas.find(
        (i) => i.id === this.taskManager.editingIdeaId,
      )?.links || []),
    ];
    this.renderLinkList("");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeLinkPicker() {
    const modal = document.getElementById("ideaLinkPickerModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.getElementById("ideaLinkSearch").value = "";
  }

  renderLinkList(filter) {
    const container = document.getElementById("ideaLinkList");
    const currentId = this.taskManager.editingIdeaId;
    const filtered = this.taskManager.ideas.filter(
      (i) =>
        i.id !== currentId &&
        (filter === "" || i.title.toLowerCase().includes(filter.toLowerCase())),
    );

    if (filtered.length === 0) {
      container.innerHTML =
        '<p class="text-muted text-sm text-center">No other ideas found</p>';
      return;
    }

    container.innerHTML = filtered
      .map(
        (idea) => `
      <label class="flex items-center p-2 hover:bg-tertiary rounded cursor-pointer">
        <input type="checkbox" class="idea-link-checkbox h-4 w-4 text-primary border-strong rounded"
          value="${idea.id}" ${
          this.taskManager.tempIdeaLinks.includes(idea.id) ? "checked" : ""
        }>
        <span class="ml-3 text-sm text-secondary">${idea.title}</span>
        <span class="ml-2 text-xs px-2 py-0.5 bg-active rounded">${idea.status}</span>
      </label>
    `,
      )
      .join("");

    container.querySelectorAll(".idea-link-checkbox").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        if (e.target.checked) {
          if (!this.taskManager.tempIdeaLinks.includes(e.target.value)) {
            this.taskManager.tempIdeaLinks.push(e.target.value);
          }
        } else {
          this.taskManager.tempIdeaLinks = this.taskManager.tempIdeaLinks
            .filter(
              (id) => id !== e.target.value,
            );
        }
      });
    });
  }

  filterLinkList(filter) {
    this.renderLinkList(filter);
  }

  saveLinks() {
    this.closeLinkPicker();
    this.updateLinksDisplay();
  }

  updateLinksDisplay() {
    const container = document.getElementById("ideaLinksDisplay");
    if (!container) return;

    if (
      !this.taskManager.tempIdeaLinks ||
      this.taskManager.tempIdeaLinks.length === 0
    ) {
      container.innerHTML =
        '<span class="text-muted text-sm">No linked ideas</span>';
      return;
    }

    container.innerHTML = this.taskManager.tempIdeaLinks
      .map((linkId) => {
        const linkedIdea = this.taskManager.ideas.find((i) => i.id === linkId);
        return linkedIdea
          ? `
        <span class="inline-flex items-center px-2 py-1 bg-active rounded text-sm">
          ${linkedIdea.title}
          <button type="button" onclick="taskManager.removeIdeaLink('${linkId}')" class="ml-1 text-muted hover:text-secondary">&times;</button>
        </span>
      `
          : "";
      })
      .join("");
  }

  removeLink(linkId) {
    this.taskManager.tempIdeaLinks = this.taskManager.tempIdeaLinks.filter(
      (id) => id !== linkId,
    );
    this.updateLinksDisplay();
  }

  bindEvents() {
    // View button
    document
      .getElementById("ideasViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("ideas");
        document.getElementById("viewSelectorDropdown")?.classList.add(
          "hidden",
        );
      });

    // Add idea button - opens sidenav instead of modal
    document
      .getElementById("addIdeaBtn")
      .addEventListener(
        "click",
        () => this.taskManager.ideaSidenavModule.openNew(),
      );

    // Legacy modal bindings (keep for backwards compatibility)
    document
      .getElementById("cancelIdeaBtn")
      ?.addEventListener("click", () => this.closeModal());

    document
      .getElementById("ideaForm")
      ?.addEventListener("submit", (e) => this.save(e));

    document.getElementById("ideaModal")?.addEventListener("click", (e) => {
      if (e.target.id === "ideaModal") {
        this.closeModal();
      }
    });
  }
}
