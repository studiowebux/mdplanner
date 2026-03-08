/* state.js — App namespace, config, state, DOM refs, utilities */

const DEFAULT_CONFIG = {
  baseUrl: "http://localhost:11434",
  model: "",
  storageKey: "ollama-chat-history",
  systemPrompt: "",
  temperature: 0.7,
  topP: 0.9,
  numCtx: 8192,
  searchUrl: "",
  chatterboxUrl: "",
  chatterboxVoice: "",
  chatterboxAutoUnload: false,
  chatterboxSplit: false,
  chatterboxSplitChars: 400,
  chatterboxExageration: 0.5,
  chatterboxCfgWeight: 0.5,
};

export const App = {
  config: Object.assign(
    {},
    DEFAULT_CONFIG,
    JSON.parse(localStorage.getItem("ollama-ui-config")),
  ),

  chatHistory: [],
  abortController: null,
  isGenerating: false,
  pendingImages: [],
  searchEnabled: false,

  el: {
    messagesEl: document.getElementById("messages"),
    inputEl: document.getElementById("input"),
    typingEl: document.getElementById("typing"),
    sendBtn: document.getElementById("sendBtn"),
    configPanel: document.getElementById("configPanel"),
    scrollBottomBtn: document.getElementById("scrollBottomBtn"),
    connectionDot: document.getElementById("connectionDot"),
    headerModel: document.getElementById("headerModel"),
    headerCtx: document.getElementById("headerCtx"),
    ctxUsageEl: document.getElementById("ctxUsage"),
    ctxBarEl: document.getElementById("ctxBar"),
    imagePreview: document.getElementById("imagePreview"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    searchToggleBtn: document.getElementById("searchToggleBtn"),
  },

  apiUrl(path) {
    return App.config.baseUrl.replace(/\/$/, "") + path;
  },

  debounce(fn, ms) {
    let timer;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  loadHistory() {
    const branchKey = App.config.storageKey + "-branches";
    const savedBranches = localStorage.getItem(branchKey);
    if (savedBranches) {
      App.branches = JSON.parse(savedBranches);
      App.chatHistory = App.branches.forks[App.branches.current].history.slice();
    } else {
      App.branches = null;
      App.chatHistory =
        JSON.parse(localStorage.getItem(App.config.storageKey)) || [];
    }
  },

  saveHistory() {
    if (App.branches) {
      /* Sync active fork before persisting the whole branches object */
      App.branches.forks[App.branches.current].history =
        App.chatHistory.slice();
      localStorage.setItem(
        App.config.storageKey + "-branches",
        JSON.stringify(App.branches),
      );
    } else {
      localStorage.removeItem(App.config.storageKey + "-branches");
    }
    localStorage.setItem(
      App.config.storageKey,
      JSON.stringify(App.chatHistory),
    );
  },

  toggleTheme() {
    const current =
      document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ollama-ui-theme", next);
    App.el.themeToggleBtn.textContent = next === "dark" ? "Light" : "Dark";
  },
};

export function initThemeLabel() {
  const theme =
    document.documentElement.getAttribute("data-theme") || "dark";
  App.el.themeToggleBtn.textContent = theme === "dark" ? "Light" : "Dark";
}
