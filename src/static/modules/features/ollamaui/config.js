/* config.js — Config panel logic, sliders, model loading, connection status */

App.toggleConfig = function () {
  App.el.configPanel.style.display =
    App.el.configPanel.style.display === "flex" ? "none" : "flex";
};

App.populateConfigUI = function () {
  document.getElementById("configBaseUrl").value = App.config.baseUrl;
  document.getElementById("configStorageKey").value = App.config.storageKey;
  document.getElementById("configSystemPrompt").value =
    App.config.systemPrompt || "";
  document.getElementById("configTemperature").value = App.config.temperature;
  document.getElementById("tempValue").textContent = App.config.temperature;
  document.getElementById("configTopP").value = App.config.topP;
  document.getElementById("topPValue").textContent = App.config.topP;
  document.getElementById("configNumCtx").value = App.config.numCtx;
  document.getElementById("numCtxValue").textContent = App.config.numCtx;
  document.getElementById("configSearchUrl").value = App.config.searchUrl || "";
  document.getElementById("configChatterboxUrl").value = App.config.chatterboxUrl || "";
  document.getElementById("configChatterboxAutoUnload").checked = App.config.chatterboxAutoUnload || false;
  document.getElementById("configChatterboxSplit").checked = App.config.chatterboxSplit || false;
  document.getElementById("configChatterboxSplitChars").value = App.config.chatterboxSplitChars || 400;
  document.getElementById("configChatterboxExageration").value = App.config.chatterboxExageration ?? 0.5;
  document.getElementById("ttsExagerationValue").textContent = App.config.chatterboxExageration ?? 0.5;
  document.getElementById("configChatterboxCfgWeight").value = App.config.chatterboxCfgWeight ?? 0.5;
  document.getElementById("ttsCfgWeightValue").textContent = App.config.chatterboxCfgWeight ?? 0.5;
  App.loadChatterboxVoices();
};

App.saveConfig = function () {
  var prevStorageKey = App.config.storageKey;

  App.config.baseUrl = document.getElementById("configBaseUrl").value.trim();
  App.config.model = document.getElementById("configModelSelect").value;
  App.config.storageKey = document
    .getElementById("configStorageKey")
    .value.trim();
  App.config.systemPrompt = document
    .getElementById("configSystemPrompt")
    .value.trim();
  App.config.temperature = parseFloat(
    document.getElementById("configTemperature").value,
  );
  App.config.topP = parseFloat(document.getElementById("configTopP").value);
  App.config.numCtx =
    parseInt(document.getElementById("configNumCtx").value, 10) || 8192;
  App.config.searchUrl = document
    .getElementById("configSearchUrl")
    .value.trim();
  App.config.chatterboxUrl = document.getElementById("configChatterboxUrl").value.trim();
  App.config.chatterboxVoice = document.getElementById("configChatterboxVoice").value;
  App.config.chatterboxAutoUnload = document.getElementById("configChatterboxAutoUnload").checked;
  App.config.chatterboxSplit = document.getElementById("configChatterboxSplit").checked;
  App.config.chatterboxSplitChars = parseInt(document.getElementById("configChatterboxSplitChars").value, 10) || 400;
  App.config.chatterboxExageration = parseFloat(document.getElementById("configChatterboxExageration").value);
  App.config.chatterboxCfgWeight = parseFloat(document.getElementById("configChatterboxCfgWeight").value);

  localStorage.setItem("ollama-ui-config", JSON.stringify(App.config));

  /* Only reload + re-render history if the storage key changed.
     Re-rendering wipes messagesEl and kills any in-progress stream. */
  if (App.config.storageKey !== prevStorageKey) {
    App.loadHistory();
    App.renderHistory();
    App.renderBranchNav();
  }

  App.toggleConfig();
};

/* Slider live values */

document
  .getElementById("configTemperature")
  .addEventListener("input", function (e) {
    document.getElementById("tempValue").textContent = e.target.value;
  });

document
  .getElementById("configTopP")
  .addEventListener("input", function (e) {
    document.getElementById("topPValue").textContent = e.target.value;
  });

document
  .getElementById("configNumCtx")
  .addEventListener("input", function (e) {
    document.getElementById("numCtxValue").textContent = e.target.value;
  });

/* Auto-refresh models on URL change */

document.getElementById("configBaseUrl").addEventListener(
  "input",
  App.debounce(function () {
    var url = document.getElementById("configBaseUrl").value.trim();
    if (url) {
      var prevUrl = App.config.baseUrl;
      App.config.baseUrl = url;
      App.loadModels().finally(function () {
        App.config.baseUrl = prevUrl;
      });
    }
  }, 800),
);

/* Model loading */

App.loadModels = async function () {
  var select = document.getElementById("configModelSelect");
  select.innerHTML = '<option value="">Loading...</option>';

  try {
    var res = await fetch(App.apiUrl("/api/tags"));
    var data = await res.json();

    select.innerHTML = "";
    data.models.forEach(function (m) {
      var option = document.createElement("option");
      option.value = m.name;
      option.textContent = m.name;
      select.appendChild(option);
    });

    if (App.config.model) {
      select.value = App.config.model;
    }
    if (!select.value && data.models.length > 0) {
      App.config.model = data.models[0].name;
      select.value = App.config.model;
    }

    App.updateHeaderModel();
    App.updateConnectionStatus(true);
  } catch (err) {
    select.innerHTML = '<option value="">Error loading models</option>';
    App.updateConnectionStatus(false);
  }
};

/* Model info (context size) */

App.fetchModelInfo = async function (modelName) {
  try {
    var res = await fetch(App.apiUrl("/api/show"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    });
    var data = await res.json();

    var info = data.model_info || {};
    var keys = Object.keys(info);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].endsWith(".context_length")) {
        var ctx = info[keys[i]];
        if (ctx >= 1000) {
          App.el.headerCtx.textContent = Math.round(ctx / 1024) + "K ctx";
        } else {
          App.el.headerCtx.textContent = ctx + " ctx";
        }
        App.el.headerCtx.style.display = "";

        /* Auto-update num_ctx slider to match model's native context */
        App.config.numCtx = ctx;
        document.getElementById("configNumCtx").value = ctx;
        document.getElementById("numCtxValue").textContent = ctx;
        return;
      }
    }
    App.el.headerCtx.style.display = "none";
  } catch (e) {
    App.el.headerCtx.style.display = "none";
  }
};

/* Chatterbox voice loader */

App.loadChatterboxVoices = async function () {
  var select = document.getElementById("configChatterboxVoice");
  var base = (document.getElementById("configChatterboxUrl").value.trim() || App.config.chatterboxUrl || "").replace(/\/$/, "");
  /* Both Caddy and Chatterbox set Access-Control-Allow-Origin: * causing
   * duplicate CORS headers. Route through the mdplanner proxy instead. */
  try {
    var res = await fetch("/api/tts/voices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttsUrl: base }),
    });
    var data = await res.json();
    select.innerHTML = "";
    (data.voices || []).forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    if (App.config.chatterboxVoice) select.value = App.config.chatterboxVoice;
  } catch (e) {
    select.innerHTML = '<option value="">No voices found</option>';
  }
};

document.getElementById("configChatterboxExageration").addEventListener("input", function (e) {
  document.getElementById("ttsExagerationValue").textContent = e.target.value;
});

document.getElementById("configChatterboxCfgWeight").addEventListener("input", function (e) {
  document.getElementById("ttsCfgWeightValue").textContent = e.target.value;
});

document.getElementById("configChatterboxUrl").addEventListener(
  "input",
  App.debounce(function () { App.loadChatterboxVoices(); }, 800),
);

/* Unload model from VRAM */

/* silent=true: skip status messages (used when caller owns the typing indicator) */
App.unloadModel = async function (silent) {
  var model = App.config.model || document.getElementById("configModelSelect").value;
  if (!model) {
    if (!silent) {
      App.el.typingEl.textContent = "No model selected.";
      setTimeout(function () { App.el.typingEl.textContent = ""; }, 2000);
    }
    return;
  }

  if (!silent) App.el.typingEl.textContent = "Unloading " + model + "...";

  try {
    var res = await fetch(App.apiUrl("/api/generate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: model, keep_alive: 0 }),
    });

    if (!silent) {
      App.el.typingEl.textContent = res.ok
        ? model + " unloaded from VRAM."
        : "Failed to unload: HTTP " + res.status;
    }
  } catch (e) {
    if (!silent) App.el.typingEl.textContent = "Failed to unload: " + e.message;
  }

  if (!silent) setTimeout(function () { App.el.typingEl.textContent = ""; }, 3000);
};

App.updateHeaderModel = function () {
  var model = document.getElementById("configModelSelect").value;
  if (model) {
    App.el.headerModel.textContent = model;
    App.el.headerModel.style.display = "";
    App.config.model = model;
    App.fetchModelInfo(model);
  } else {
    App.el.headerModel.style.display = "none";
    App.el.headerCtx.style.display = "none";
  }
};

document
  .getElementById("configModelSelect")
  .addEventListener("change", App.updateHeaderModel);

/* Connection status */

App.updateConnectionStatus = function (ok) {
  App.el.connectionDot.className =
    "connection-dot " + (ok ? "connected" : "disconnected");
  App.el.connectionDot.title = ok ? "Connected to Ollama" : "Disconnected from Ollama";
};

App.checkConnection = async function () {
  try {
    var res = await fetch(App.apiUrl("/api/tags"));
    App.updateConnectionStatus(res.ok);
  } catch (e) {
    App.updateConnectionStatus(false);
    if (
      location.protocol === "https:" &&
      App.config.baseUrl.startsWith("http://")
    ) {
      App.el.typingEl.textContent =
        "Mixed content blocked: HTTPS page cannot reach HTTP Ollama. Serve this app over HTTP or use localhost.";
    }
  }
};

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) App.checkConnection();
});
