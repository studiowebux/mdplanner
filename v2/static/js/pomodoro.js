// Pomodoro timer — topbar widget. State persisted in localStorage.
// Phases: idle → work (25min) → break (5min) → idle (or loop).
// No inline styles. Uses data-phase attr + CSS classes for theming.

(function () {
  var WORK_SECS = 25 * 60;
  var BREAK_SECS = 5 * 60;
  var STORAGE_KEY = "pomodoro";

  var btn = document.getElementById("pomodoro-btn");
  if (!btn) return;

  var interval = null;
  var state = load();

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return { phase: "idle", remaining: WORK_SECS, running: false };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Display
  // ---------------------------------------------------------------------------

  function fmt(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function render() {
    btn.textContent = state.phase === "idle"
      ? "Pomodoro"
      : fmt(state.remaining);
    btn.dataset.phase = state.phase;
    btn.dataset.running = state.running ? "true" : "false";
    btn.setAttribute(
      "aria-label",
      state.phase === "idle"
        ? "Start Pomodoro"
        : (state.running ? "Pause" : "Resume") + " — " + fmt(state.remaining),
    );

    // Update document title only while a session is active
    if (state.phase !== "idle" && state.running) {
      document.title = "[" + fmt(state.remaining) + "] " +
        document.title.replace(/^\[.*?\]\s*/, "");
    } else if (state.phase === "idle") {
      document.title = document.title.replace(/^\[.*?\]\s*/, "");
    }
  }

  // ---------------------------------------------------------------------------
  // Timer tick
  // ---------------------------------------------------------------------------

  function tick() {
    if (!state.running) return;
    state.remaining -= 1;
    if (state.remaining <= 0) {
      phaseEnd();
    } else {
      save();
      render();
    }
  }

  function phaseEnd() {
    clearInterval(interval);
    interval = null;
    notify();

    if (state.phase === "work") {
      state.phase = "break";
      state.remaining = BREAK_SECS;
    } else {
      state.phase = "idle";
      state.remaining = WORK_SECS;
      state.running = false;
    }
    save();
    render();

    // Auto-start break, stop after break
    if (state.phase === "break") {
      state.running = true;
      save();
      render();
      interval = setInterval(tick, 1000);
    }
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  function notify() {
    var msg = state.phase === "work"
      ? "Work session done — take a break!"
      : "Break over — back to work!";
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification("Pomodoro", { body: msg, icon: "/favicon.ico" });
    }
  }

  function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  function start() {
    requestNotificationPermission();
    if (state.phase === "idle") {
      state.phase = "work";
      state.remaining = WORK_SECS;
    }
    state.running = true;
    save();
    render();
    if (!interval) interval = setInterval(tick, 1000);
  }

  function pause() {
    state.running = false;
    save();
    render();
    clearInterval(interval);
    interval = null;
  }

  function reset() {
    clearInterval(interval);
    interval = null;
    state = { phase: "idle", remaining: WORK_SECS, running: false };
    save();
    render();
    document.title = document.title.replace(/^\[.*?\]\s*/, "");
  }

  // ---------------------------------------------------------------------------
  // Click — left click: start/pause. Right click / long press: reset.
  // ---------------------------------------------------------------------------

  var pressTimer = null;

  btn.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    pressTimer = setTimeout(function () {
      pressTimer = null;
      reset();
    }, 800);
  });

  btn.addEventListener("mouseup", function (e) {
    if (e.button !== 0) return;
    if (!pressTimer) return; // was a long press, already handled
    clearTimeout(pressTimer);
    pressTimer = null;
    if (state.running) {
      pause();
    } else {
      start();
    }
  });

  btn.addEventListener("mouseleave", function () {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  });

  btn.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    reset();
  });

  // Resume tick if tab was reopened mid-session
  if (state.running) {
    interval = setInterval(tick, 1000);
  }

  // Restore document title prefix after htmx page swaps
  document.addEventListener("htmx:afterSettle", function () {
    if (state.phase !== "idle" && state.running) {
      document.title = "[" + fmt(state.remaining) + "] " +
        document.title.replace(/^\[.*?\]\s*/, "");
    }
  });

  render();
})();
