import { PRIORITY_CLASSES } from './constants.js';

// Date formatting utilities
export function formatDate(dateString) {
  if (!dateString) return "";

  try {
    let date;

    // If it's just a date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      date = new Date(dateString + "T00:00:00");
    }
    // If it's incomplete datetime (YYYY-MM-DDTHH)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(dateString)) {
      date = new Date(dateString + ":00:00");
    }
    // If it's incomplete datetime (YYYY-MM-DDTHH:MM)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(dateString)) {
      date = new Date(dateString + ":00");
    }
    // Otherwise try to parse as-is
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

export function formatDateForInput(dateString) {
  if (!dateString) return "";

  try {
    let date;

    // If it's just a date (YYYY-MM-DD), convert to datetime for input
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString + "T09:00";
    }
    // If it's incomplete datetime (YYYY-MM-DDTHH)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(dateString)) {
      return dateString.padEnd(13, "0") + ":00";
    }
    // If it's incomplete datetime (YYYY-MM-DDTHH:MM)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(dateString)) {
      return dateString;
    }
    // If it's full datetime (YYYY-MM-DDTHH:MM:SS)
    else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}/.test(dateString)) {
      return dateString.substring(0, 16);
    }
    // Try to parse and format
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

// HTML escape utility
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Markdown to HTML converter
export function markdownToHtml(markdown) {
  if (!markdown) return "";

  let html = markdown;

  // Headers
  html = html.replace(
    /^### (.*$)/gim,
    '<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">$1</h3>',
  );
  html = html.replace(
    /^## (.*$)/gim,
    '<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">$1</h2>',
  );
  html = html.replace(
    /^# (.*$)/gim,
    '<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">$1</h1>',
  );

  // Bold and italic
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>',
  );
  html = html.replace(
    /\*(.*?)\*/g,
    '<em class="italic text-gray-700 dark:text-gray-300">$1</em>',
  );

  // Code (inline)
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>',
  );

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-gray-900 dark:text-gray-100 underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Simple line processing for better text wrapping
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        return "<br>";
      }

      // Handle list items
      if (trimmed.startsWith("- ")) {
        return `<li class="text-gray-700 dark:text-gray-300 mb-1">${trimmed.substring(2)}</li>`;
      }

      // Skip already processed HTML
      if (trimmed.startsWith("<")) {
        return trimmed;
      }

      // Wrap plain text in paragraphs
      return `<p class="text-gray-700 dark:text-gray-300 mb-2">${trimmed}</p>`;
    })
    .join("");

  // Wrap consecutive list items
  html = html.replace(
    /(<li[^>]*>.*?<\/li>)+/g,
    '<ul class="list-disc list-inside mb-3">$&</ul>',
  );

  // Clean up consecutive <br> tags
  html = html.replace(/(<br>\s*){2,}/g, "<br>");

  return html;
}

// Priority utilities
export function getPriorityColor(priority) {
  switch (priority) {
    case 1:
      return "gray-900";
    case 2:
      return "gray-700";
    case 3:
      return "gray-500";
    case 4:
      return "gray-400";
    case 5:
      return "gray-300";
    default:
      return "gray-400";
  }
}

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
