/* state.js — App namespace, config, state, DOM refs, utilities */

var DEFAULT_CONFIG = {
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

window.App = {
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

  apiUrl: function (path) {
    return App.config.baseUrl.replace(/\/$/, "") + path;
  },

  debounce: function (fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  },

  escapeHtml: function (text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  loadHistory: function () {
    var branchKey = App.config.storageKey + "-branches";
    var savedBranches = localStorage.getItem(branchKey);
    if (savedBranches) {
      App.branches = JSON.parse(savedBranches);
      App.chatHistory = App.branches.forks[App.branches.current].history.slice();
    } else {
      App.branches = null;
      App.chatHistory = JSON.parse(localStorage.getItem(App.config.storageKey)) || [];
    }
  },

  saveHistory: function () {
    if (App.branches) {
      /* Sync active fork before persisting the whole branches object */
      App.branches.forks[App.branches.current].history = App.chatHistory.slice();
      localStorage.setItem(
        App.config.storageKey + "-branches",
        JSON.stringify(App.branches),
      );
    } else {
      localStorage.removeItem(App.config.storageKey + "-branches");
    }
    localStorage.setItem(App.config.storageKey, JSON.stringify(App.chatHistory));
  },

  toggleTheme: function () {
    var current = document.documentElement.getAttribute("data-theme") || "dark";
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ollama-ui-theme", next);
    App.el.themeToggleBtn.textContent = next === "dark" ? "Light" : "Dark";
  },
};

/* Set initial toggle button label */
(function () {
  var theme = document.documentElement.getAttribute("data-theme") || "dark";
  App.el.themeToggleBtn.textContent = theme === "dark" ? "Light" : "Dark";
})();
