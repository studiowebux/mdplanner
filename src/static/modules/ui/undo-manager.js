// UndoManager
// In-memory undo/redo for textarea and text input elements.
// Keyboard shortcuts (Cmd+Z / Ctrl+Z, Cmd+Shift+Z / Ctrl+Y) are scoped to the
// focused element — they never fire for unfocused fields.
//
// Pattern: Strategy (snapshot capture) + Command (undo/redo operations)

// ---------------------------------------------------------------
// HistoryStack — bounded undo/redo buffer
// ---------------------------------------------------------------

class HistoryStack {
  /**
   * @param {number} maxSize - maximum number of snapshots to retain
   */
  constructor(maxSize = 50) {
    /** @type {Array<{value: string, selectionStart: number, selectionEnd: number}>} */
    this._snapshots = [];
    this._current = -1;
    this._maxSize = maxSize;
  }

  /**
   * Push a new snapshot, discarding any redo history beyond the current pointer.
   * When the buffer is full, the oldest snapshot is evicted (FIFO).
   * @param {{value: string, selectionStart: number, selectionEnd: number}} snapshot
   */
  push(snapshot) {
    // Truncate redo history
    this._snapshots = this._snapshots.slice(0, this._current + 1);
    this._snapshots.push(snapshot);

    if (this._snapshots.length > this._maxSize) {
      this._snapshots.shift();
      // _current stays at length - 1 since we shifted one off the front
    } else {
      this._current = this._snapshots.length - 1;
    }
  }

  /** @returns {boolean} */
  canUndo() {
    return this._current > 0;
  }

  /** @returns {boolean} */
  canRedo() {
    return this._current < this._snapshots.length - 1;
  }

  /**
   * Move the pointer back and return the previous snapshot.
   * @returns {{value: string, selectionStart: number, selectionEnd: number} | null}
   */
  undo() {
    if (!this.canUndo()) return null;
    this._current--;
    return this._snapshots[this._current];
  }

  /**
   * Move the pointer forward and return the next snapshot.
   * @returns {{value: string, selectionStart: number, selectionEnd: number} | null}
   */
  redo() {
    if (!this.canRedo()) return null;
    this._current++;
    return this._snapshots[this._current];
  }

  /**
   * Return the snapshot at the current pointer without moving it.
   * @returns {{value: string, selectionStart: number, selectionEnd: number} | null}
   */
  current() {
    return this._current >= 0 ? this._snapshots[this._current] : null;
  }

  /** Wipe all history. */
  clear() {
    this._snapshots = [];
    this._current = -1;
  }
}

// ---------------------------------------------------------------
// UndoManager — public API
// ---------------------------------------------------------------

const CAPTURE_DELAY_MS = 500;

export class UndoManager {
  /**
   * @param {number} [maxHistory=50] - maximum snapshots to retain
   */
  constructor(maxHistory = 50) {
    this._stack = new HistoryStack(maxHistory);
    /** @type {HTMLTextAreaElement | HTMLInputElement | null} */
    this._el = null;
    this._captureTimeout = null;
    /** @type {string | null} - value at the time of the last markSaved() call */
    this._savedValue = null;

    // Bind handlers so they can be removed by reference
    this._onInput = this._onInput.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  /**
   * Attach to an element. Takes an immediate snapshot as the saved baseline.
   * @param {HTMLTextAreaElement | HTMLInputElement} element
   */
  attach(element) {
    if (this._el) this.detach();

    this._el = element;
    this._stack.clear();

    // Capture the initial state as both the first history entry and saved baseline
    const initial = this._snapshot();
    this._stack.push(initial);
    this._savedValue = initial.value;

    element.addEventListener("input", this._onInput);
    element.addEventListener("keydown", this._onKeydown);
  }

  /**
   * Detach from the current element and clear all history.
   */
  detach() {
    if (!this._el) return;

    this._el.removeEventListener("input", this._onInput);
    this._el.removeEventListener("keydown", this._onKeydown);

    if (this._captureTimeout) {
      clearTimeout(this._captureTimeout);
      this._captureTimeout = null;
    }

    this._stack.clear();
    this._savedValue = null;
    this._el = null;
  }

  /**
   * Record the current element value as the saved baseline.
   * Call this after a successful save (debounced auto-save or manual save).
   */
  markSaved() {
    const snap = this._snapshot();
    if (snap) this._savedValue = snap.value;
  }

  /**
   * Returns true when the current value differs from the last saved value.
   * @returns {boolean}
   */
  hasUnsavedChanges() {
    if (!this._el || this._savedValue === null) return false;
    return this._el.value !== this._savedValue;
  }

  // ------------------------------------------------------------------
  // Private: event handlers
  // ------------------------------------------------------------------

  _onInput() {
    // Debounce snapshot capture — don't snapshot on every keystroke
    if (this._captureTimeout) clearTimeout(this._captureTimeout);
    this._captureTimeout = setTimeout(() => {
      this._captureTimeout = null;
      const snap = this._snapshot();
      if (!snap) return;

      // Only push if the value actually changed from the current top
      const current = this._stack.current();
      if (!current || current.value !== snap.value) {
        this._stack.push(snap);
      }
    }, CAPTURE_DELAY_MS);
  }

  _onKeydown(e) {
    // userAgentData is available in Chromium-based browsers; fall back to
    // navigator.platform (Safari/Firefox) then userAgent string as last resort.
    const platform = (
      navigator.userAgentData?.platform ??
      navigator.platform ??
      navigator.userAgent
    ).toLowerCase();
    const isMac = platform.includes("mac");
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (!mod) return;

    const key = e.key.toLowerCase();

    // Undo: Cmd+Z (Mac) or Ctrl+Z (Win/Linux)
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      this._applyUndo();
      return;
    }

    // Redo: Cmd+Shift+Z (Mac), Ctrl+Shift+Z or Ctrl+Y (Win/Linux)
    if ((key === "z" && e.shiftKey) || (!isMac && key === "y")) {
      e.preventDefault();
      e.stopPropagation();
      this._applyRedo();
    }
  }

  // ------------------------------------------------------------------
  // Private: undo/redo application
  // ------------------------------------------------------------------

  _applyUndo() {
    if (!this._el) return;

    // If there's a pending capture, flush it first so the current state is saved
    if (this._captureTimeout) {
      clearTimeout(this._captureTimeout);
      this._captureTimeout = null;
      const snap = this._snapshot();
      if (snap) {
        const current = this._stack.current();
        if (!current || current.value !== snap.value) {
          this._stack.push(snap);
        }
      }
    }

    const snap = this._stack.undo();
    if (snap) this._restore(snap);
  }

  _applyRedo() {
    if (!this._el) return;
    const snap = this._stack.redo();
    if (snap) this._restore(snap);
  }

  _restore(snap) {
    if (!this._el) return;
    this._el.value = snap.value;
    try {
      this._el.setSelectionRange(snap.selectionStart, snap.selectionEnd);
    } catch {
      // Some input types don't support setSelectionRange — ignore
    }
    // Dispatch input so auto-save schedules itself and UI stays in sync.
    // The _fromUndo flag lets the sidenav layer bypass the isSaving guard
    // so that a restored state is always queued for saving — even if a save
    // is currently in-flight.
    const evt = new Event("input", { bubbles: true });
    evt._fromUndo = true;
    this._el.dispatchEvent(evt);
  }

  // ------------------------------------------------------------------
  // Private: snapshot helper
  // ------------------------------------------------------------------

  _snapshot() {
    if (!this._el) return null;
    return {
      value: this._el.value,
      selectionStart: this._el.selectionStart ?? 0,
      selectionEnd: this._el.selectionEnd ?? 0,
    };
  }
}

export default UndoManager;
