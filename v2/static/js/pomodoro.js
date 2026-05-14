// Pomodoro timer — topbar widget. State persisted in localStorage.
// Phases: idle → work → break → idle (or loop).
// Left-click when idle: open settings. Left-click when running/paused: pause/resume.
// Right-click always opens settings. No inline styles.

(function () {
  var STORAGE_KEY = "pomodoro";
  var DURATION_KEY = "pomoDuration";
  var BREAK_SECS = 5 * 60;
  var DURATION_PRESETS = [5, 10, 15, 20, 25];

  var btn = document.getElementById("pomodoro-btn");
  if (!btn) return;

  var interval = null;
  var state = load();
  var popover = null;

  // ---------------------------------------------------------------------------
  // Duration helpers
  // ---------------------------------------------------------------------------

  function getWorkMins() {
    try {
      var stored = localStorage.getItem(DURATION_KEY);
      if (stored) {
        var mins = parseInt(stored, 10);
        if (!isNaN(mins) && mins > 0) return mins;
      }
    } catch (_) { /* ignore */ }
    return 25;
  }

  function getWorkSecs() {
    return getWorkMins() * 60;
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
    el.setAttribute("aria-label", "Pomodoro settings");

    // Header
    var header = document.createElement("div");
    header.className = "pomo-popover__header";
    header.textContent = "Session duration";

    // Preset pills
    var presets = document.createElement("div");
    presets.className = "pomo-popover__presets";
    DURATION_PRESETS.forEach(function (mins) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pomo-popover__preset";
      b.dataset.mins = String(mins);
      b.textContent = mins + " min";
      b.addEventListener("click", function () {
        setWorkMins(mins);
        if (state.phase !== "break") state.remaining = mins * 60;
        save();
        render();
        syncActivePreset();
      });
      presets.appendChild(b);
    });

    // Custom duration row
    var customLabel = document.createElement("div");
    customLabel.className = "pomo-popover__custom-label";
    customLabel.textContent = "Custom";

    var customRow = document.createElement("div");
    customRow.className = "pomo-popover__custom";

    var minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "pomo-popover__stepper";
    minusBtn.textContent = "−";

    var input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "120";
    input.className = "pomo-popover__input";

    var plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "pomo-popover__stepper";
    plusBtn.textContent = "+";

    var minLabel = document.createElement("span");
    minLabel.className = "pomo-popover__unit";
    minLabel.textContent = "min";

    function applyCustom() {
      var mins = parseInt(input.value, 10);
      if (!isNaN(mins) && mins >= 1 && mins <= 120) {
        setWorkMins(mins);
        // Apply immediately unless in break phase — break has its own fixed duration.
        if (state.phase !== "break") state.remaining = mins * 60;
        save();
        render();
        syncActivePreset();
      }
    }

    minusBtn.addEventListener("click", function () {
      var cur = parseInt(input.value, 10) || getWorkMins();
      if (cur > 1) {
        input.value = String(cur - 1);
        applyCustom();
      }
    });

    plusBtn.addEventListener("click", function () {
      var cur = parseInt(input.value, 10) || getWorkMins();
      if (cur < 120) {
        input.value = String(cur + 1);
        applyCustom();
      }
    });

    input.addEventListener("change", applyCustom);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        applyCustom();
        e.preventDefault();
      }
      if (e.key === "Escape") hidePopover();
    });

    customRow.appendChild(minusBtn);
    customRow.appendChild(input);
    customRow.appendChild(plusBtn);
    customRow.appendChild(minLabel);

    // Start / Reset actions
    var actions = document.createElement("div");
    actions.className = "pomo-popover__actions";

    var startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "pomo-popover__start";
    startBtn.id = "pomo-start-btn";
    startBtn.textContent = "Start";
    startBtn.addEventListener("click", function () {
      reset();
      start();
      hidePopover();
    });

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "pomo-popover__reset";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", function () {
      reset();
      hidePopover();
    });

    actions.appendChild(startBtn);
    actions.appendChild(resetBtn);

    el.appendChild(header);
    el.appendChild(presets);
    el.appendChild(customLabel);
    el.appendChild(customRow);
    el.appendChild(actions);
    document.body.appendChild(el);

    // Expose input ref for showPopover
    el._customInput = input;

    return el;
  }

  function syncActivePreset() {
    if (!popover) return;
    var currentMins = getWorkMins();
    popover.querySelectorAll(".pomo-popover__preset").forEach(function (b) {
      var mins = parseInt(b.dataset.mins, 10);
      b.classList.toggle("pomo-popover__preset--active", mins === currentMins);
    });
    // Update start button label based on current state
    var startBtn = popover.querySelector(".pomo-popover__start");
    if (startBtn) {
      startBtn.textContent = state.phase !== "idle" ? "Restart" : "Start";
    }
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
    // Populate custom input with current duration
    if (el._customInput) el._customInput.value = String(getWorkMins());
    syncActivePreset();
    el.classList.add("pomo-popover--open");
  }

  function hidePopover() {
    if (popover) popover.classList.remove("pomo-popover--open");
  }

  // ---------------------------------------------------------------------------
  // Events — idle left-click: open settings. running/paused: pause/resume.
  // Right-click always opens settings.
  // ---------------------------------------------------------------------------

  btn.addEventListener("click", function (e) {
    if (state.phase === "idle") {
      showPopover();
    } else {
      if (state.running) pause();
      else start();
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
