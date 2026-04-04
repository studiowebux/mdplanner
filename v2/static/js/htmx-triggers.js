// Listen for HX-Trigger custom events from server responses.
// API routes send HX-Trigger headers with showToast and closeSidenav events.

(function () {
  document.addEventListener("showToast", function (e) {
    if (!window.toast || !e.detail) return;
    var d = e.detail;
    window.toast({ type: d.type || "info", message: d.message || "" });
  });

  document.addEventListener("closeSidenav", function () {
    var open = document.querySelector(".sidenav.is-open");
    if (!open) return;
    if (window.sidenavResetDirty) window.sidenavResetDirty(open.id);
    open.classList.remove("is-open");
    open.setAttribute("aria-hidden", "true");
  });

  // Intercept htmx:confirm and show the custom modal instead of browser confirm().
  document.addEventListener("htmx:confirm", function (e) {
    var msg = e.detail.question;
    if (!msg) return;
    e.preventDefault();
    window.confirmAction({
      title: "Confirm delete",
      message: msg,
      confirmLabel: "Delete",
    }).then(function (ok) {
      if (ok) e.detail.issueRequest();
    });
  });
})();
