// view-mode-shortcuts.js — chord shortcut for switching view modes.
// Press m, then a mode key within 1500 ms:
//   m g → grid   m l → table (list)   m t → timeline
//   m b → board  m o → org            m c → card
// Works on any domain page that has view toggle buttons.

(function () {
  var CHORD_TIMEOUT = 1500;
  var MODE_MAP = {
    g: "grid",
    l: "table",
    t: "timeline",
    b: "board",
    o: "org",
    c: "card",
  };

  var chordActive = false;
  var chordTimer = null;

  function inputFocused() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return (
      tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" ||
      el.isContentEditable
    );
  }

  function cancelChord() {
    chordActive = false;
    if (chordTimer) {
      clearTimeout(chordTimer);
      chordTimer = null;
    }
  }

  function activateView(mode) {
    var btn = document.querySelector(
      '.view-toggle [hx-get*="view=' + mode + '"]',
    );
    if (btn) btn.click();
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (inputFocused()) return;

    if (chordActive) {
      cancelChord();
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
      var mode = MODE_MAP[e.key];
      if (mode) {
        e.preventDefault();
        activateView(mode);
      }
      return;
    }

    if (e.key === "m") {
      e.preventDefault();
      chordActive = true;
      chordTimer = setTimeout(cancelChord, CHORD_TIMEOUT);
    }
  });
})();
