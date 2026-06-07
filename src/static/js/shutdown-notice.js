// Server-shutdown client notice.
//
// Opens a dedicated EventSource to /sse and listens for the named
// `server.shutdown` event the server publishes during graceful shutdown
// (src/bin.ts shutdown()). On that event it shows a persistent warning toast
// so the user knows the connection is about to drop and will recover on its
// own — the browser's native EventSource reconnects when the server is back,
// at which point the notice is cleared.
//
// DOM-free logic (showShutdownNotice / clearShutdownNotice) is exposed on
// window.ShutdownNotice for unit testing; the EventSource wiring in init()
// only runs in a browser (guarded on `document`), so importing this file in
// Deno is side-effect-free.

(function (root) {
  var MESSAGE = "Server is shutting down — it will reconnect when it's back.";
  var activeToast = null;

  // Show the shutdown notice via the provided toast factory (window.toast).
  // Persistent (duration 0) and de-duplicated so repeated events don't stack.
  function showShutdownNotice(toastFn) {
    if (typeof toastFn !== "function") return null;
    if (activeToast) return activeToast;
    activeToast = toastFn({
      type: "warning",
      message: MESSAGE,
      duration: 0,
    }) || null;
    return activeToast;
  }

  // Dismiss the active notice (called once the stream reconnects).
  function clearShutdownNotice() {
    if (activeToast && activeToast.parentNode) {
      var btn = activeToast.querySelector(".toast__close");
      if (btn) btn.click();
    }
    activeToast = null;
  }

  function init() {
    if (typeof EventSource === "undefined") return;

    var source = new EventSource("/sse");
    var sawShutdown = false;

    source.addEventListener("server.shutdown", function () {
      sawShutdown = true;
      showShutdownNotice(root.toast);
    });

    // A successful (re)connection after a shutdown means the server is back.
    source.addEventListener("open", function () {
      if (sawShutdown) {
        sawShutdown = false;
        clearShutdownNotice();
      }
    });
  }

  root.ShutdownNotice = {
    showShutdownNotice: showShutdownNotice,
    clearShutdownNotice: clearShutdownNotice,
    MESSAGE: MESSAGE,
  };

  if (typeof document !== "undefined") {
    if (document.readyState !== "loading") init();
    else document.addEventListener("DOMContentLoaded", init);
  }
})(typeof window !== "undefined" ? window : globalThis);
