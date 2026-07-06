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
  // gives the user no cue that live updates paused. Surface it through the one
  // toast system (window.toast): a persistent warning toast on htmx:sseError,
  // dismissed on the next htmx:sseOpen. De-duplicated so flapping connections
  // never spam it.
  var sseToast = null;
  var sseReconnecting = false;
  // Browser back/forward (bfcache) restore deterministically tears down and
  // re-creates the /sse source (sse-bfcache.js), firing a benign htmx:sseError
  // → htmx:sseOpen pair. Arm on pagehide (runs before the page is frozen,
  // regardless of script order) so the first reconnect error after a restore is
  // suppressed instead of toasting.
  var bfcacheArmed = false;

  function dismissSseToast() {
    if (!sseToast) return;
    var btn = sseToast.querySelector(".toast__close");
    if (btn) btn.click();
    sseToast = null;
  }

  document.body.addEventListener("htmx:sseError", function () {
    sseReconnecting = true;
    if (bfcacheArmed) {
      bfcacheArmed = false; // one-shot: a bfcache restore reconnect, not a drop
      return;
    }
    if (!sseToast && window.toast) {
      sseToast = window.toast({
        type: "warning",
        message: "Live updates paused — reconnecting…",
        duration: 0,
      }) || null;
    }
  });
  document.body.addEventListener("htmx:sseOpen", function () {
    if (!sseReconnecting) return; // ignore the initial connect
    sseReconnecting = false;
    dismissSseToast();
  });

  window.addEventListener("pagehide", function (e) {
    if (e.persisted) bfcacheArmed = true;
  });
  window.addEventListener("pageshow", function (e) {
    // Defensive: if a restore produced no reconnect error, drop the arm so a
    // later genuine disconnect still surfaces a toast.
    if (e.persisted) {
      setTimeout(function () {
        bfcacheArmed = false;
      }, 0);
    }
  });

  document.addEventListener("closeSidenav", function () {
    var open = document.querySelector(".sidenav.is-open");
    if (!open) return;
    if (window.sidenavResetDirty) window.sidenavResetDirty(open.id);
    open.classList.remove("is-open");
    open.setAttribute("aria-hidden", "true");
  });

  // CSP-safe replacements for hx-on handlers. htmx compiles `hx-on:*` bodies
  // with new Function(), which our nonce-only CSP (no 'unsafe-eval') refuses —
  // every hx-on threw EvalError and silently did nothing. Behaviors are now
  // declared with data-* hooks and run from these delegated listeners.
  document.body.addEventListener("htmx:afterRequest", function (e) {
    if (!e.detail || !e.detail.successful) return;
    var el = e.detail.elt;
    if (!el || !el.getAttribute) return;
    if (
      el.hasAttribute("data-reset-on-success") && typeof el.reset === "function"
    ) {
      el.reset();
    }
    if (el.hasAttribute("data-reload-on-success")) {
      window.location.reload();
      return;
    }
    var redirect = el.getAttribute("data-redirect-on-success");
    if (redirect) {
      window.location.href = redirect;
      return;
    }
    var triggerSel = el.getAttribute("data-trigger-on-success");
    if (triggerSel && window.htmx) {
      var target = document.querySelector(triggerSel);
      if (target) {
        window.htmx.trigger(
          target,
          el.getAttribute("data-trigger-on-success-event") || "load",
        );
      }
    }
  });

  // Click hook: remove the nearest ancestor matching the selector. Replaces the
  // form-builder array-row remove button's old hx-on--click handler.
  document.body.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest("[data-remove-closest]");
    if (!btn) return;
    var row = btn.closest(btn.getAttribute("data-remove-closest"));
    if (row) row.remove();
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
