// Sticky note canvas — drag, resize, pan, zoom, inline edit, color, delete.
// /api/v1/sticky-notes/* endpoints. CSSOM for position/size (CSP-safe).
// htmx SSE handles view refreshes; this file owns all canvas interactions.

(function () {
  "use strict";

  // ── Constants ─────────────────────────────────────────────────────────────

  var API_BASE = "/api/v1/sticky-notes";
  var STORAGE_KEY = "sticky-canvas-state";
  var ZOOM_MIN = 0.25;
  var ZOOM_MAX = 2.0;
  var ZOOM_STEP = 0.1;
  var ZOOM_WHEEL_SENSITIVITY = 0.001;
  var NOTE_MIN_W = 140;
  var NOTE_MIN_H = 100;
  var NOTE_DEFAULT_W = 200;
  var NOTE_DEFAULT_H = 160;
  var NOTE_MAX_W = 800;
  var NOTE_MAX_H = 600;
  var SNAP_GRID = 8;
  var CONTENT_SAVE_DELAY_MS = 600;
  var FIT_PADDING = 48;
  var NOTE_COLORS = ["yellow", "pink", "blue", "green", "purple", "orange"];

  // ── State ─────────────────────────────────────────────────────────────────

  var zoom = 1;
  var panX = 0;
  var panY = 0;
  var isPanning = false;
  var isDragging = false;
  var isResizing = false;

  var panStartX = 0, panStartY = 0, panOriginX = 0, panOriginY = 0;

  var dragNote = null, dragStartMouseX = 0, dragStartMouseY = 0;
  var dragStartNoteX = 0, dragStartNoteY = 0;

  var resizeNote = null, resizeStartMouseX = 0, resizeStartMouseY = 0;
  var resizeStartW = 0, resizeStartH = 0;

  var contentSaveTimers = {};
  var pinchStartDist = 0, pinchStartZoom = 1;
  var isInteracting = false; // true during drag/resize — blocks SSE swap

  // JS-owned geometry overrides — survive SSE DOM swaps.
  // Keyed by note ID. Populated on drag/resize end, cleared on delete.
  var noteGeometry = {}; // { [id]: { x, y, w, h } }

  // ── Interaction lock — prevents htmx SSE swap mid-gesture ────────────────

  function lockInteraction() {
    isInteracting = true;
  }
  function unlockInteraction() {
    isInteracting = false;
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────

  function vp() {
    return document.querySelector("[data-canvas-viewport]");
  }
  function board() {
    return document.querySelector("[data-canvas-board]");
  }
  function zoomEl() {
    return document.querySelector("[data-canvas-zoom-display]");
  }
  function noteBy(id) {
    return document.querySelector("[data-sticky-id='" + id + "']");
  }
  function allNotes() {
    return document.querySelectorAll("[data-canvas-note]");
  }
  function isOnCanvas() {
    return !!vp();
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  function snap(v) {
    return Math.round(v / SNAP_GRID) * SNAP_GRID;
  }
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pinchDist(touches) {
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── API ───────────────────────────────────────────────────────────────────

  function api(method, path, body) {
    return fetch(API_BASE + path, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      if (!res.ok) throw new Error(method + " " + path + " → " + res.status);
      return res;
    });
  }

  // Flush all pending content saves before a DOM swap wipes the board.
  function flushPendingContentSaves() {
    Object.keys(contentSaveTimers).forEach(function (id) {
      clearTimeout(contentSaveTimers[id]);
      delete contentSaveTimers[id];
      var el = noteBy(id);
      if (!el) return;
      var content = el.querySelector("[data-sticky-content]");
      if (content) api("PUT", "/" + id, { content: content.textContent || "" });
    });
  }

  // ── Transform ─────────────────────────────────────────────────────────────

  function applyTransform() {
    var b = board();
    if (!b) return;
    b.style.setProperty(
      "transform",
      "translate(" + panX + "px," + panY + "px) scale(" + zoom + ")",
    );
  }

  function refreshZoomLabel() {
    var el = zoomEl();
    if (el) el.textContent = Math.round(zoom * 100) + "%";
  }

  function setZoom(newZoom, pivotX, pivotY) {
    newZoom = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);
    if (pivotX !== undefined) {
      panX = pivotX - (pivotX - panX) * (newZoom / zoom);
      panY = pivotY - (pivotY - panY) * (newZoom / zoom);
    }
    zoom = newZoom;
    applyTransform();
    refreshZoomLabel();
    saveState();
  }

  // ── State persistence ─────────────────────────────────────────────────────

  function saveState() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ zoom: zoom, panX: panX, panY: panY }),
      );
    } catch (_) {}
  }

  function restoreState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      zoom = typeof s.zoom === "number" ? clamp(s.zoom, ZOOM_MIN, ZOOM_MAX) : 1;
      panX = typeof s.panX === "number" ? s.panX : 0;
      panY = typeof s.panY === "number" ? s.panY : 0;
    } catch (_) {}
    applyTransform();
    refreshZoomLabel();
  }

  // ── Pan ───────────────────────────────────────────────────────────────────

  function panStart(x, y) {
    lockInteraction();
    isPanning = true;
    panStartX = x;
    panStartY = y;
    panOriginX = panX;
    panOriginY = panY;
    var v = vp();
    if (v) v.style.setProperty("cursor", "grabbing");
  }

  function panMove(x, y) {
    if (!isPanning) return;
    panX = panOriginX + (x - panStartX);
    panY = panOriginY + (y - panStartY);
    applyTransform();
  }

  function panEnd() {
    if (!isPanning) return;
    isPanning = false;
    unlockInteraction();
    var v = vp();
    if (v) v.style.setProperty("cursor", "grab");
    saveState();
  }

  // ── Drag ──────────────────────────────────────────────────────────────────

  function dragStart(noteEl, clientX, clientY) {
    lockInteraction();
    isDragging = true;
    dragNote = noteEl;
    dragStartMouseX = clientX;
    dragStartMouseY = clientY;
    dragStartNoteX = parseFloat(noteEl.style.left) || 0;
    dragStartNoteY = parseFloat(noteEl.style.top) || 0;
    noteEl.classList.add("is-dragging");
    noteEl.style.setProperty("z-index", "50");
  }

  function dragMove(clientX, clientY) {
    if (!isDragging || !dragNote) return;
    var x = snap(dragStartNoteX + (clientX - dragStartMouseX) / zoom);
    var y = snap(dragStartNoteY + (clientY - dragStartMouseY) / zoom);
    dragNote.style.setProperty("left", x + "px");
    dragNote.style.setProperty("top", y + "px");
  }

  function dragEnd() {
    if (!isDragging || !dragNote) return;
    isDragging = false;
    dragNote.classList.remove("is-dragging");
    dragNote.style.removeProperty("z-index");
    var id = dragNote.getAttribute("data-sticky-id");
    var x = parseFloat(dragNote.style.left) || 0;
    var y = parseFloat(dragNote.style.top) || 0;
    // Keep data attrs in sync so applyAllNoteGeometry never resets to stale coords
    dragNote.setAttribute("data-sticky-x", String(x));
    dragNote.setAttribute("data-sticky-y", String(y));
    api("PATCH", "/" + id + "/position", { x: x, y: y });
    dragNote = null;
    unlockInteraction();
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  function resizeStart(noteEl, clientX, clientY) {
    lockInteraction();
    isResizing = true;
    resizeNote = noteEl;
    resizeStartMouseX = clientX;
    resizeStartMouseY = clientY;
    resizeStartW = parseFloat(noteEl.style.width) || NOTE_DEFAULT_W;
    resizeStartH = parseFloat(noteEl.style.height) || NOTE_DEFAULT_H;
    noteEl.classList.add("is-resizing");
  }

  function resizeMove(clientX, clientY) {
    if (!isResizing || !resizeNote) return;
    var w = clamp(
      snap(resizeStartW + (clientX - resizeStartMouseX) / zoom),
      NOTE_MIN_W,
      NOTE_MAX_W,
    );
    var h = clamp(
      snap(resizeStartH + (clientY - resizeStartMouseY) / zoom),
      NOTE_MIN_H,
      NOTE_MAX_H,
    );
    resizeNote.style.setProperty("width", w + "px");
    resizeNote.style.setProperty("height", h + "px");
  }

  function resizeEnd() {
    if (!isResizing || !resizeNote) return;
    isResizing = false;
    resizeNote.classList.remove("is-resizing");
    var id = resizeNote.getAttribute("data-sticky-id");
    var w = parseFloat(resizeNote.style.width) || NOTE_DEFAULT_W;
    var h = parseFloat(resizeNote.style.height) || NOTE_DEFAULT_H;
    // Keep data attrs in sync so applyAllNoteGeometry never resets to stale size
    resizeNote.setAttribute("data-sticky-w", String(w));
    resizeNote.setAttribute("data-sticky-h", String(h));
    api("PATCH", "/" + id + "/size", { width: w, height: h });
    resizeNote = null;
    unlockInteraction();
  }

  // ── Content edit (debounced save) ─────────────────────────────────────────

  function scheduleSave(noteEl) {
    var id = noteEl.getAttribute("data-sticky-id");
    var el = noteEl.querySelector("[data-sticky-content]");
    if (!el) return;
    clearTimeout(contentSaveTimers[id]);
    noteEl.classList.add("is-dirty");
    contentSaveTimers[id] = setTimeout(function () {
      api("PUT", "/" + id, { content: el.textContent || "" })
        .then(function () {
          noteEl.classList.remove("is-dirty");
        })
        .catch(function () {
          noteEl.classList.add("is-save-error");
        });
      delete contentSaveTimers[id];
    }, CONTENT_SAVE_DELAY_MS);
  }

  // ── Color ─────────────────────────────────────────────────────────────────

  function applyColor(noteEl, color) {
    NOTE_COLORS.forEach(function (c) {
      noteEl.classList.remove("sticky-note--" + c);
    });
    noteEl.classList.add("sticky-note--" + color);
    noteEl.querySelectorAll("[data-sticky-color]").forEach(function (d) {
      d.classList.toggle(
        "is-active",
        d.getAttribute("data-sticky-color") === color,
      );
    });
    api("PUT", "/" + noteEl.getAttribute("data-sticky-id"), { color: color });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function removeNote(noteEl) {
    var id = noteEl.getAttribute("data-sticky-id");
    noteEl.classList.add("is-removing");
    // Wait for CSS fade-out, then delete
    setTimeout(function () {
      api("DELETE", "/" + id)
        .then(function () {
          noteEl.remove();
          checkEmpty();
        })
        .catch(function () {
          noteEl.classList.remove("is-removing");
        });
    }, 150);
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  function checkEmpty() {
    var b = board();
    if (!b) return;
    var hasNotes = b.querySelector("[data-canvas-note]");
    var empty = b.querySelector(".sticky-canvas__empty");
    if (!hasNotes && !empty) {
      var div = document.createElement("div");
      div.className = "sticky-canvas__empty";
      div.textContent = "Double-click anywhere to add your first note";
      b.appendChild(div);
    } else if (hasNotes && empty) {
      empty.remove();
    }
  }

  // ── Build note element (for JS-created notes) ─────────────────────────────

  function buildNoteEl(note) {
    var w = (note.size && note.size.width) || NOTE_DEFAULT_W;
    var h = (note.size && note.size.height) || NOTE_DEFAULT_H;
    var el = document.createElement("div");
    el.className = "sticky-note sticky-note--" + note.color + " is-entering";
    el.setAttribute("data-canvas-note", "");
    el.setAttribute("data-sticky-id", note.id);
    el.style.setProperty("left", note.position.x + "px");
    el.style.setProperty("top", note.position.y + "px");
    el.style.setProperty("width", w + "px");
    el.style.setProperty("height", h + "px");

    el.innerHTML =
      '<div class="sticky-note__handle" data-sticky-handle aria-label="Drag to move"></div>' +
      '<div class="sticky-note__content" contenteditable data-sticky-content>' +
      escHtml(note.content) +
      "</div>" +
      '<div class="sticky-note__toolbar">' +
      '<div class="sticky-note__colors">' +
      NOTE_COLORS.map(function (c) {
        return '<button type="button" class="sticky-note__color-dot sticky-note__color-dot--' +
          c +
          (note.color === c ? " is-active" : "") +
          '" data-sticky-color="' + c + '" aria-label="' + c + '"></button>';
      }).join("") +
      "</div>" +
      '<button type="button" class="sticky-note__delete" data-sticky-delete aria-label="Delete" title="Delete">&#x2715;</button>' +
      "</div>" +
      '<div class="sticky-note__resize-handle" data-sticky-resize></div>';

    // Trigger enter animation on next frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.remove("is-entering");
      });
    });
    return el;
  }

  // ── Create note at canvas position ────────────────────────────────────────

  function createNoteAt(boardX, boardY) {
    api("POST", "", {
      content: "",
      color: "yellow",
      position: { x: snap(boardX), y: snap(boardY) },
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (note) {
        var b = board();
        if (!b || !note || !note.id) return;
        var empty = b.querySelector(".sticky-canvas__empty");
        if (empty) empty.remove();
        var el = buildNoteEl(note);
        b.appendChild(el);
        // Auto-focus and place cursor ready for typing
        var content = el.querySelector("[data-sticky-content]");
        if (content) {
          setTimeout(function () {
            content.focus();
            var range = document.createRange();
            range.selectNodeContents(content);
            range.collapse(false);
            var sel = window.getSelection();
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }, 30);
        }
      });
  }

  // ── Fit all notes to viewport ─────────────────────────────────────────────

  function fitToScreen() {
    var v = vp();
    var notes = allNotes();
    if (!v) return;

    if (!notes.length) {
      zoom = 1;
      panX = 0;
      panY = 0;
      applyTransform();
      refreshZoomLabel();
      saveState();
      return;
    }

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    notes.forEach(function (n) {
      var x = parseFloat(n.style.left) || 0;
      var y = parseFloat(n.style.top) || 0;
      var w = parseFloat(n.style.width) || NOTE_DEFAULT_W;
      var h = parseFloat(n.style.height) || NOTE_DEFAULT_H;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    var cw = maxX - minX + FIT_PADDING * 2;
    var ch = maxY - minY + FIT_PADDING * 2;
    var newZoom = clamp(
      Math.min(v.clientWidth / cw, v.clientHeight / ch),
      ZOOM_MIN,
      1.0,
    );
    zoom = newZoom;
    panX = FIT_PADDING * zoom - minX * zoom;
    panY = FIT_PADDING * zoom - minY * zoom;
    applyTransform();
    refreshZoomLabel();
    saveState();
  }

  // ── Event wiring ──────────────────────────────────────────────────────────

  function wire() {
    var v = vp();
    var b = board();
    if (!v || !b) return;

    // ── Click delegation ────────────────────────────────────────────────

    document.addEventListener("click", function (e) {
      if (!isOnCanvas()) return;
      if (e.target.closest("[data-canvas-zoom-in]")) {
        setZoom(zoom + ZOOM_STEP);
        return;
      }
      if (e.target.closest("[data-canvas-zoom-out]")) {
        setZoom(zoom - ZOOM_STEP);
        return;
      }
      if (e.target.closest("[data-canvas-fit]")) {
        fitToScreen();
        return;
      }
      if (e.target.closest("[data-canvas-add]")) {
        var viewport = vp();
        if (!viewport) return;
        var rect = viewport.getBoundingClientRect();
        var cx = (rect.width / 2 - panX) / zoom - NOTE_DEFAULT_W / 2;
        var cy = (rect.height / 2 - panY) / zoom - NOTE_DEFAULT_H / 2;
        createNoteAt(cx, cy);
        return;
      }

      var dot = e.target.closest("[data-sticky-color]");
      if (dot) {
        var noteEl = dot.closest("[data-canvas-note]");
        if (noteEl) applyColor(noteEl, dot.getAttribute("data-sticky-color"));
        return;
      }

      if (e.target.closest("[data-sticky-delete]")) {
        var noteEl = e.target.closest("[data-canvas-note]");
        if (noteEl) removeNote(noteEl);
        return;
      }
    });

    // ── Double-click on empty canvas → create note ──────────────────────

    document.addEventListener("dblclick", function (e) {
      if (!isOnCanvas()) return;
      var viewport = vp();
      if (!viewport || e.target.closest("[data-canvas-note]")) return;
      if (!e.target.closest("[data-canvas-viewport]")) return;
      var rect = viewport.getBoundingClientRect();
      var boardX = (e.clientX - rect.left - panX) / zoom - NOTE_DEFAULT_W / 2;
      var boardY = (e.clientY - rect.top - panY) / zoom - NOTE_DEFAULT_H / 2;
      createNoteAt(boardX, boardY);
    });

    // ── Content: input + blur ───────────────────────────────────────────

    document.addEventListener("input", function (e) {
      if (!isOnCanvas()) return;
      if (!e.target.hasAttribute("data-sticky-content")) return;
      var noteEl = e.target.closest("[data-canvas-note]");
      if (noteEl) scheduleSave(noteEl);
    });

    document.addEventListener("blur", function (e) {
      if (!isOnCanvas()) return;
      if (!e.target.hasAttribute("data-sticky-content")) return;
      var noteEl = e.target.closest("[data-canvas-note]");
      if (noteEl) scheduleSave(noteEl);
    }, true);

    // ── Keyboard ────────────────────────────────────────────────────────

    document.addEventListener("keydown", function (e) {
      if (!isOnCanvas()) return;

      if (
        e.key === "Escape" && document.activeElement &&
        document.activeElement.hasAttribute("data-sticky-content")
      ) {
        document.activeElement.blur();
        return;
      }
      if ((e.key === "+" || e.key === "=") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setZoom(zoom + ZOOM_STEP);
        return;
      }
      if (e.key === "-" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setZoom(zoom - ZOOM_STEP);
        return;
      }
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setZoom(1);
        return;
      }
    });

    // ── Mouse: pan / drag / resize ──────────────────────────────────────

    document.addEventListener("mousedown", function (e) {
      if (!isOnCanvas() || e.button !== 0) return;

      if (e.target.closest("[data-sticky-resize]")) {
        e.preventDefault();
        resizeStart(
          e.target.closest("[data-canvas-note]"),
          e.clientX,
          e.clientY,
        );
        return;
      }
      if (e.target.closest("[data-sticky-handle]")) {
        e.preventDefault();
        var note = e.target.closest("[data-canvas-note]");
        if (note) dragStart(note, e.clientX, e.clientY);
        return;
      }
      if (e.target.closest("[data-canvas-viewport]") && !note) {
        panStart(e.clientX, e.clientY);
      }
    });

    document.addEventListener("mousemove", function (e) {
      if (isDragging) {
        dragMove(e.clientX, e.clientY);
        return;
      }
      if (isResizing) {
        resizeMove(e.clientX, e.clientY);
        return;
      }
      if (isPanning) panMove(e.clientX, e.clientY);
    });

    document.addEventListener("mouseup", function () {
      if (isDragging) dragEnd();
      else if (isResizing) resizeEnd();
      else if (isPanning) panEnd();
    });

    // If the mouse leaves the window mid-gesture (e.g. moved to another browser),
    // mouseup never fires here — force-end any active gesture so isInteracting
    // doesn't stay permanently true and block all future SSE swaps.
    function forceEndGesture() {
      if (isDragging) dragEnd();
      else if (isResizing) resizeEnd();
      else if (isPanning) panEnd();
    }
    document.addEventListener("mouseleave", forceEndGesture);
    window.addEventListener("blur", forceEndGesture);

    // ── Ctrl/Cmd+scroll to zoom ─────────────────────────────────────────

    document.addEventListener("wheel", function (e) {
      if (!isOnCanvas()) return;
      if (!e.ctrlKey && !e.metaKey) return;
      var viewport = vp();
      if (!viewport || !e.target.closest("[data-canvas-viewport]")) return;
      e.preventDefault();
      var rect = viewport.getBoundingClientRect();
      var pivotX = e.clientX - rect.left;
      var pivotY = e.clientY - rect.top;
      setZoom(
        zoom * (1 + (-e.deltaY * ZOOM_WHEEL_SENSITIVITY)),
        pivotX,
        pivotY,
      );
    }, { passive: false });

    // ── Touch: pan + pinch-zoom ─────────────────────────────────────────

    document.addEventListener("touchstart", function (e) {
      if (!isOnCanvas()) return;
      if (e.touches.length === 2) {
        pinchStartDist = pinchDist(e.touches);
        pinchStartZoom = zoom;
        return;
      }
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      var note = e.target.closest("[data-canvas-note]");
      if (e.target.closest("[data-sticky-handle]")) {
        dragStart(note, t.clientX, t.clientY);
      } else if (e.target.closest("[data-canvas-viewport]") && !note) {
        panStart(t.clientX, t.clientY);
      }
    }, { passive: true });

    document.addEventListener("touchmove", function (e) {
      if (!isOnCanvas()) return;
      if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        var viewport = vp();
        if (!viewport) return;
        var rect = viewport.getBoundingClientRect();
        var midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 -
          rect.left;
        var midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        setZoom(
          pinchStartZoom * (pinchDist(e.touches) / pinchStartDist),
          midX,
          midY,
        );
        return;
      }
      if (!isDragging && !isPanning) return;
      e.preventDefault();
      var t = e.touches[0];
      if (isDragging) dragMove(t.clientX, t.clientY);
      else panMove(t.clientX, t.clientY);
    }, { passive: false });

    document.addEventListener("touchend", function () {
      if (!isOnCanvas()) return;
      if (isDragging) dragEnd();
      else if (isPanning) panEnd();
      pinchStartDist = 0;
    });

    // ── sticky_note.moved — apply geometry in-place, no DOM swap ────────
    // htmx SSE ext dispatches a CustomEvent named after the SSE event type
    // on the element with sse-connect (<main>). Parse the JSON data payload
    // and move/resize the matching note directly — no flash, no full refresh.

    document.addEventListener("htmx:sseMessage", function (e) {
      if (!isOnCanvas()) return;
      if (!e.detail || e.detail.type !== "sticky_note.moved") return;
      var raw = e.detail.data;
      if (!raw) return;
      var data;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        return;
      }
      var noteEl = document.querySelector(
        "[data-canvas-note][data-sticky-id='" + data.id + "']",
      );
      if (!noteEl) return;
      // Skip if this is the note currently being dragged/resized locally
      if (noteEl === dragNote || noteEl === resizeNote) return;
      if (data.x !== undefined && data.y !== undefined) {
        noteEl.style.setProperty("left", data.x + "px");
        noteEl.style.setProperty("top", data.y + "px");
        noteEl.setAttribute("data-sticky-x", String(data.x));
        noteEl.setAttribute("data-sticky-y", String(data.y));
        noteGeometry[data.id] = noteGeometry[data.id] || {};
        noteGeometry[data.id].x = data.x;
        noteGeometry[data.id].y = data.y;
      }
      if (data.width !== undefined && data.height !== undefined) {
        noteEl.style.setProperty("width", data.width + "px");
        noteEl.style.setProperty("height", data.height + "px");
        noteEl.setAttribute("data-sticky-w", String(data.width));
        noteEl.setAttribute("data-sticky-h", String(data.height));
        noteGeometry[data.id] = noteGeometry[data.id] || {};
        noteGeometry[data.id].w = data.width;
        noteGeometry[data.id].h = data.height;
      }
    });

    // ── Block htmx SSE swap during active gesture ───────────────────────

    document.addEventListener("htmx:beforeSwap", function (e) {
      if (!isOnCanvas()) return;
      if (isInteracting) {
        // Cancel the swap — htmx will retry on next SSE event
        e.preventDefault();
      } else {
        // Flush any unsaved content before DOM is replaced
        flushPendingContentSaves();
      }
    });

    // ── Restore zoom/pan after htmx replaces the canvas DOM ─────────────

    document.addEventListener("htmx:afterSettle", function () {
      if (!isOnCanvas()) return;
      // outerHTML swaps give a detached target — just check board presence
      applyAllNoteGeometry();
      restoreState();
      checkEmpty();
    });
  }

  // ── Canvas height — computed like org-tree to escape domain-page padding ──

  function sizeCanvas() {
    var canvas = document.querySelector("[data-canvas]");
    if (!canvas) return;
    var top = canvas.getBoundingClientRect().top;
    var cs = getComputedStyle(canvas);
    var borderV = parseFloat(cs.borderTopWidth) +
      parseFloat(cs.borderBottomWidth);
    var page = canvas.closest(".domain-page");
    var padB = page ? parseFloat(getComputedStyle(page).paddingBottom) : 0;
    var h = window.innerHeight - top - borderV - padB;
    document.documentElement.style.setProperty(
      "--sticky-canvas-height",
      h + "px",
    );
  }

  // ── Apply SSR data-attr geometry via CSSOM (CSP-safe, no inline styles) ──

  function applyNoteGeometry(el) {
    var x = el.getAttribute("data-sticky-x");
    var y = el.getAttribute("data-sticky-y");
    var w = el.getAttribute("data-sticky-w");
    var h = el.getAttribute("data-sticky-h");
    if (x !== null) el.style.setProperty("left", x + "px");
    if (y !== null) el.style.setProperty("top", y + "px");
    if (w !== null) el.style.setProperty("width", w + "px");
    if (h !== null) el.style.setProperty("height", h + "px");
  }

  function applyAllNoteGeometry() {
    allNotes().forEach(applyNoteGeometry);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    if (!isOnCanvas()) return;
    sizeCanvas();
    applyAllNoteGeometry();
    restoreState();
    checkEmpty();
    wire();
    window.addEventListener("resize", sizeCanvas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
