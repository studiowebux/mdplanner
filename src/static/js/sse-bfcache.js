// Safari bfcache hardening for htmx-ext-sse EventSources.
//
// When Safari restores a page from the back/forward cache, any live
// EventSource (to /sse) is stale and fires a native `error` before
// htmx-ext-sse auto-reconnects — benign but noisy and with a brief gap.
//
// This makes reconnection deterministic without touching the extension's
// internals or mutating the DOM (the `sse-connect` attribute sits on
// content-bearing elements like <main class="domain-page">, so cloning is
// unsafe):
//   1. Wrap the public `htmx.createEventSource` hook to track every source.
//   2. On `pagehide` (bfcache store) close the open sources so the cached
//      page holds no doomed socket → no native error on restore.
//   3. On `pageshow` (bfcache restore) drive each closed source's own
//      `onerror` — the handler htmx-ext-sse assigned is a closure over its
//      element; with readyState CLOSED it runs the extension's reconnect
//      path, creating a fresh, fully-wired source through our factory.
//
// DOM-free helpers are exposed on window.SseBfcache for unit testing; the
// pagehide/pageshow wiring runs only in a browser (guarded on `document`).

(function (root) {
  var CLOSED = 2; // EventSource.CLOSED
  var live = new Set();
  var pending = [];
  var sourceHooks = [];

  // Run a hook over a source, swallowing handler errors so one bad subscriber
  // does not block the others (and the source still gets tracked).
  function runHook(cb, es) {
    try {
      cb(es);
    } catch (_) {
      // Subscriber threw — skip; other hooks/sources are unaffected.
    }
  }

  // Register a callback invoked for every htmx-created EventSource, so other
  // modules can share the single /sse stream instead of opening their own.
  // Existing live sources are replayed immediately, so a late subscriber still
  // wires up the source that is already open.
  function onSource(cb) {
    if (typeof cb !== "function") return;
    sourceHooks.push(cb);
    live.forEach(function (es) {
      runHook(cb, es);
    });
  }

  // Close every still-open source, returning the ones closed so the caller can
  // reconnect them later. Pure over the provided iterable (testable).
  function collectAndClose(sources) {
    var closed = [];
    sources.forEach(function (es) {
      if (es && es.readyState !== CLOSED) {
        closed.push(es);
        try {
          es.close();
        } catch (_) {
          // Already closing/closed — nothing to do.
        }
      }
    });
    return closed;
  }

  // Drive each source's own onerror handler (assigned by htmx-ext-sse, a
  // closure over its element) so the extension re-creates a fresh source.
  // Returns the count actually kicked (testable).
  function reconnect(sources) {
    var kicked = 0;
    sources.forEach(function (es) {
      if (es && typeof es.onerror === "function") {
        try {
          es.onerror(new Event("error"));
          kicked++;
        } catch (_) {
          // Handler threw — skip; other sources still reconnect.
        }
      }
    });
    return kicked;
  }

  function installFactory(htmx) {
    if (!htmx) return false;
    // Pre-define so htmx-ext-sse keeps ours (it only sets when undefined);
    // overwrite unconditionally in case the extension initialised first.
    htmx.createEventSource = function (url) {
      var es = new EventSource(url, { withCredentials: true });
      live.add(es);
      es.addEventListener("error", function () {
        if (es.readyState === CLOSED) live.delete(es);
      });
      sourceHooks.forEach(function (cb) {
        runHook(cb, es);
      });
      return es;
    };
    return true;
  }

  function init() {
    if (!installFactory(root.htmx)) return;
    root.addEventListener("pagehide", function (e) {
      if (!e.persisted) return; // only the bfcache path
      pending = collectAndClose(live);
      live.clear();
    });
    root.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      reconnect(pending);
      pending = [];
    });
  }

  root.SseBfcache = {
    collectAndClose: collectAndClose,
    reconnect: reconnect,
    onSource: onSource,
  };

  if (typeof root.document !== "undefined") init();
})(typeof window !== "undefined" ? window : globalThis);
