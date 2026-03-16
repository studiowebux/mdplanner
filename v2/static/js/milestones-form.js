// Milestone form — create, edit, delete via fetch.
// Uses sidenav.js for open/close, confirm-dialog.js for delete, toast.js for feedback.

(function () {
  var form = document.getElementById("milestone-form-body");
  var sidenav = document.getElementById("milestone-form");
  var titleEl = sidenav
    ? sidenav.querySelector(".sidenav__title")
    : null;

  var fieldId = document.getElementById("milestone-form-id");
  var fieldName = document.getElementById("milestone-form-title");
  var fieldTarget = document.getElementById("milestone-form-target");
  var fieldStatus = document.getElementById("milestone-form-status");
  var fieldDesc = document.getElementById("milestone-form-description");
  var fieldProject = document.getElementById("milestone-form-project");
  var fieldProjectSearch = document.getElementById("milestone-form-project-search");

  function clearForm() {
    if (fieldId) fieldId.value = "";
    if (fieldName) fieldName.value = "";
    if (fieldTarget) fieldTarget.value = "";
    if (fieldStatus) fieldStatus.value = "open";
    if (fieldDesc) fieldDesc.value = "";
    if (fieldProject) fieldProject.value = "";
    if (fieldProjectSearch) fieldProjectSearch.value = "";
  }

  function populateForm(btn) {
    if (fieldId) fieldId.value = btn.getAttribute("data-milestone-id") || "";
    if (fieldName) fieldName.value = btn.getAttribute("data-milestone-name") || "";
    if (fieldTarget) fieldTarget.value = btn.getAttribute("data-milestone-target") || "";
    if (fieldStatus) fieldStatus.value = btn.getAttribute("data-milestone-status") || "open";
    if (fieldDesc) fieldDesc.value = btn.getAttribute("data-milestone-description") || "";
    var proj = btn.getAttribute("data-milestone-project") || "";
    if (fieldProject) fieldProject.value = proj;
    if (fieldProjectSearch) fieldProjectSearch.value = proj;
  }

  function extractError(response) {
    return response.json().then(function (data) {
      return data.message || data.error || "Unknown error";
    }).catch(function () {
      return "Request failed (" + response.status + ")";
    });
  }

  // Create vs edit mode
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-milestone-action]");
    if (!btn) return;

    var action = btn.getAttribute("data-milestone-action");

    if (action === "create") {
      clearForm();
      if (titleEl) titleEl.textContent = "Create Milestone";
    }

    if (action === "edit") {
      populateForm(btn);
      if (titleEl) titleEl.textContent = "Edit Milestone";
    }

    if (action === "delete") {
      var id = btn.getAttribute("data-milestone-id");
      var name = btn.getAttribute("data-milestone-name");
      e.stopPropagation();
      window.confirmAction({
        title: "Delete milestone",
        message: "Delete \"" + name + "\"? This cannot be undone.",
        confirmLabel: "Delete",
      }).then(function (ok) {
        if (!ok) return;
        fetch("/api/v1/milestones/" + id, { method: "DELETE" })
          .then(function (r) {
            if (!r.ok) return extractError(r).then(function (msg) { throw new Error(msg); });
            window.toast({ type: "success", message: "Milestone deleted" });
          })
          .catch(function (err) {
            window.toast({ type: "error", message: err.message });
          });
      });
    }
  });

  // Form submit — POST or PUT based on hidden ID field
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var id = fieldId ? fieldId.value : "";
      var isEdit = id.length > 0;
      var url = isEdit
        ? "/api/v1/milestones/" + id
        : "/api/v1/milestones";
      var method = isEdit ? "PUT" : "POST";

      var body = {
        name: fieldName ? fieldName.value : "",
        status: fieldStatus ? fieldStatus.value : "open",
      };
      if (fieldTarget && fieldTarget.value) body.target = fieldTarget.value;
      if (fieldDesc && fieldDesc.value) body.description = fieldDesc.value;
      if (fieldProject && fieldProject.value) body.project = fieldProject.value;

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(function (r) {
        if (!r.ok) return extractError(r).then(function (msg) { throw new Error(msg); });
        // Close sidenav — SSE handles grid + table updates
        if (window.sidenavResetDirty) window.sidenavResetDirty("milestone-form");
        if (sidenav) {
          sidenav.classList.remove("is-open");
          sidenav.setAttribute("aria-hidden", "true");
        }
        clearForm();
        window.toast({ type: "success", message: isEdit ? "Milestone updated" : "Milestone created" });
      }).catch(function (err) {
        window.toast({ type: "error", message: err.message });
      });
    });
  }
})();
