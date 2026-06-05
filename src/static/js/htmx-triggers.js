// Listen for HX-Trigger custom events from server responses.
// API routes send HX-Trigger headers with showToast and closeSidenav events.

(function () {
  // Timestamp of the most recent server-driven toast (HX-Trigger showToast).
  // The global error handler below defers to it so a server-provided message
  // wins over the generic fallback when both fire on the same response.
  var lastServerToast = 0;

  document.addEventListener("showToast", function (e) {
    if (!window.toast || !e.detail) return;
    lastServerToast = Date.now();
    var d = e.detail;
    window.toast({ type: d.type || "info", message: d.message || "" });
  });

  // Global htmx error feedback — surface failed mutations the server cannot
  // toast itself (4xx/5xx without HX-Trigger, or a dropped connection). Without
  // this the sidenav just stays open with no signal. The form is left intact
  // (no auto-close) so the user can retry.
  function errorMessage(xhr) {
    if (xhr && xhr.status) {
      try {
        var body = JSON.parse(xhr.responseText);
        if (body && body.message) return body.message;
      } catch (_err) {
        /* response was not JSON — fall through to the status message */
      }
      return "Request failed (" + xhr.status + "). Please retry.";
    }
    return "Something went wrong. Please retry.";
  }

  function showErrorToast(xhr) {
    // Defer past the synchronous event dispatch so a same-response server
    // showToast (if any) records its timestamp first and wins.
    setTimeout(function () {
      if (Date.now() - lastServerToast < 100) return;
      if (window.toast) {
        window.toast({ type: "error", message: errorMessage(xhr) });
      }
    }, 0);
  }

  document.body.addEventListener("htmx:responseError", function (e) {
    showErrorToast(e.detail && e.detail.xhr);
  });
  document.body.addEventListener("htmx:sendError", function () {
    showErrorToast(null);
  });

  // SSE connection-state feedback — the htmx SSE extension auto-reconnects but
  // gives the user no cue that live updates paused. Show a subtle, non-blocking
  // pill on htmx:sseError and clear it on the next htmx:sseOpen. The pill is
  // created once and toggled, so flapping connections never spam it.
  var ssePill = null;
  var sseReconnecting = false;

  function getSsePill() {
    if (ssePill) return ssePill;
    ssePill = document.createElement("div");
    ssePill.className = "sse-status";
    ssePill.setAttribute("role", "status");
    ssePill.setAttribute("aria-live", "polite");
    ssePill.textContent = "Live updates paused — reconnecting…";
    document.body.appendChild(ssePill);
    return ssePill;
  }

  document.body.addEventListener("htmx:sseError", function () {
    sseReconnecting = true;
    getSsePill().classList.add("sse-status--visible");
  });
  document.body.addEventListener("htmx:sseOpen", function () {
    if (!sseReconnecting) return; // ignore the initial connect
    sseReconnecting = false;
    if (ssePill) ssePill.classList.remove("sse-status--visible");
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
