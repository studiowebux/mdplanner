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

  openExportDataModal() {
    document.getElementById("importExportDropdown").classList.add("hidden");
    document.getElementById("exportDataModal").classList.remove("hidden");
  }

  closeExportDataModal() {
    document.getElementById("exportDataModal").classList.add("hidden");
  }

  _getExportFormat() {
    return document.querySelector('input[name="exportFormat"]:checked')?.value ?? "json";
  }

  _onFormatChange() {
    const isCsv = this._getExportFormat() === "csv";
    document.querySelectorAll(".export-json-only").forEach((el) => {
      el.classList.toggle("hidden", isCsv);
      const cb = el.querySelector("input[type=checkbox]");
      if (cb && isCsv) cb.checked = false;
    });
    document.getElementById("exportCsvNote")?.classList.toggle("hidden", !isCsv);
  }

  _triggerDownload(url) {
    const link = document.createElement("a");
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadExportData() {
    const checked = [...document.querySelectorAll(".export-entity-cb:checked")]
      .map((cb) => cb.value);

    if (checked.length === 0) {
      showToast("Select at least one entity to export.", "error");
      return;
    }

    const format = this._getExportFormat();

    if (format === "csv") {
      // One download per entity — fire sequentially with small delay to avoid browser blocking
      checked.forEach((entity, i) => {
        setTimeout(() => this._triggerDownload(`/api/export/csv/${entity}`), i * 300);
      });
    } else {
      this._triggerDownload(`/api/export/json?entities=${checked.join(",")}`);
    }

    this.closeExportDataModal();
  }

  async handleCSVFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      showToast("Please select a CSV file.", "error");
      e.target.value = "";
      return;
    }

    try {
      const csvContent = await this.readFileAsText(file);
      this._showImportPreview(file.name, csvContent);
    } catch {
      showToast("Error reading file. Please try again.", "error");
    }

    e.target.value = "";
  }

  _parseCSVPreview(csvContent) {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) return { headers: [], rows: [], total: 0 };

    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
    const dataLines = lines.slice(1);
    const rows = dataLines.slice(0, 10).map((line) => {
      const values = this._parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });

    return { headers, rows, total: dataLines.length };
  }

  _parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === "," && !inQuotes) {
        result.push(current); current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  _showImportPreview(filename, csvContent) {
    const { rows, total } = this._parseCSVPreview(csvContent);
    const modal = document.getElementById("importPreviewModal");
    if (!modal) { this._doImport(csvContent); return; }

    document.getElementById("importPreviewFilename").textContent = filename;
    document.getElementById("importPreviewCount").textContent = total;

    const tbody = document.getElementById("importPreviewBody");
    tbody.innerHTML = rows.map((row) => `
      <tr>
        <td class="import-preview-cell">${row["Title"] || ""}</td>
        <td class="import-preview-cell">${row["Section"] || ""}</td>
        <td class="import-preview-cell">${row["Completed"] === "TRUE" ? "Done" : "Open"}</td>
      </tr>
    `).join("");

    const more = document.getElementById("importPreviewMore");
    if (more) {
      more.textContent = total > 10 ? `Showing 10 of ${total} rows.` : "";
    }

    this._pendingCSV = csvContent;
    modal.classList.remove("hidden");
  }

  async _doImport(csvContent) {
    try {
      const response = await fetch("/api/import/csv/tasks", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvContent,
      });

      if (response.ok) {
        const result = await response.json();
        let msg = `Imported ${result.imported} task(s)`;
        if (result.skipped > 0) msg += `, ${result.skipped} skipped (duplicates)`;
        if (result.errors?.length > 0) msg += `, ${result.errors.length} row error(s)`;
        showToast(msg + ".", result.errors?.length > 0 ? "warning" : "success");

        await this.tm.loadTasks();
        await this.tm.loadProjectInfo();
        await this.tm.loadSections();
        this.tm.renderTasks();
      } else {
        const error = await response.json();
        showToast(`Import failed: ${error.error || "Unknown error"}`, "error");
      }
    } catch {
      showToast("Error importing CSV. Please check the file format.", "error");
    }
  }

  closeImportPreviewModal() {
    document.getElementById("importPreviewModal")?.classList.add("hidden");
    this._pendingCSV = null;
  }

  confirmImport() {
    const csv = this._pendingCSV;
    this.closeImportPreviewModal();
    if (csv) this._doImport(csv);
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

    // Export Data modal
    document.getElementById("exportDataBtn")
      ?.addEventListener("click", () => this.openExportDataModal());
    document.querySelectorAll('input[name="exportFormat"]').forEach((radio) => {
      radio.addEventListener("change", () => this._onFormatChange());
    });
    document.getElementById("exportDataModalClose")
      ?.addEventListener("click", () => this.closeExportDataModal());
    document.getElementById("exportDataModalCancel")
      ?.addEventListener("click", () => this.closeExportDataModal());
    document.getElementById("exportDataModalDownload")
      ?.addEventListener("click", () => this.downloadExportData());
    document.getElementById("exportDataModal")
      ?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) this.closeExportDataModal();
      });
    document.getElementById("exportDataSelectAll")
      ?.addEventListener("click", () => {
        document.querySelectorAll(".export-entity-cb").forEach((cb) => { cb.checked = true; });
      });
    document.getElementById("exportDataSelectNone")
      ?.addEventListener("click", () => {
        document.querySelectorAll(".export-entity-cb").forEach((cb) => { cb.checked = false; });
      });

    // Import preview modal
    document.getElementById("importPreviewClose")
      ?.addEventListener("click", () => this.closeImportPreviewModal());
    document.getElementById("importPreviewCancel")
      ?.addEventListener("click", () => this.closeImportPreviewModal());
    document.getElementById("importPreviewConfirm")
      ?.addEventListener("click", () => this.confirmImport());
    document.getElementById("importPreviewModal")
      ?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) this.closeImportPreviewModal();
      });

    // CSV file input
    document
      .getElementById("csvFileInput")
      .addEventListener("change", (e) => this.handleCSVFileSelect(e));

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => this.handleDropdownClick(e));
  }
}
