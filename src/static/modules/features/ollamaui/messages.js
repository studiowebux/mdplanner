/* messages.js — Message rendering, scroll helpers, context usage */

App.appendMessageEl = function (role, content, animate, index, images, searchResults) {
  var div = document.createElement("div");
  div.className = "message " + role;

  if (role === "assistant") {
    div.innerHTML = App.renderMarkdown(content);
    App.addCopyButtons(div);
    App.wrapTables(div);

    /* Action bar */
    var actions = document.createElement("div");
    actions.className = "message-actions";

    var regenBtn = document.createElement("button");
    regenBtn.className = "msg-action-btn";
    regenBtn.textContent = "Regenerate";
    regenBtn.addEventListener("click", function () { App.regenerate(); });
    actions.appendChild(regenBtn);

    if (index !== undefined) {
      var branchBtn = document.createElement("button");
      branchBtn.className = "msg-action-btn";
      branchBtn.textContent = "Branch";
      (function (idx) {
        branchBtn.addEventListener("click", function () { App.branchFrom(idx); });
      })(index);
      actions.appendChild(branchBtn);

      if (App.config.chatterboxUrl) {
        var speakBtn = document.createElement("button");
        speakBtn.className = "msg-action-btn";
        speakBtn.textContent = "Speak";
        (function (text) {
          speakBtn.addEventListener("click", function () { App.speak(text); });
        })(content);
        actions.appendChild(speakBtn);
      }
    }

    div.appendChild(actions);
  } else {
    /* User message */
    if (images && images.length) {
      var imgRow = document.createElement("div");
      imgRow.className = "user-msg-images";
      images.forEach(function (b64) {
        var img = document.createElement("img");
        img.className = "user-msg-image";
        img.src = "data:image/png;base64," + b64;
        imgRow.appendChild(img);
      });
      div.appendChild(imgRow);
    }

    var textNode = document.createTextNode(content);
    div.appendChild(textNode);

    /* Search results */
    if (searchResults && searchResults.length) {
      var details = document.createElement("details");
      details.className = "search-results";
      var summary = document.createElement("summary");
      summary.textContent = searchResults.length + " sources";
      details.appendChild(summary);

      var list = document.createElement("ol");
      searchResults.forEach(function (r) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = r.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = r.title || r.url;
        li.appendChild(a);
        if (r.content) {
          var snippet = document.createElement("span");
          snippet.className = "search-snippet";
          snippet.textContent = " -- " + r.content.substring(0, 120);
          li.appendChild(snippet);
        }
        list.appendChild(li);
      });
      details.appendChild(list);
      div.appendChild(details);
    }

    /* Edit button */
    if (index !== undefined) {
      var editBtn = document.createElement("button");
      editBtn.className = "msg-action-btn edit-btn";
      editBtn.textContent = "Edit";
      editBtn.title = "Edit & resend";
      editBtn.addEventListener("click", function () {
        App.editAndResend(index);
      });
      div.appendChild(editBtn);
    }
  }

  App.el.messagesEl.appendChild(div);

  if (animate !== false) {
    App.scrollToBottom();
  }

  return div;
};

App.renderHistory = function () {
  App.el.messagesEl.innerHTML = "";
  App.chatHistory.forEach(function (msg, i) {
    App.appendMessageEl(msg.role, msg.content, false, i, msg.images, msg.searchResults);
  });
  App.scrollToBottom(true);
};

App.clearChat = function () {
  App.chatHistory = [];
  App.saveHistory();
  App.el.messagesEl.innerHTML = "";
  App.el.ctxUsageEl.parentElement.style.display = "none";
};

/* -------- Scroll helpers -------- */

App.userScrolledUp = false;

App.isNearBottom = function () {
  var threshold = 80;
  return (
    App.el.messagesEl.scrollHeight -
      App.el.messagesEl.scrollTop -
      App.el.messagesEl.clientHeight <
    threshold
  );
};

App.scrollToBottom = function (force) {
  if (force) {
    App.userScrolledUp = false;
    App.el.messagesEl.scrollTop = App.el.messagesEl.scrollHeight;
    return;
  }
  if (!App.userScrolledUp) {
    App.el.messagesEl.scrollTop = App.el.messagesEl.scrollHeight;
  }
};

App.el.messagesEl.addEventListener("scroll", function () {
  var nearBottom = App.isNearBottom();
  App.el.scrollBottomBtn.style.display = nearBottom ? "none" : "block";
  /* Track when user manually scrolls up during generation */
  if (!nearBottom && App.isGenerating) {
    App.userScrolledUp = true;
  }
  if (nearBottom) {
    App.userScrolledUp = false;
  }
});

App.el.scrollBottomBtn.addEventListener("click", function () {
  App.userScrolledUp = false;
  App.el.messagesEl.scroll({ top: App.el.messagesEl.scrollHeight, behavior: "smooth" });
  App.el.scrollBottomBtn.style.display = "none";
});

/* -------- Branch navigation -------- */

App.renderBranchNav = function () {
  var nav = document.getElementById("branchNav");
  if (!App.branches || App.branches.forks.length <= 1) {
    nav.style.display = "none";
    return;
  }
  var curr = App.branches.current;
  var total = App.branches.forks.length;
  nav.style.display = "flex";
  document.getElementById("branchLabel").textContent =
    App.branches.forks[curr].label + " (" + (curr + 1) + "/" + total + ")";
  document.getElementById("branchPrev").disabled = curr === 0;
  document.getElementById("branchNext").disabled = curr === total - 1;
};

/* -------- Context usage -------- */

App.updateCtxUsage = function (used, total) {
  var pct = Math.min((used / total) * 100, 100);
  App.el.ctxUsageEl.textContent = used + " / " + total;
  App.el.ctxBarEl.style.width = pct + "%";
  App.el.ctxUsageEl.parentElement.style.display = "";
};
