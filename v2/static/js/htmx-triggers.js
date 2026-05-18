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
  // Per-element overrides: data-confirm-title and data-confirm-label.
  // Defaults stay delete-oriented so existing delete buttons are unaffected.
  document.addEventListener("htmx:confirm", function (e) {
    var msg = e.detail.question;
    if (!msg) return;
    e.preventDefault();
    var el = e.detail.elt;
    window.confirmAction({
      title: el.getAttribute("data-confirm-title") || "Confirm delete",
      message: msg,
      confirmLabel: el.getAttribute("data-confirm-label") || "Delete",
    }).then(function (ok) {
      if (ok) e.detail.issueRequest(true);
    });
  });
})();
