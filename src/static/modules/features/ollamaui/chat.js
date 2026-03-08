/* chat.js — buildMessages, sendMessage, streaming, abort */

import { App } from "./state.js";

App.buildMessages = function () {
  const messages = [];

  if (App.config.systemPrompt) {
    messages.push({ role: "system", content: App.config.systemPrompt });
  }

  App.chatHistory.forEach(function (msg) {
    const m = { role: msg.role, content: msg.content };
    if (msg.images && msg.images.length) m.images = msg.images;
    messages.push(m);
  });

  return messages;
};

App.setGenerating = function (active) {
  App.isGenerating = active;
  App.el.sendBtn.textContent = active ? "Stop" : "Send";
  App.el.sendBtn.className = "send-btn" + (active ? " stop" : "");
  App.el.inputEl.disabled = active;
};

App.sendMessage = async function (content, opts) {
  opts = opts || {};
  const skipUserPush = opts.skipUserPush || false;
  const images = opts.images || null;
  const searchContext = opts.searchContext || null;
  const searchResults = opts.searchResults || null;

  if (!App.config.model) {
    App.el.typingEl.textContent =
      "No model selected \u2014 open Config to pick one.";
    return;
  }

  App.userScrolledUp = false;

  if (!skipUserPush) {
    const userMsg = { role: "user", content: content };
    if (images && images.length) userMsg.images = images;
    if (searchResults && searchResults.length) {
      userMsg.searchResults = searchResults;
    }
    App.chatHistory.push(userMsg);
    App.appendMessageEl(
      "user",
      content,
      true,
      App.chatHistory.length - 1,
      images,
      searchResults,
    );
    App.saveHistory();
  }

  App.el.typingEl.textContent = "Thinking...";
  App.setGenerating(true);

  App.abortController = new AbortController();

  const assistantDiv = document.createElement("div");
  assistantDiv.className = "message assistant";
  App.el.messagesEl.appendChild(assistantDiv);

  let fullText = "";
  let lastRender = 0;
  let evalCount = 0;
  let evalDuration = 0;
  let promptEvalCount = 0;

  try {
    const apiMessages = App.buildMessages();

    if (searchContext) {
      /* Insert search results as system message before the last user message */
      const insertAt = apiMessages.length - 1;
      apiMessages.splice(insertAt, 0, {
        role: "system",
        content:
          "Use the following web search results to help answer the user's question. Cite sources when relevant.\n\n" +
          searchContext,
      });
    }

    const response = await fetch(App.apiUrl("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: App.config.model,
        messages: apiMessages,
        stream: true,
        options: {
          temperature: App.config.temperature,
          top_p: App.config.topP,
          num_ctx: App.config.numCtx,
        },
      }),
      signal: App.abortController.signal,
    });

    if (!response.ok) throw new Error("HTTP " + response.status);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        try {
          const chunk = JSON.parse(lines[i]);

          if (chunk.message && chunk.message.content) {
            fullText += chunk.message.content;
          }

          if (chunk.done) {
            evalCount = chunk.eval_count || 0;
            evalDuration = chunk.eval_duration || 0;
            promptEvalCount = chunk.prompt_eval_count || 0;
          }
        } catch (_) {
          /* skip malformed JSON */
        }
      }

      /* Throttled render */
      const now = Date.now();
      if (now - lastRender > 100) {
        assistantDiv.innerHTML = App.renderMarkdown(fullText);
        App.scrollToBottom();
        lastRender = now;
      }
    }

    /* Final render */
    assistantDiv.innerHTML = App.renderMarkdown(fullText);
    App.addCopyButtons(assistantDiv);
    App.wrapTables(assistantDiv);

    /* Stats */
    if (evalCount > 0 && evalDuration > 0) {
      const tokPerSec = (evalCount / (evalDuration / 1e9)).toFixed(1);
      const totalTokens = promptEvalCount + evalCount;
      const statsDiv = document.createElement("div");
      statsDiv.className = "message-stats";
      statsDiv.textContent =
        evalCount +
        " tokens \u00b7 " +
        tokPerSec +
        " tok/s" +
        (promptEvalCount
          ? " \u00b7 ctx " + totalTokens + "/" + App.config.numCtx
          : "");
      assistantDiv.appendChild(statsDiv);
    }

    /* Action bar */
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const regenBtn = document.createElement("button");
    regenBtn.className = "msg-action-btn";
    regenBtn.textContent = "Regenerate";
    regenBtn.addEventListener("click", function () {
      App.regenerate();
    });
    actions.appendChild(regenBtn);

    if (fullText.trim()) {
      App.chatHistory.push({ role: "assistant", content: fullText.trim() });
      App.saveHistory();
    }

    /* Branch button — index is now valid after push */
    const assistantIdx = App.chatHistory.length - 1;
    const branchBtn = document.createElement("button");
    branchBtn.className = "msg-action-btn";
    branchBtn.textContent = "Branch";
    (function (idx) {
      branchBtn.addEventListener("click", function () {
        App.branchFrom(idx);
      });
    })(assistantIdx);
    actions.appendChild(branchBtn);

    if (App.config.chatterboxUrl) {
      const speakBtn = document.createElement("button");
      speakBtn.className = "msg-action-btn";
      speakBtn.textContent = "Speak";
      (function (text) {
        speakBtn.addEventListener("click", function () {
          App.speak(text);
        });
      })(fullText.trim());
      actions.appendChild(speakBtn);
    }

    assistantDiv.appendChild(actions);

    /* Update header context usage */
    if (promptEvalCount > 0) {
      const ctxTotal = promptEvalCount + evalCount;
      App.updateCtxUsage(ctxTotal, App.config.numCtx);
    }
  } catch (err) {
    if (err.name === "AbortError") {
      if (fullText.trim()) {
        assistantDiv.innerHTML = App.renderMarkdown(fullText);
        App.addCopyButtons(assistantDiv);
        App.wrapTables(assistantDiv);
        App.chatHistory.push({ role: "assistant", content: fullText.trim() });
        App.saveHistory();
      }
      App.el.typingEl.textContent = "Generation stopped.";
      setTimeout(function () {
        App.el.typingEl.textContent = "";
      }, 2000);
    } else {
      assistantDiv.textContent = "Error: " + err.message;
    }
  }

  App.abortController = null;
  App.setGenerating(false);
  App.el.typingEl.textContent = "";
  App.scrollToBottom();
};

App.stopGeneration = function () {
  if (App.abortController) {
    App.abortController.abort();
  }
};
