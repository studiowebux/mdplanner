/* chat.js — buildMessages, sendMessage, streaming, abort */

App.buildMessages = function () {
  var messages = [];

  if (App.config.systemPrompt) {
    messages.push({ role: "system", content: App.config.systemPrompt });
  }

  App.chatHistory.forEach(function (msg) {
    var m = { role: msg.role, content: msg.content };
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
  var skipUserPush = opts.skipUserPush || false;
  var images = opts.images || null;
  var searchContext = opts.searchContext || null;
  var searchResults = opts.searchResults || null;

  if (!App.config.model) {
    App.el.typingEl.textContent =
      "No model selected \u2014 open Config to pick one.";
    return;
  }

  App.userScrolledUp = false;

  if (!skipUserPush) {
    var userMsg = { role: "user", content: content };
    if (images && images.length) userMsg.images = images;
    if (searchResults && searchResults.length) userMsg.searchResults = searchResults;
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

  var assistantDiv = document.createElement("div");
  assistantDiv.className = "message assistant";
  App.el.messagesEl.appendChild(assistantDiv);

  var fullText = "";
  var lastRender = 0;
  var evalCount = 0;
  var evalDuration = 0;
  var promptEvalCount = 0;

  try {
    var apiMessages = App.buildMessages();

    if (searchContext) {
      /* Insert search results as system message before the last user message */
      var insertAt = apiMessages.length - 1;
      apiMessages.splice(insertAt, 0, {
        role: "system",
        content:
          "Use the following web search results to help answer the user's question. Cite sources when relevant.\n\n" +
          searchContext,
      });
    }

    var response = await fetch(App.apiUrl("/api/chat"), {
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

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";

    while (true) {
      var result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      var lines = buffer.split("\n");
      buffer = lines.pop();

      for (var i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        try {
          var chunk = JSON.parse(lines[i]);

          if (chunk.message && chunk.message.content) {
            fullText += chunk.message.content;
          }

          if (chunk.done) {
            evalCount = chunk.eval_count || 0;
            evalDuration = chunk.eval_duration || 0;
            promptEvalCount = chunk.prompt_eval_count || 0;
          }
        } catch (e) {
          /* skip malformed JSON */
        }
      }

      /* Throttled render */
      var now = Date.now();
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
      var tokPerSec = (evalCount / (evalDuration / 1e9)).toFixed(1);
      var totalTokens = promptEvalCount + evalCount;
      var statsDiv = document.createElement("div");
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
    var actions = document.createElement("div");
    actions.className = "message-actions";

    var regenBtn = document.createElement("button");
    regenBtn.className = "msg-action-btn";
    regenBtn.textContent = "Regenerate";
    regenBtn.addEventListener("click", function () { App.regenerate(); });
    actions.appendChild(regenBtn);

    if (fullText.trim()) {
      App.chatHistory.push({ role: "assistant", content: fullText.trim() });
      App.saveHistory();
    }

    /* Branch button — index is now valid after push */
    var assistantIdx = App.chatHistory.length - 1;
    var branchBtn = document.createElement("button");
    branchBtn.className = "msg-action-btn";
    branchBtn.textContent = "Branch";
    (function (idx) {
      branchBtn.addEventListener("click", function () { App.branchFrom(idx); });
    })(assistantIdx);
    actions.appendChild(branchBtn);

    if (App.config.chatterboxUrl) {
      var speakBtn = document.createElement("button");
      speakBtn.className = "msg-action-btn";
      speakBtn.textContent = "Speak";
      (function (text) {
        speakBtn.addEventListener("click", function () { App.speak(text); });
      })(fullText.trim());
      actions.appendChild(speakBtn);
    }

    assistantDiv.appendChild(actions);

    /* Update header context usage */
    if (promptEvalCount > 0) {
      var ctxTotal = promptEvalCount + evalCount;
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
