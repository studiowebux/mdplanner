// Brain Sessions Panel — session list + message viewer
import { BrainsAPI } from "../api.js";

export class BrainSessionsPanel {
  constructor(brainsModule) {
    this.mod = brainsModule;
  }

  async render(brainName) {
    const panel = document.getElementById("brainsContent");
    if (!panel) return;

    panel.innerHTML = `
      <div class="brain-sessions-layout">
        <div class="brain-sessions-list" id="brainsSessionList">
          <div class="brain-loading">Loading sessions...</div>
        </div>
        <div class="brain-sessions-viewer" id="brainsSessionViewer">
          <div class="brain-files-placeholder">Select a session to view messages</div>
        </div>
      </div>
    `;

    try {
      const sessions = await BrainsAPI.fetchSessions(brainName);
      this._renderSessionList(brainName, sessions);
    } catch {
      document.getElementById("brainsSessionList").innerHTML =
        '<div class="brain-error">Failed to load sessions</div>';
    }
  }

  _renderSessionList(brainName, sessions) {
    const list = document.getElementById("brainsSessionList");
    if (!list) return;

    if (!sessions.length) {
      list.innerHTML =
        '<div class="brain-files-placeholder">No sessions found</div>';
      return;
    }

    list.innerHTML = sessions
      .map(
        (s) => `
      <button class="brain-session-item" data-brain="${brainName}" data-session="${s.id}">
        <span class="brain-session-date">${new Date(s.lastModified).toLocaleString()}</span>
        <span class="brain-session-count">${s.messageCount} messages</span>
        <span class="brain-session-preview">${s.preview || ""}</span>
      </button>
    `,
      )
      .join("");
  }

  async _loadSession(brainName, sessionId) {
    const viewer = document.getElementById("brainsSessionViewer");
    if (!viewer) return;

    viewer.innerHTML =
      '<div class="brain-loading">Loading messages...</div>';

    try {
      const detail = await BrainsAPI.fetchSession(brainName, sessionId);
      this._renderMessages(detail);
    } catch {
      viewer.innerHTML =
        '<div class="brain-error">Failed to load session</div>';
    }
  }

  _renderMessages(detail) {
    const viewer = document.getElementById("brainsSessionViewer");
    if (!viewer) return;

    const html = detail.messages
      .map((msg) => this._renderMessage(msg))
      .join("");

    const subagentHtml = detail.subagents?.length
      ? detail.subagents
          .map(
            (sa) => `
        <details class="brain-subagent">
          <summary class="brain-subagent-header">Subagent: ${sa.id} (${sa.messages.length} messages)</summary>
          <div class="brain-subagent-messages">
            ${sa.messages.map((m) => this._renderMessage(m)).join("")}
          </div>
        </details>
      `,
          )
          .join("")
      : "";

    viewer.innerHTML = `
      <div class="brain-messages-container">
        ${html}
        ${subagentHtml}
      </div>
    `;
  }

  _renderMessage(msg) {
    const parts = [];

    if (msg.text) {
      const escaped = msg.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      parts.push(`<div class="brain-msg-text">${escaped}</div>`);
    }

    if (msg.thinking) {
      const escaped = msg.thinking
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      parts.push(`
        <details class="brain-msg-thinking">
          <summary>Thinking</summary>
          <pre>${escaped}</pre>
        </details>
      `);
    }

    if (msg.toolUses?.length) {
      for (const tu of msg.toolUses) {
        parts.push(`
          <div class="brain-msg-tool-use">
            <span class="brain-tool-label">Tool: ${tu.name}</span>
          </div>
        `);
      }
    }

    if (msg.toolResults?.length) {
      for (const tr of msg.toolResults) {
        const content = tr.content || "";
        const truncated =
          content.length > 500 ? content.slice(0, 500) + "..." : content;
        const escaped = truncated
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        parts.push(`
          <details class="brain-msg-tool-result">
            <summary>Tool Result</summary>
            <pre>${escaped}</pre>
          </details>
        `);
      }
    }

    if (!parts.length) return "";

    const roleClass =
      msg.role === "assistant" ? "brain-msg-assistant" : "brain-msg-user";
    const roleLabel = msg.role === "assistant" ? "Assistant" : "User";

    return `
      <div class="brain-message ${roleClass}">
        <div class="brain-msg-header">
          <span class="brain-msg-role">${roleLabel}</span>
          ${msg.timestamp ? `<span class="brain-msg-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>` : ""}
        </div>
        ${parts.join("")}
      </div>
    `;
  }

  bindEvents() {
    document
      .getElementById("brainsContent")
      ?.addEventListener("click", (e) => {
        const item = e.target.closest(".brain-session-item");
        if (item) {
          document
            .querySelectorAll(".brain-session-item.active")
            .forEach((el) => el.classList.remove("active"));
          item.classList.add("active");
          this._loadSession(item.dataset.brain, item.dataset.session);
        }
      });
  }
}
