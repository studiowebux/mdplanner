// Server-shutdown client notice.
//
// Listens for the named `server.shutdown` event the server publishes during
// graceful shutdown (src/bin.ts shutdown()). On that event it shows a
// persistent warning toast so the user knows the connection is about to drop
// and will recover on its own — the source reconnects when the server is back,
// at which point the notice is cleared.
//
// To avoid holding a SECOND persistent /sse connection per tab (which, with the
// htmx sse-ext source, saturates the browser's ~6 HTTP/1.1 connections-per-host
// cap once a few tabs are open — deadlocking saves/navigation), this shares the
// single htmx-created EventSource via SseBfcache.onSource. It only opens its own
// EventSource as a fallback when that shared source is unavailable.
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

  // Attach the shutdown/reconnect listeners to one /sse source. Called for
  // every htmx-created source (and on the fallback source). On `open` we clear
  // any active notice unconditionally — a fresh connection means the server is
  // back; with no active toast it is a harmless no-op, which keeps this robust
  // across htmx recreating the source (bfcache restore, reconnect).
  function wire(source) {
    source.addEventListener("server.shutdown", function () {
      showShutdownNotice(root.toast);
    });
    source.addEventListener("open", function () {
      clearShutdownNotice();
    });
  }

  function init() {
    if (typeof EventSource === "undefined") return;

    // Preferred: share the single htmx-created /sse stream — no extra socket.
    if (root.SseBfcache && typeof root.SseBfcache.onSource === "function") {
      root.SseBfcache.onSource(wire);
      return;
    }

    // Fallback only when the shared source is unavailable.
    wire(new EventSource("/sse"));
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
