/* actions.js — regenerate, edit/resend, export, image paste/attach, web search */

/* -------- Web Search -------- */

App.toggleSearch = function () {
  App.searchEnabled = !App.searchEnabled;
  App.el.searchToggleBtn.className =
    "search-toggle-btn" + (App.searchEnabled ? " active" : "");
};

App.webSearch = async function (query) {
  if (!App.config.searchUrl) return null;

  try {
    var base = App.config.searchUrl.replace(/\/$/, "");
    var url =
      base + "/search?q=" + encodeURIComponent(query) + "&format=json";
    var res = await fetch(url);
    if (!res.ok) return null;
    var data = await res.json();

    if (!data.results || !data.results.length) return null;

    var top = data.results.slice(0, 5);
    var results = top.map(function (r) {
      return { title: r.title || "", url: r.url || "", content: r.content || "" };
    });
    var context = results
      .map(function (r, i) {
        return i + 1 + ". " + r.title + "\n" + r.content + "\nURL: " + r.url;
      })
      .join("\n\n");

    return { context: context, results: results };
  } catch (e) {
    return null;
  }
};

/* -------- Regenerate last response -------- */

App.regenerate = function () {
  if (App.isGenerating) App.stopGeneration();

  /* Find last user message content */
  var lastUserContent = null;
  for (var i = App.chatHistory.length - 1; i >= 0; i--) {
    if (App.chatHistory[i].role === "user") {
      lastUserContent = App.chatHistory[i].content;
      break;
    }
  }
  if (!lastUserContent) return;

  /* Pop last assistant message if present */
  if (
    App.chatHistory.length &&
    App.chatHistory[App.chatHistory.length - 1].role === "assistant"
  ) {
    App.chatHistory.pop();
    var msgs = App.el.messagesEl.querySelectorAll(".message.assistant");
    if (msgs.length) msgs[msgs.length - 1].remove();
  }

  App.saveHistory();
  App.sendMessage(lastUserContent, { skipUserPush: true });
};

/* -------- Edit & Resend -------- */

App.editAndResend = function (index) {
  var msg = App.chatHistory[index];
  if (!msg || msg.role !== "user") return;

  var content = msg.content;

  /* Truncate history to before this message */
  App.chatHistory = App.chatHistory.slice(0, index);
  App.saveHistory();
  App.renderHistory();

  /* Populate input with old content */
  App.el.inputEl.value = content;
  App.el.inputEl.style.height = "auto";
  App.el.inputEl.style.height =
    Math.min(App.el.inputEl.scrollHeight, 150) + "px";
  App.el.inputEl.focus();
};

/* -------- Export chat as Markdown -------- */

App.exportChat = function () {
  if (!App.chatHistory.length) return;

  var md = "";
  App.chatHistory.forEach(function (msg) {
    var heading = msg.role === "user" ? "## User" : "## Assistant";
    md += heading + "\n\n" + msg.content + "\n\n---\n\n";
  });

  var now = new Date();
  var dateStr = now.toISOString().split("T")[0];
  var filename = "ollama-chat-" + dateStr + ".md";

  var blob = new Blob([md], { type: "text/markdown" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* -------- Image helpers -------- */

App.clearPendingImages = function () {
  App.pendingImages = [];
  App.el.imagePreview.innerHTML = "";
};

App.addPendingImage = function (base64) {
  App.pendingImages.push(base64);
  App.renderImagePreviews();
};

App.renderImagePreviews = function () {
  App.el.imagePreview.innerHTML = "";
  App.pendingImages.forEach(function (b64, i) {
    var thumb = document.createElement("div");
    thumb.className = "image-thumb";

    var img = document.createElement("img");
    img.src = "data:image/png;base64," + b64;
    thumb.appendChild(img);

    var removeBtn = document.createElement("button");
    removeBtn.className = "image-thumb-remove";
    removeBtn.textContent = "\u00d7";
    removeBtn.addEventListener(
      "click",
      (function (idx) {
        return function () {
          App.pendingImages.splice(idx, 1);
          App.renderImagePreviews();
        };
      })(i),
    );
    thumb.appendChild(removeBtn);

    App.el.imagePreview.appendChild(thumb);
  });
};

function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      var base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* -------- Paste handler -------- */

App.el.inputEl.addEventListener("paste", async function (e) {
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) return;

  for (var i = 0; i < items.length; i++) {
    if (items[i].type.startsWith("image/")) {
      e.preventDefault();
      var file = items[i].getAsFile();
      if (file) {
        var b64 = await fileToBase64(file);
        App.addPendingImage(b64);
      }
    }
  }
});

/* -------- Branching -------- */

App.branches = null;

App.branchFrom = function (N) {
  /* First branch: save current history as fork 0 (original path) */
  if (!App.branches) {
    App.branches = {
      current: 0,
      forks: [{ label: "Main", history: App.chatHistory.slice() }],
    };
  } else {
    /* Save current state back into active fork */
    App.branches.forks[App.branches.current].history = App.chatHistory.slice();
  }

  /* New fork = history up to and including the branched assistant message */
  var newHistory = App.chatHistory.slice(0, N + 1);
  var label = "Branch " + App.branches.forks.length;
  App.branches.forks.push({ label: label, history: newHistory });
  App.branches.current = App.branches.forks.length - 1;

  App.chatHistory = newHistory.slice();
  App.saveHistory();
  App.renderHistory();
  App.renderBranchNav();
};

App.navigateBranch = function (delta) {
  if (!App.branches) return;

  /* Persist current fork state */
  App.branches.forks[App.branches.current].history = App.chatHistory.slice();

  var next = App.branches.current + delta;
  if (next < 0 || next >= App.branches.forks.length) return;

  App.branches.current = next;
  App.chatHistory = App.branches.forks[next].history.slice();
  App.saveHistory();
  App.renderHistory();
  App.renderBranchNav();
};

/* -------- Chatterbox TTS helpers -------- */

function ttsShowError(msg) {
  App.el.typingEl.innerHTML = "";
  var errDiv = document.createElement("span");
  errDiv.style.color = "var(--text)";
  errDiv.textContent = "TTS error: " + msg;
  var dismissBtn = document.createElement("button");
  dismissBtn.className = "tts-btn";
  dismissBtn.textContent = "✕";
  dismissBtn.style.marginLeft = "8px";
  dismissBtn.addEventListener("click", function () { App.el.typingEl.innerHTML = ""; });
  App.el.typingEl.appendChild(errDiv);
  App.el.typingEl.appendChild(dismissBtn);
}

function ttsShowPlayer(blob, voice) {
  var audioUrl = URL.createObjectURL(blob);
  var filename = (voice || "voice") + "_" + Date.now() + ".wav";

  App.el.typingEl.innerHTML = "";
  var player = document.createElement("div");
  player.className = "tts-player";

  var audio = document.createElement("audio");
  audio.src = audioUrl;

  var playBtn = document.createElement("button");
  playBtn.className = "tts-btn";
  playBtn.textContent = "▶ Play";
  playBtn.addEventListener("click", function () {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = "⏸ Pause";
    } else {
      audio.pause();
      playBtn.textContent = "▶ Play";
    }
  });
  audio.onended = function () {
    playBtn.textContent = "▶ Play";
    URL.revokeObjectURL(audioUrl);
  };

  var dlBtn = document.createElement("a");
  dlBtn.className = "tts-btn";
  dlBtn.href = audioUrl;
  dlBtn.download = filename;
  dlBtn.textContent = "↓ " + filename;

  var closeBtn = document.createElement("button");
  closeBtn.className = "tts-btn";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", function () {
    audio.pause();
    URL.revokeObjectURL(audioUrl);
    App.el.typingEl.innerHTML = "";
  });

  player.appendChild(playBtn);
  player.appendChild(dlBtn);
  player.appendChild(closeBtn);
  App.el.typingEl.appendChild(player);
}

/* Split text at sentence boundaries, respecting maxChars per chunk */
function ttsSplitText(text, maxChars) {
  /* Safari-compatible: no lookbehind. Insert marker after sentence endings. */
  var sentences = text.trim().replace(/([.!?]) +/g, "$1\n").split("\n");
  var chunks = [];
  var current = "";

  sentences.forEach(function (s) {
    s = s.trim();
    if (!s) return;
    if (current.length + s.length + 1 <= maxChars) {
      current = current ? current + " " + s : s;
    } else {
      if (current) chunks.push(current);
      if (s.length > maxChars) {
        /* Sentence too long — split at word boundaries */
        var words = s.split(" ");
        current = "";
        words.forEach(function (w) {
          if (current.length + w.length + 1 <= maxChars) {
            current = current ? current + " " + w : w;
          } else {
            if (current) chunks.push(current);
            current = w;
          }
        });
      } else {
        current = s;
      }
    }
  });
  if (current) chunks.push(current);
  return chunks.filter(function (c) { return c.trim(); });
}

/* Find the byte offset where the 'data' chunk payload starts in a WAV buffer */
function wavDataOffset(buf) {
  var view = new DataView(buf);
  var pos = 12; /* skip RIFF header (4) + file size (4) + WAVE (4) */
  while (pos + 8 <= buf.byteLength) {
    var id = String.fromCharCode(
      view.getUint8(pos), view.getUint8(pos + 1),
      view.getUint8(pos + 2), view.getUint8(pos + 3)
    );
    var chunkSize = view.getUint32(pos + 4, true);
    if (id === "data") return { headerEnd: pos + 8, dataSize: chunkSize, dataOffset: pos };
    pos += 8 + chunkSize;
  }
  return null; /* malformed */
}

/* Concatenate multiple PCM WAV blobs into one */
async function ttsConcatWav(blobs) {
  var buffers = await Promise.all(blobs.map(function (b) { return b.arrayBuffer(); }));

  var infos = buffers.map(function (buf) {
    var d = wavDataOffset(buf);
    if (!d) throw new Error("Invalid WAV chunk");
    return d;
  });

  var totalAudio = infos.reduce(function (n, d) { return n + d.dataSize; }, 0);
  var headerLen = infos[0].headerEnd; /* header from first file up to data payload */
  var out = new ArrayBuffer(headerLen + totalAudio);
  var view = new DataView(out);
  var bytes = new Uint8Array(out);

  /* Copy full header from first file */
  bytes.set(new Uint8Array(buffers[0], 0, headerLen), 0);
  /* Patch RIFF file size and data chunk size */
  view.setUint32(4, headerLen - 8 + totalAudio, true);
  view.setUint32(infos[0].dataOffset + 4, totalAudio, true);

  var offset = headerLen;
  buffers.forEach(function (buf, i) {
    var d = infos[i];
    bytes.set(new Uint8Array(buf, d.headerEnd, d.dataSize), offset);
    offset += d.dataSize;
  });

  return new Blob([out], { type: "audio/wav" });
}

async function ttsFetch(base, text) {
  /* Both Caddy and Chatterbox set Access-Control-Allow-Origin: * causing
   * duplicate CORS headers in the browser. Route through the mdplanner
   * server-side proxy to avoid this. Deno has --allow-net unrestricted. */
  var res = await fetch("/api/tts/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ttsUrl: base,
      text: text,
      voice: App.config.chatterboxVoice || "",
      exageration: App.config.chatterboxExageration ?? 0.5,
      cfg_weight: App.config.chatterboxCfgWeight ?? 0.5,
    }),
  });
  if (!res.ok) {
    var errBody = await res.text();
    try { errBody = JSON.parse(errBody).error || errBody; } catch (e) { /* raw */ }
    throw new Error("HTTP " + res.status + " — " + errBody);
  }
  return res.blob();
}

/* -------- Chatterbox TTS -------- */

App.speak = async function (text) {
  App.el.typingEl.textContent = "Synthesizing speech...";

  if (App.config.chatterboxAutoUnload) {
    await App.unloadModel(true);
  }

  try {
    var base = (App.config.chatterboxUrl || "").replace(/\/$/, "");
    var voice = App.config.chatterboxVoice || "voice";
    var finalBlob;

    if (App.config.chatterboxSplit) {
      var chunks = ttsSplitText(text, App.config.chatterboxSplitChars || 400);
      var total = chunks.length;
      var blobs = [];

      for (var i = 0; i < total; i++) {
        App.el.typingEl.textContent = "Synthesizing " + (i + 1) + "/" + total + "...";
        var blob = await ttsFetch(base, chunks[i]);
        App.el.typingEl.textContent = "Downloading " + (i + 1) + "/" + total + "...";
        blobs.push(blob);
      }

      if (total > 1) {
        App.el.typingEl.textContent = "Combining " + total + " chunks...";
        finalBlob = await ttsConcatWav(blobs);
      } else {
        finalBlob = blobs[0];
      }
    } else {
      var singleBlob = await ttsFetch(base, text);
      App.el.typingEl.textContent = "Downloading audio...";
      finalBlob = singleBlob;
    }

    ttsShowPlayer(finalBlob, voice);
  } catch (e) {
    ttsShowError(e.message);
  }
};

/* -------- Prompt library -------- */

App.prompts = JSON.parse(localStorage.getItem("ollama-prompts")) || [];

App.savePrompts = function () {
  localStorage.setItem("ollama-prompts", JSON.stringify(App.prompts));
};

App.togglePromptPanel = function () {
  var panel = document.getElementById("promptPanel");
  var isOpen = panel.style.display === "flex";
  panel.style.display = isOpen ? "none" : "flex";
  if (!isOpen) App.renderPromptList();
};

App.renderPromptList = function () {
  var list = document.getElementById("promptList");
  list.innerHTML = "";
  if (!App.prompts.length) {
    list.innerHTML = '<span style="color:var(--muted);font-size:12px">No prompts saved yet.</span>';
    return;
  }
  App.prompts.forEach(function (p, i) {
    var item = document.createElement("div");
    item.className = "prompt-item";

    var title = document.createElement("span");
    title.className = "prompt-title";
    title.textContent = p.title;

    var useBtn = document.createElement("button");
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", function () {
      document.getElementById("configSystemPrompt").value = p.content;
      App.togglePromptPanel();
      if (App.el.configPanel.style.display !== "flex") App.toggleConfig();
    });

    var delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function () {
      App.prompts.splice(i, 1);
      App.savePrompts();
      App.renderPromptList();
    });

    item.appendChild(title);
    item.appendChild(useBtn);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
};

App.addPrompt = function () {
  var title = document.getElementById("newPromptTitle").value.trim();
  var content = document.getElementById("newPromptContent").value.trim();
  if (!title || !content) return;
  App.prompts.push({ title: title, content: content });
  App.savePrompts();
  document.getElementById("newPromptTitle").value = "";
  document.getElementById("newPromptContent").value = "";
  App.renderPromptList();
};

App.exportPrompts = function () {
  var blob = new Blob([JSON.stringify(App.prompts, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "ollama-prompts.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

App.importPrompts = function (input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        App.prompts = App.prompts.concat(data);
        App.savePrompts();
        App.renderPromptList();
      }
    } catch (err) { /* ignore */ }
  };
  reader.readAsText(file);
  input.value = "";
};

/* -------- Attach button handler -------- */

document.getElementById("attachBtn").addEventListener("click", function () {
  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.multiple = true;
  fileInput.addEventListener("change", async function () {
    for (var i = 0; i < fileInput.files.length; i++) {
      var b64 = await fileToBase64(fileInput.files[i]);
      App.addPendingImage(b64);
    }
  });
  fileInput.click();
});
