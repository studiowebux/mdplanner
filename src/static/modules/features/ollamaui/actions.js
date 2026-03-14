/* actions.js — regenerate, edit/resend, export, image paste/attach, web search */

import { App } from "./state.js";
import { TtsAPI } from "../../api.js";

/* -------- Web Search -------- */

App.toggleSearch = function () {
  App.searchEnabled = !App.searchEnabled;
  App.el.searchToggleBtn.className =
    "search-toggle-btn" + (App.searchEnabled ? " active" : "");
};

App.webSearch = async function (query) {
  if (!App.config.searchUrl) return null;

  try {
    const base = App.config.searchUrl.replace(/\/$/, "");
    const url =
      base + "/search?q=" + encodeURIComponent(query) + "&format=json";
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (!data.results || !data.results.length) return null;

    const top = data.results.slice(0, 5);
    const results = top.map(function (r) {
      return {
        title: r.title || "",
        url: r.url || "",
        content: r.content || "",
      };
    });
    const context = results
      .map(function (r, i) {
        return i + 1 + ". " + r.title + "\n" + r.content + "\nURL: " + r.url;
      })
      .join("\n\n");

    return { context: context, results: results };
  } catch (_) {
    return null;
  }
};

/* -------- Regenerate last response -------- */

App.regenerate = function () {
  if (App.isGenerating) App.stopGeneration();

  /* Find last user message content */
  let lastUserContent = null;
  for (let i = App.chatHistory.length - 1; i >= 0; i--) {
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
    const msgs = App.el.messagesEl.querySelectorAll(".message.assistant");
    if (msgs.length) msgs[msgs.length - 1].remove();
  }

  App.saveHistory();
  App.sendMessage(lastUserContent, { skipUserPush: true });
};

/* -------- Edit & Resend -------- */

App.editAndResend = function (index) {
  const msg = App.chatHistory[index];
  if (!msg || msg.role !== "user") return;

  const content = msg.content;

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

  let md = "";
  App.chatHistory.forEach(function (msg) {
    const heading = msg.role === "user" ? "## User" : "## Assistant";
    md += heading + "\n\n" + msg.content + "\n\n---\n\n";
  });

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const filename = "ollama-chat-" + dateStr + ".md";

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
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
    const thumb = document.createElement("div");
    thumb.className = "image-thumb";

    const img = document.createElement("img");
    img.src = "data:image/png;base64," + b64;
    thumb.appendChild(img);

    const removeBtn = document.createElement("button");
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
    const reader = new FileReader();
    reader.onload = function () {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
    App.branches.forks[App.branches.current].history =
      App.chatHistory.slice();
  }

  /* New fork = history up to and including the branched assistant message */
  const newHistory = App.chatHistory.slice(0, N + 1);
  const label = "Branch " + App.branches.forks.length;
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
  App.branches.forks[App.branches.current].history =
    App.chatHistory.slice();

  const next = App.branches.current + delta;
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
  const errDiv = document.createElement("span");
  errDiv.className = "tts-error-msg";
  errDiv.textContent = "TTS error: " + msg;
  const dismissBtn = document.createElement("button");
  dismissBtn.className = "tts-btn tts-dismiss-btn";
  dismissBtn.textContent = "\u2715";
  dismissBtn.addEventListener("click", function () {
    App.el.typingEl.innerHTML = "";
  });
  App.el.typingEl.appendChild(errDiv);
  App.el.typingEl.appendChild(dismissBtn);
}

function ttsShowPlayer(blob, voice) {
  const audioUrl = URL.createObjectURL(blob);
  const filename = (voice || "voice") + "_" + Date.now() + ".wav";

  App.el.typingEl.innerHTML = "";
  const player = document.createElement("div");
  player.className = "tts-player";

  const audio = document.createElement("audio");
  audio.src = audioUrl;

  const playBtn = document.createElement("button");
  playBtn.className = "tts-btn";
  playBtn.textContent = "\u25b6 Play";
  playBtn.addEventListener("click", function () {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = "\u23f8 Pause";
    } else {
      audio.pause();
      playBtn.textContent = "\u25b6 Play";
    }
  });
  audio.onended = function () {
    playBtn.textContent = "\u25b6 Play";
    URL.revokeObjectURL(audioUrl);
  };

  const dlBtn = document.createElement("a");
  dlBtn.className = "tts-btn";
  dlBtn.href = audioUrl;
  dlBtn.download = filename;
  dlBtn.textContent = "\u2193 " + filename;

  const closeBtn = document.createElement("button");
  closeBtn.className = "tts-btn";
  closeBtn.textContent = "\u2715";
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
  const sentences = text.trim().replace(/([.!?]) +/g, "$1\n").split("\n");
  const chunks = [];
  let current = "";

  sentences.forEach(function (s) {
    s = s.trim();
    if (!s) return;
    if (current.length + s.length + 1 <= maxChars) {
      current = current ? current + " " + s : s;
    } else {
      if (current) chunks.push(current);
      if (s.length > maxChars) {
        /* Sentence too long — split at word boundaries */
        const words = s.split(" ");
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
  return chunks.filter(function (c) {
    return c.trim();
  });
}

/* Find the byte offset where the 'data' chunk payload starts in a WAV buffer */
function wavDataOffset(buf) {
  const view = new DataView(buf);
  let pos = 12; /* skip RIFF header (4) + file size (4) + WAVE (4) */
  while (pos + 8 <= buf.byteLength) {
    const id = String.fromCharCode(
      view.getUint8(pos),
      view.getUint8(pos + 1),
      view.getUint8(pos + 2),
      view.getUint8(pos + 3),
    );
    const chunkSize = view.getUint32(pos + 4, true);
    if (id === "data") {
      return { headerEnd: pos + 8, dataSize: chunkSize, dataOffset: pos };
    }
    pos += 8 + chunkSize;
  }
  return null; /* malformed */
}

/* Concatenate multiple PCM WAV blobs into one */
async function ttsConcatWav(blobs) {
  const buffers = await Promise.all(
    blobs.map(function (b) {
      return b.arrayBuffer();
    }),
  );

  const infos = buffers.map(function (buf) {
    const d = wavDataOffset(buf);
    if (!d) throw new Error("Invalid WAV chunk");
    return d;
  });

  const totalAudio = infos.reduce(function (n, d) {
    return n + d.dataSize;
  }, 0);
  const headerLen =
    infos[0].headerEnd; /* header from first file up to data payload */
  const out = new ArrayBuffer(headerLen + totalAudio);
  const view = new DataView(out);
  const bytes = new Uint8Array(out);

  /* Copy full header from first file */
  bytes.set(new Uint8Array(buffers[0], 0, headerLen), 0);
  /* Patch RIFF file size and data chunk size */
  view.setUint32(4, headerLen - 8 + totalAudio, true);
  view.setUint32(infos[0].dataOffset + 4, totalAudio, true);

  let offset = headerLen;
  buffers.forEach(function (buf, i) {
    const d = infos[i];
    bytes.set(new Uint8Array(buf, d.headerEnd, d.dataSize), offset);
    offset += d.dataSize;
  });

  return new Blob([out], { type: "audio/wav" });
}

async function ttsFetch(base, text) {
  return TtsAPI.synthesize({
    ttsUrl: base,
    text: text,
    voice: App.config.chatterboxVoice || "",
    exageration: App.config.chatterboxExageration ?? 0.5,
    cfg_weight: App.config.chatterboxCfgWeight ?? 0.5,
  });
}

/* -------- Chatterbox TTS -------- */

App.speak = async function (text) {
  App.el.typingEl.textContent = "Synthesizing speech...";

  if (App.config.chatterboxAutoUnload) {
    await App.unloadModel(true);
  }

  try {
    const base = (App.config.chatterboxUrl || "").replace(/\/$/, "");
    const voice = App.config.chatterboxVoice || "voice";
    let finalBlob;

    if (App.config.chatterboxSplit) {
      const chunks = ttsSplitText(
        text,
        App.config.chatterboxSplitChars || 400,
      );
      const total = chunks.length;
      const blobs = [];

      for (let i = 0; i < total; i++) {
        App.el.typingEl.textContent =
          "Synthesizing " + (i + 1) + "/" + total + "...";
        const blob = await ttsFetch(base, chunks[i]);
        App.el.typingEl.textContent =
          "Downloading " + (i + 1) + "/" + total + "...";
        blobs.push(blob);
      }

      if (total > 1) {
        App.el.typingEl.textContent = "Combining " + total + " chunks...";
        finalBlob = await ttsConcatWav(blobs);
      } else {
        finalBlob = blobs[0];
      }
    } else {
      const singleBlob = await ttsFetch(base, text);
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
  const panel = document.getElementById("promptPanel");
  const wasHidden = panel.classList.contains("hidden");
  panel.classList.toggle("hidden");
  if (wasHidden) App.renderPromptList();
};

App.renderPromptList = function () {
  const list = document.getElementById("promptList");
  list.innerHTML = "";
  if (!App.prompts.length) {
    list.innerHTML =
      '<span style="color:var(--muted);font-size:12px">No prompts saved yet.</span>';
    return;
  }
  App.prompts.forEach(function (p, i) {
    const item = document.createElement("div");
    item.className = "prompt-item";

    const title = document.createElement("span");
    title.className = "prompt-title";
    title.textContent = p.title;

    const useBtn = document.createElement("button");
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", function () {
      document.getElementById("configSystemPrompt").value = p.content;
      App.togglePromptPanel();
      if (App.el.configPanel.classList.contains("hidden")) App.toggleConfig();
    });

    const delBtn = document.createElement("button");
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
  const title = document.getElementById("newPromptTitle").value.trim();
  const content = document.getElementById("newPromptContent").value.trim();
  if (!title || !content) return;
  App.prompts.push({ title: title, content: content });
  App.savePrompts();
  document.getElementById("newPromptTitle").value = "";
  document.getElementById("newPromptContent").value = "";
  App.renderPromptList();
};

App.exportPrompts = function () {
  const blob = new Blob([JSON.stringify(App.prompts, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ollama-prompts.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

App.importPrompts = function (input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        App.prompts = App.prompts.concat(data);
        App.savePrompts();
        App.renderPromptList();
      }
    } catch (_) {
      /* ignore */
    }
  };
  reader.readAsText(file);
  input.value = "";
};

/* -------- Event listeners (deferred to init) -------- */

export function initActionListeners() {
  /* Paste handler */
  App.el.inputEl.addEventListener("paste", async function (e) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const b64 = await fileToBase64(file);
          App.addPendingImage(b64);
        }
      }
    }
  });

  /* Attach button handler */
  document.getElementById("attachBtn").addEventListener("click", function () {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.addEventListener("change", async function () {
      for (let i = 0; i < fileInput.files.length; i++) {
        const b64 = await fileToBase64(fileInput.files[i]);
        App.addPendingImage(b64);
      }
    });
    fileInput.click();
  });
}
