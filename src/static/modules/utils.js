import { PRIORITY_CLASSES } from "./constants.js";

/**
 * @param {string} dateString - ISO date or datetime string
 * @returns {string} Formatted date (e.g., "Jan 15, 2025")
 */
export function formatDate(dateString) {
  if (!dateString) return "";

  try {
    let date;

    // If it's just a date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      date = new Date(dateString + "T00:00:00");
    } // If it's incomplete datetime (YYYY-MM-DDTHH)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(dateString)) {
      date = new Date(dateString + ":00:00");
    } // If it's incomplete datetime (YYYY-MM-DDTHH:MM)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(dateString)) {
      date = new Date(dateString + ":00");
    } // Otherwise try to parse as-is
    else {
      date = new Date(dateString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString();
  } catch (error) {
    console.warn("Error parsing date:", dateString, error);
    return dateString;
  }
}

/**
 * @param {string} dateString - ISO date string
 * @returns {string} datetime-local input format (YYYY-MM-DDTHH:MM)
 */
export function formatDateForInput(dateString) {
  if (!dateString) return "";

  try {
    let date;

    // If it's just a date (YYYY-MM-DD), convert to datetime for input
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString + "T09:00";
    } // If it's incomplete datetime (YYYY-MM-DDTHH)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(dateString)) {
      return dateString.padEnd(13, "0") + ":00";
    } // If it's incomplete datetime (YYYY-MM-DDTHH:MM)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(dateString)) {
      return dateString;
    } // If it's full datetime (YYYY-MM-DDTHH:MM:SS)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}/.test(dateString)) {
      return dateString.substring(0, 16);
    } // Try to parse and format
    else {
      date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    }

    return dateString;
  } catch (error) {
    console.warn("Error formatting date for input:", dateString, error);
    return dateString;
  }
}

/**
 * @param {string} text - Raw text to escape
 * @returns {string} HTML-safe string
 */
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Configure marked.js with custom renderer.
 * Uses global `marked` from vendor/marked/marked.min.js (UMD build).
 */
const markedRenderer = new marked.Renderer();

// Links open in new tab
markedRenderer.link = function ({ href, title, text }) {
  const titleAttr = title ? ` title="${title}"` : "";
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

// Code blocks with language label and copy button
markedRenderer.code = function ({ text, lang }) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const langLabel = lang
    ? `<span class="code-language-label">${lang}</span>`
    : "";
  return `<div class="code-block">${langLabel}<button type="button" class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent)">Copy</button><pre><code>${escaped}</code></pre></div>`;
};

marked.setOptions({
  renderer: markedRenderer,
  gfm: true,
  breaks: true,
});

/**
 * @param {string} markdown - Markdown text
 * @returns {string} HTML rendered by marked.js, wrapped in .markdown-content
 */
export function markdownToHtml(markdown) {
  if (!markdown) return "";
  const html = marked.parse(markdown);
  return `<div class="markdown-content">${html}</div>`;
}

// Priority utilities
export function getPriorityBadgeClasses(priority) {
  return PRIORITY_CLASSES[priority]?.badge || PRIORITY_CLASSES[5].badge;
}

export function getPriorityText(priority) {
  switch (priority) {
    case 1:
      return "Highest";
    case 2:
      return "High";
    case 3:
      return "Medium";
    case 4:
      return "Low";
    case 5:
      return "Lowest";
    default:
      return "";
  }
}
