// Pomodoro timer — topbar widget. State persisted in localStorage.
// Phases: idle → work → break → idle (or loop).
// Right-click opens config popover (duration presets + custom). No inline styles.

(function () {
  var STORAGE_KEY = "pomodoro";
  var DURATION_KEY = "pomoDuration";
  var BREAK_SECS = 5 * 60;
  var DURATION_PRESETS = [25, 20, 15, 10, 5];

  var btn = document.getElementById("pomodoro-btn");
  if (!btn) return;

  var interval = null;
  var state = load();
  var popover = null;

  // ---------------------------------------------------------------------------
  // Duration helpers
  // ---------------------------------------------------------------------------

  function getWorkSecs() {
    try {
      var stored = localStorage.getItem(DURATION_KEY);
      if (stored) {
        var mins = parseInt(stored, 10);
        if (!isNaN(mins) && mins > 0) return mins * 60;
      }
    } catch (_) { /* ignore */ }
    return 25 * 60;
  }

  function setWorkMins(mins) {
    try {
      localStorage.setItem(DURATION_KEY, String(mins));
    } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return { phase: "idle", remaining: getWorkSecs(), running: false };
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
    playBeep();
    notify();

    if (state.phase === "work") {
      state.phase = "break";
      state.remaining = BREAK_SECS;
    } else {
      state.phase = "idle";
      state.remaining = getWorkSecs();
      state.running = false;
    }
    save();
    render();

    if (state.phase === "break") {
      state.running = true;
      save();
      render();
      interval = setInterval(tick, 1000);
    }
  }

  // ---------------------------------------------------------------------------
  // Sound — Web Audio API beep, no external file
  // ---------------------------------------------------------------------------

  function playBeep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch (_) { /* AudioContext unavailable */ }
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
      state.remaining = getWorkSecs();
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
    state = { phase: "idle", remaining: getWorkSecs(), running: false };
    save();
    render();
    document.title = document.title.replace(/^\[.*?\]\s*/, "");
  }

  // ---------------------------------------------------------------------------
  // Config popover
  // ---------------------------------------------------------------------------

  function buildPopover() {
    var el = document.createElement("div");
    el.id = "pomodoro-popover";
    el.className = "pomo-popover";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Pomodoro duration");

    var header = document.createElement("div");
    header.className = "pomo-popover__header";
    header.textContent = "Duration";

    var presets = document.createElement("div");
    presets.className = "pomo-popover__presets";
    DURATION_PRESETS.forEach(function (mins) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pomo-popover__preset";
      b.textContent = mins + "m";
      b.addEventListener("click", function () {
        setWorkMins(mins);
        if (state.phase === "idle") state.remaining = mins * 60;
        save();
        render();
        hidePopover();
      });
      presets.appendChild(b);
    });

    var customRow = document.createElement("div");
    customRow.className = "pomo-popover__custom";

    var input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "120";
    input.placeholder = "min";
    input.className = "pomo-popover__input";

    var setBtn = document.createElement("button");
    setBtn.type = "button";
    setBtn.className = "pomo-popover__set";
    setBtn.textContent = "Set";
    setBtn.addEventListener("click", function () {
      var mins = parseInt(input.value, 10);
      if (!isNaN(mins) && mins > 0) {
        setWorkMins(mins);
        if (state.phase === "idle") state.remaining = mins * 60;
        save();
        render();
        hidePopover();
      }
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") setBtn.click();
      if (e.key === "Escape") hidePopover();
    });

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "pomo-popover__reset";
    resetBtn.textContent = "Reset timer";
    resetBtn.addEventListener("click", function () {
      reset();
      hidePopover();
    });

    customRow.appendChild(input);
    customRow.appendChild(setBtn);
    el.appendChild(header);
    el.appendChild(presets);
    el.appendChild(customRow);
    el.appendChild(resetBtn);
    document.body.appendChild(el);
    return el;
  }

  function getPopover() {
    if (!popover) popover = buildPopover();
    return popover;
  }

  function showPopover() {
    var el = getPopover();
    var rect = btn.getBoundingClientRect();
    el.style.setProperty("--pomo-top", (rect.bottom + 8) + "px");
    el.style.setProperty(
      "--pomo-right",
      (window.innerWidth - rect.right) + "px",
    );
    el.classList.add("pomo-popover--open");
  }

  function hidePopover() {
    if (popover) popover.classList.remove("pomo-popover--open");
  }

  // ---------------------------------------------------------------------------
  // Events — left click: start/pause. Right click: config popover.
  // ---------------------------------------------------------------------------

  var pressTimer = null;

  btn.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    pressTimer = setTimeout(function () {
      pressTimer = null;
    }, 800);
  });

  btn.addEventListener("mouseup", function (e) {
    if (e.button !== 0) return;
    if (!pressTimer) return;
    clearTimeout(pressTimer);
    pressTimer = null;
    if (state.running) pause();
    else start();
  });

  btn.addEventListener("mouseleave", function () {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  });

  btn.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    showPopover();
  });

  document.addEventListener("click", function (e) {
    if (popover && popover.classList.contains("pomo-popover--open")) {
      if (!popover.contains(e.target) && e.target !== btn) hidePopover();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" && popover &&
      popover.classList.contains("pomo-popover--open")
    ) {
      hidePopover();
    }
  });

  if (state.running) interval = setInterval(tick, 1000);

  document.addEventListener("htmx:afterSettle", function () {
    if (state.phase !== "idle" && state.running) {
      document.title = "[" + fmt(state.remaining) + "] " +
        document.title.replace(/^\[.*?\]\s*/, "");
    }
  });

  render();
})();
