import { showToast } from "../ui/toast.js";

export class PomodoroModule {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  initWorker() {
    const workerCode = `
      let endTime = null;
      let interval = null;

      self.onmessage = function(e) {
        if (e.data.command === 'start') {
          endTime = e.data.endTime;
          if (interval) clearInterval(interval);
          interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            self.postMessage({ type: 'tick', remaining });
            if (remaining <= 0) {
              clearInterval(interval);
              self.postMessage({ type: 'complete' });
            }
          }, 1000);
        } else if (e.data.command === 'stop') {
          if (interval) clearInterval(interval);
          endTime = null;
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      this.tm.pomodoro.worker = new Worker(URL.createObjectURL(blob));

      this.tm.pomodoro.worker.onmessage = (e) => {
        if (e.data.type === "tick") {
          this.tm.pomodoro.timeLeft = e.data.remaining;
          this.updateDisplay();
        } else if (e.data.type === "complete") {
          this.complete();
        }
      };
    } catch (err) {
      console.warn("Web Worker not supported, falling back to setInterval");
      this.tm.pomodoro.worker = null;
    }
  }

  updateNotificationStatus() {
    const statusEl = document.getElementById("pomodoroNotifStatus");
    if (!statusEl) return;

    if (!("Notification" in window)) {
      statusEl.innerHTML =
        '<span class="text-muted">Notifications not supported</span>';
    } else if (Notification.permission === "granted") {
      statusEl.innerHTML =
        '<span class="text-success">Notifications enabled</span>';
    } else if (Notification.permission === "denied") {
      statusEl.innerHTML =
        '<span class="text-error">Notifications blocked - enable in browser settings</span>';
    } else {
      statusEl.innerHTML =
        '<button id="enableNotifBtn" class="text-primary hover:underline">Enable notifications</button>';
      document.getElementById("enableNotifBtn")?.addEventListener(
        "click",
        () => {
          Notification.requestPermission().then(() =>
            this.updateNotificationStatus()
          );
        },
      );
    }
  }

  start() {
    if (this.tm.pomodoro.isRunning) return;

    this.stopSound();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(() =>
        this.updateNotificationStatus()
      );
    }

    this.tm.pomodoro.isRunning = true;
    this.tm.pomodoro.endTime = Date.now() + this.tm.pomodoro.timeLeft * 1000;

    document.getElementById("pomodoroStartBtn").classList.add("hidden");
    document.getElementById("pomodoroStopBtn").classList.remove("hidden");
    document.getElementById("pomodoroDisplay").classList.remove("hidden");

    if (this.tm.pomodoro.worker) {
      this.tm.pomodoro.worker.postMessage({
        command: "start",
        endTime: this.tm.pomodoro.endTime,
      });
    } else {
      this.tm.pomodoro.interval = setInterval(() => this.tick(), 1000);
    }
    this.tick();
  }

  tick() {
    if (!this.tm.pomodoro.isRunning || !this.tm.pomodoro.endTime) return;

    const remaining = Math.max(
      0,
      Math.ceil((this.tm.pomodoro.endTime - Date.now()) / 1000),
    );
    this.tm.pomodoro.timeLeft = remaining;
    this.updateDisplay();

    if (remaining <= 0) {
      this.complete();
    }
  }

  stop() {
    this.tm.pomodoro.isRunning = false;
    this.tm.pomodoro.endTime = null;

    if (this.tm.pomodoro.worker) {
      this.tm.pomodoro.worker.postMessage({ command: "stop" });
    } else {
      clearInterval(this.tm.pomodoro.interval);
    }

    this.stopSound();
    try {
      if (this.tm.pomodoroNotification) {
        this.tm.pomodoroNotification.close();
        this.tm.pomodoroNotification = null;
      }
    } catch (e) {}

    this.tm.pomodoro.timeLeft = this.tm.pomodoro.duration;
    this.updateDisplay();

    document.getElementById("pomodoroStartBtn").classList.remove("hidden");
    document.getElementById("pomodoroStopBtn").classList.add("hidden");
    document.getElementById("pomodoroDisplay").classList.add("hidden");
  }

  setMode(mode) {
    this.stop();
    this.tm.pomodoro.mode = mode;

    const durations = {
      focus: 25 * 60,
      short: 5 * 60,
      long: 15 * 60,
      debug: 5,
    };
    const labels = {
      focus: "Focus Time",
      short: "Short Break",
      long: "Long Break",
      debug: "Debug (5s)",
    };

    this.tm.pomodoro.duration = durations[mode];
    this.tm.pomodoro.timeLeft = durations[mode];

    document.getElementById("pomodoroLabel").textContent = labels[mode];
    document.getElementById("pomodoroDisplay").classList.add("hidden");

    ["Focus", "Short", "Long", "Debug"].forEach((m) => {
      const btn = document.getElementById(`pomodoro${m}Btn`);
      if (!btn) return;
      if (m.toLowerCase() === mode) {
        btn.className =
          "px-3 py-1 rounded text-xs font-medium bg-inverse text-inverse";
      } else {
        btn.className =
          "px-3 py-1 rounded text-xs font-medium bg-active text-secondary";
      }
    });

    this.updateDisplay();
  }

  updateDisplay() {
    const minutes = Math.floor(this.tm.pomodoro.timeLeft / 60);
    const seconds = this.tm.pomodoro.timeLeft % 60;
    const display = `${minutes.toString().padStart(2, "0")}:${
      seconds.toString().padStart(2, "0")
    }`;

    document.getElementById("pomodoroTimer").textContent = display;
    document.getElementById("pomodoroDisplay").textContent = display;
  }

  complete() {
    this.tm.pomodoro.isRunning = false;
    this.tm.pomodoro.endTime = null;

    if (this.tm.pomodoro.worker) {
      this.tm.pomodoro.worker.postMessage({ command: "stop" });
    } else {
      clearInterval(this.tm.pomodoro.interval);
    }

    let title, body;
    if (
      this.tm.pomodoro.mode === "focus" || this.tm.pomodoro.mode === "debug"
    ) {
      if (this.tm.pomodoro.mode === "focus") {
        this.tm.pomodoro.count++;
        document.getElementById("pomodoroCount").textContent =
          this.tm.pomodoro.count;
      }
      title = "Pomodoro Complete!";
      body = "Great work! Time for a break.";
      showToast("Pomodoro complete! Take a break.");
    } else {
      title = "Break Over!";
      body = "Ready for another focus session?";
      showToast("Break over! Ready for another focus session?");
    }

    if (document.getElementById("pomodoroSoundToggle")?.checked) {
      this.playSound();
    }

    this.showNotification(title, body);
  }

  showNotification(title, body) {
    this.tm.pomodoroNotification = null;

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        this.tm.pomodoroNotification = new Notification(
          "MD Planner - " + title,
          {
            body: body + "\nClick to open app and stop alarm.",
            icon: "/favicon.ico",
            tag: "pomodoro-" + Date.now(),
            requireInteraction: true,
            silent: false,
          },
        );

        this.tm.pomodoroNotification.onclick = () => {
          window.focus();
          this.stop();
        };

        this.tm.pomodoroNotification.onclose = () => {
          this.stop();
        };
      } catch (e) {
        console.warn("Failed to show notification:", e);
      }
    }
  }

  stopSound() {
    if (this.tm.pomodoroAlarmInterval) {
      clearInterval(this.tm.pomodoroAlarmInterval);
      this.tm.pomodoroAlarmInterval = null;
    }
    try {
      if (
        this.tm.pomodoroAudioContext &&
        this.tm.pomodoroAudioContext.state !== "closed"
      ) {
        this.tm.pomodoroAudioContext.close();
      }
    } catch (e) {
      // Already closed
    }
    this.tm.pomodoroAudioContext = null;
  }

  playSound() {
    try {
      this.tm.pomodoroAudioContext =
        new (window.AudioContext || window.webkitAudioContext)();
      this.tm.pomodoroAlarmInterval = null;

      const playAlarmPattern = () => {
        const ctx = this.tm.pomodoroAudioContext;
        if (!ctx || ctx.state === "closed") return;

        const frequencies = [880, 660, 880, 660, 880];
        const startTime = ctx.currentTime;

        frequencies.forEach((freq, i) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.value = freq;
          oscillator.type = "square";
          gainNode.gain.value = 0.3;

          oscillator.start(startTime + i * 0.15);
          oscillator.stop(startTime + i * 0.15 + 0.12);
        });
      };

      playAlarmPattern();
      this.tm.pomodoroAlarmInterval = setInterval(playAlarmPattern, 2000);
    } catch (e) {
      console.warn("Audio not supported", e);
    }
  }

  bindEvents() {
    document
      .getElementById("pomodoroBtn")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("pomodoroDropdown").classList.toggle("hidden");
        this.updateNotificationStatus();
      });
    document
      .getElementById("pomodoroStartBtn")
      .addEventListener("click", () => this.start());
    document
      .getElementById("pomodoroStopBtn")
      .addEventListener("click", () => this.stop());
    document
      .getElementById("pomodoroFocusBtn")
      .addEventListener("click", () => this.setMode("focus"));
    document
      .getElementById("pomodoroShortBtn")
      .addEventListener("click", () => this.setMode("short"));
    document
      .getElementById("pomodoroLongBtn")
      .addEventListener("click", () => this.setMode("long"));
    document
      .getElementById("pomodoroDebugBtn")
      .addEventListener("click", () => this.setMode("debug"));

    // Close dropdown on outside click
    const dropdown = document.getElementById("pomodoroDropdown");
    const btn = document.getElementById("pomodoroBtn");
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });

    // Catch up pomodoro when tab becomes visible again
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.tm.pomodoro.isRunning) {
        this.tick();
      }
    });
  }
}
