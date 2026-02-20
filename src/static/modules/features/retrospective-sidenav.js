// Retrospective Sidenav Module
// Pattern: Template Method (extends BaseSidenavModule)

import { BaseSidenavModule } from "../ui/base-sidenav.js";
import { RetrospectivesAPI } from "../api.js";

export class RetrospectiveSidenavModule extends BaseSidenavModule {
  get prefix() { return "retro"; }
  get entityName() { return "Retrospective"; }
  get api() { return RetrospectivesAPI; }
  get inputIds() {
    return [
      "retroSidenavTitle", "retroSidenavDate", "retroSidenavStatus",
      "retroSidenavContinue", "retroSidenavStop", "retroSidenavStart",
    ];
  }

  parseItems(text) {
    return text.split("\n").map((s) => s.trim()).filter((s) => s);
  }

  clearForm() {
    document.getElementById("retroSidenavTitle").value = "";
    document.getElementById("retroSidenavDate").value =
      new Date().toISOString().split("T")[0];
    document.getElementById("retroSidenavStatus").value = "open";
    document.getElementById("retroSidenavContinue").value = "";
    document.getElementById("retroSidenavStop").value = "";
    document.getElementById("retroSidenavStart").value = "";
  }

  fillForm(retro) {
    document.getElementById("retroSidenavTitle").value = retro.title || "";
    document.getElementById("retroSidenavDate").value = retro.date || "";
    document.getElementById("retroSidenavStatus").value = retro.status || "open";
    document.getElementById("retroSidenavContinue").value =
      (retro.continue || []).join("\n");
    document.getElementById("retroSidenavStop").value =
      (retro.stop || []).join("\n");
    document.getElementById("retroSidenavStart").value =
      (retro.start || []).join("\n");
  }

  getFormData() {
    return {
      title: document.getElementById("retroSidenavTitle").value.trim(),
      date: document.getElementById("retroSidenavDate").value,
      status: document.getElementById("retroSidenavStatus").value,
      continue: this.parseItems(document.getElementById("retroSidenavContinue").value),
      stop: this.parseItems(document.getElementById("retroSidenavStop").value),
      start: this.parseItems(document.getElementById("retroSidenavStart").value),
    };
  }

  findEntity(id) {
    return this.tm.retrospectives.find((r) => r.id === id);
  }

  async reloadData() {
    await this.tm.retrospectivesModule.load();
  }
}

export default RetrospectiveSidenavModule;
