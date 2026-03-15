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

// Images — explicit renderer so src passes through unmodified
markedRenderer.image = function ({ href, title, text }) {
  const titleAttr = title ? ` title="${title}"` : "";
  return `<img src="${href}"${titleAttr} alt="${text}" class="markdown-image">`;
};

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
 * Extract a human-readable error message from an API error response body.
 * Handles Zod validation errors, string error/message fields, and fallback.
 * @param {object} body - Parsed JSON response body
 * @returns {string}
 */
export function extractErrorMessage(body) {
  if (!body) return "Error";
  if (typeof body.error === "string") return body.error;
  if (body.error?.issues && Array.isArray(body.error.issues)) {
    return body.error.issues
      .map((i) => `${i.path?.join(".") || "field"}: ${i.message}`)
      .join("; ");
  }
  if (typeof body.message === "string") return body.message;
  return "Error";
}

/**
 * Validate required form fields. Returns array of error objects.
 * Each entry in `fields` is { id: "inputId", label: "Field Name" }.
 * Shows inline errors on failing fields and clears errors on passing ones.
 * @param {{ id: string, label: string, maxLength?: number }[]} fields
 * @returns {{ id: string, label: string, message: string }[]} errors (empty = valid)
 */
export function validateRequired(fields) {
  const errors = [];
  for (const field of fields) {
    const el = document.getElementById(field.id);
    if (!el) continue;
    const value = el.value?.trim() ?? "";
    if (!value) {
      errors.push({ id: field.id, label: field.label, message: `${field.label} is required` });
      showFieldError(field.id, `${field.label} is required`);
    } else if (field.maxLength && value.length > field.maxLength) {
      errors.push({ id: field.id, label: field.label, message: `${field.label} must be ${field.maxLength} characters or fewer` });
      showFieldError(field.id, `Max ${field.maxLength} characters`);
    } else {
      clearFieldError(field.id);
    }
  }
  return errors;
}

/**
 * Show an inline error on a form field (red border + message below).
 * @param {string} inputId
 * @param {string} message
 */
export function showFieldError(inputId, message) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.classList.add("form-input-error");
  // Remove existing error text if any
  const existing = el.parentElement?.querySelector(".form-error-text");
  if (existing) existing.remove();
  // Add error text
  const span = document.createElement("span");
  span.className = "form-error-text";
  span.textContent = message;
  el.insertAdjacentElement("afterend", span);
  // Clear on next input
  el.addEventListener("input", () => clearFieldError(inputId), { once: true });
}

/**
 * Clear inline error from a form field.
 * @param {string} inputId
 */
export function clearFieldError(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.classList.remove("form-input-error");
  const errText = el.parentElement?.querySelector(".form-error-text");
  if (errText) errText.remove();
}

/**
 * Clear all field errors within a container element.
 * @param {HTMLElement} container
 */
export function clearAllFieldErrors(container) {
  if (!container) return;
  container.querySelectorAll(".form-input-error").forEach((el) =>
    el.classList.remove("form-input-error")
  );
  container.querySelectorAll(".form-error-text").forEach((el) => el.remove());
}

/**
 * Parse server error "field: message; field: message" format and show inline errors.
 * @param {string} errorMessage - Server error message string
 * @param {Record<string, string>} fieldMap - Maps server field names to input IDs
 */
export function showServerFieldErrors(errorMessage, fieldMap) {
  if (!errorMessage) return;
  const parts = errorMessage.split(";").map((s) => s.trim());
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const field = part.slice(0, colonIdx).trim();
    const msg = part.slice(colonIdx + 1).trim();
    const inputId = fieldMap[field];
    if (inputId) showFieldError(inputId, msg);
  }
}

/**
 * @param {string} markdown - Markdown text
 * @returns {string} HTML rendered by marked.js, wrapped in .markdown-content
 */
export function markdownToHtml(markdown) {
  if (!markdown) return "";
  const html = marked.parse(markdown);
  return `<div class="markdown-content">${html}</div>`;
}

/**
 * Filter items by a search query. Each item is tested against text
 * returned by getSearchableTexts (an array of strings).
 * @param {Array} items
 * @param {string} query
 * @param {(item: any) => string[]} getSearchableTexts
 * @returns {Array}
 */
export function filterBySearchQuery(items, query, getSearchableTexts) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) =>
    getSearchableTexts(item).some((text) => text.toLowerCase().includes(q))
  );
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
