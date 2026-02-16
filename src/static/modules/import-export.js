import { showToast } from "./ui/toast.js";

export class ImportExportModule {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  toggleDropdown() {
    const dropdown = document.getElementById("importExportDropdown");
    dropdown.classList.toggle("hidden");
  }

  handleDropdownClick(e) {
    const dropdown = document.getElementById("importExportDropdown");
    const button = document.getElementById("importExportBtn");

    if (!button.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  }

  exportTasksCSV() {
    // Create a temporary link to download the CSV
    const link = document.createElement("a");
    link.href = "/api/export/csv/tasks";
    link.download = "tasks.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close dropdown
    document.getElementById("importExportDropdown").classList.add("hidden");
  }

  importTasksCSV() {
    // Trigger the hidden file input
    document.getElementById("csvFileInput").click();

    // Close dropdown
    document.getElementById("importExportDropdown").classList.add("hidden");
  }

  exportPDFReport() {
    // Open the PDF report in a new window for printing/saving
    window.open("/api/export/pdf/report?auto-print=true", "_blank");

    // Close dropdown
    document.getElementById("importExportDropdown").classList.add("hidden");
  }

  async handleCSVFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file.");
      return;
    }

    try {
      const csvContent = await this.readFileAsText(file);
      console.log("CSV content to import:", csvContent);

      const response = await fetch("/api/import/csv/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: csvContent,
      });

      console.log("Import response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Import result:", result);
        showToast(
          `Successfully imported ${result.imported} task(s).`,
          "success",
        );

        // Reload tasks to show imported ones
        console.log("Reloading tasks...");
        await this.tm.loadTasks();
        console.log("Tasks after reload:", this.tm.tasks);

        // Also reload project info and sections to ensure everything is fresh
        await this.tm.loadProjectInfo();
        await this.tm.loadSections();

        // Refresh the current view to show imported tasks
        console.log("Refreshing current view:", this.tm.currentView);
        this.tm.renderTasks();
      } else {
        const error = await response.json();
        console.error("Import error:", error);

        // Show a more user-friendly error message
        showToast(`Import failed: ${error.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      showToast(
        "Error importing CSV file. Please check the file format.",
        "error",
      );
    }

    // Clear the file input
    e.target.value = "";
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  bindEvents() {
    // Import/Export dropdown toggle
    document
      .getElementById("importExportBtn")
      .addEventListener("click", () => this.toggleDropdown());

    // Export tasks
    document
      .getElementById("exportTasksBtn")
      .addEventListener("click", () => this.exportTasksCSV());

    // Import tasks
    document
      .getElementById("importTasksBtn")
      .addEventListener("click", () => this.importTasksCSV());

    // Export PDF report
    document
      .getElementById("exportReportBtn")
      .addEventListener("click", () => this.exportPDFReport());

    // Mobile import/export (optional - may not exist in layout)
    document
      .getElementById("exportTasksBtnMobile")
      ?.addEventListener("click", () => {
        this.exportTasksCSV();
        this.tm.closeMobileMenu();
      });
    document
      .getElementById("importTasksBtnMobile")
      ?.addEventListener("click", () => {
        this.importTasksCSV();
        this.tm.closeMobileMenu();
      });
    document
      .getElementById("exportReportBtnMobile")
      ?.addEventListener("click", () => {
        this.exportPDFReport();
        this.tm.closeMobileMenu();
      });

    // CSV file input
    document
      .getElementById("csvFileInput")
      .addEventListener("change", (e) => this.handleCSVFileSelect(e));

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => this.handleDropdownClick(e));
  }
}
