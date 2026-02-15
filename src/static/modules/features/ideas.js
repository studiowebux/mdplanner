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
      new: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600",
      considering:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      planned:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      approved:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rejected:
        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${idea.title}</h3>
          <span class="px-2 py-1 text-xs rounded ${statusColors[idea.status] || statusColors.new}">${idea.status}</span>
        </div>
        ${idea.category ? `<span class="inline-block px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded mb-2">${idea.category}</span>` : ""}
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Created: ${idea.created}</p>
        ${idea.description ? `<p class="text-sm text-gray-600 dark:text-gray-300 mb-2">${idea.description}</p>` : ""}
        ${
          linkedIdeas.length > 0
            ? `
          <div class="mb-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">Links:</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${linkedIdeas.map((li) => `<span class="inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800" onclick="taskManager.openIdeaModal('${li.id}')">${li.title}</span>`).join("")}
            </div>
          </div>
        `
            : ""
        }
        ${
          backlinkedIdeas.length > 0
            ? `
          <div class="mb-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">Backlinks:</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${backlinkedIdeas.map((bi) => `<span class="inline-block px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800" onclick="taskManager.openIdeaModal('${bi.id}')">${bi.title}</span>`).join("")}
            </div>
          </div>
        `
            : ""
        }
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openIdeaModal('${idea.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Edit</button>
          <button onclick="taskManager.deleteIdea('${idea.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">Delete</button>
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
        document.getElementById("ideaDescription").value =
          idea.description || "";
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
      links:
        this.taskManager.tempIdeaLinks &&
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
        '<p class="text-gray-500 dark:text-gray-400 text-sm text-center">No other ideas found</p>';
      return;
    }

    container.innerHTML = filtered
      .map(
        (idea) => `
      <label class="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
        <input type="checkbox" class="idea-link-checkbox h-4 w-4 text-gray-900 border-gray-300 rounded"
          value="${idea.id}" ${this.taskManager.tempIdeaLinks.includes(idea.id) ? "checked" : ""}>
        <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">${idea.title}</span>
        <span class="ml-2 text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">${idea.status}</span>
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
          this.taskManager.tempIdeaLinks =
            this.taskManager.tempIdeaLinks.filter(
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
        '<span class="text-gray-400 text-sm">No linked ideas</span>';
      return;
    }

    container.innerHTML = this.taskManager.tempIdeaLinks
      .map((linkId) => {
        const linkedIdea = this.taskManager.ideas.find((i) => i.id === linkId);
        return linkedIdea
          ? `
        <span class="inline-flex items-center px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">
          ${linkedIdea.title}
          <button type="button" onclick="taskManager.removeIdeaLink('${linkId}')" class="ml-1 text-gray-500 hover:text-gray-700">&times;</button>
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
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Add idea button
    document
      .getElementById("addIdeaBtn")
      .addEventListener("click", () => this.openModal());

    // Cancel idea modal
    document
      .getElementById("cancelIdeaBtn")
      .addEventListener("click", () => this.closeModal());

    // Idea form submission
    document
      .getElementById("ideaForm")
      .addEventListener("submit", (e) => this.save(e));

    // Idea link picker events
    document
      .getElementById("openIdeaLinkPickerBtn")
      ?.addEventListener("click", () => this.openLinkPicker());
    document
      .getElementById("cancelIdeaLinkPickerBtn")
      ?.addEventListener("click", () => this.closeLinkPicker());
    document
      .getElementById("saveIdeaLinksBtn")
      ?.addEventListener("click", () => this.saveLinks());
    document
      .getElementById("ideaLinkSearch")
      ?.addEventListener("input", (e) => this.filterLinkList(e.target.value));

    // Close modal on background click
    document.getElementById("ideaModal").addEventListener("click", (e) => {
      if (e.target.id === "ideaModal") {
        this.closeModal();
      }
    });
  }
}
