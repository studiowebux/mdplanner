// Autocomplete utility
// Shared reusable autocomplete dropdown, extracted from meeting-sidenav.js.
// Pattern: position:fixed dropdown appended to body, filtered on keystroke.
//
// Usage:
//   const detach = bindAutocomplete(inputEl, () => ["Alice", "Bob"], (name) => {
//     inputEl.value = name;
//   });
//   // Call detach() to remove the dropdown from the DOM when done.

import { escapeHtml } from "../utils.js";

/**
 * Attach a suggestion dropdown to an input element.
 *
 * @param {HTMLInputElement} inputEl  - The input to enhance
 * @param {() => string[]} getSuggestions - Called on each keystroke; returns string list
 * @param {(value: string) => void} onSelect - Called when user picks a suggestion
 * @returns {{ detach: () => void }} - Call detach() to remove the dropdown
 */
export function bindAutocomplete(inputEl, getSuggestions, onSelect) {
  const dropdown = document.createElement("ul");
  dropdown.className = "autocomplete-dropdown";
  dropdown.style.cssText = "position:fixed;display:none;z-index:10000;";
  document.body.appendChild(dropdown);

  const hide = () => {
    dropdown.style.display = "none";
  };

  const show = () => {
    const query = inputEl.value.toLowerCase().trim();
    const suggestions = getSuggestions();
    const matches = suggestions
      .filter((s) => !query || s.toLowerCase().includes(query))
      .slice(0, 8);

    if (matches.length === 0) {
      hide();
      return;
    }

    dropdown.innerHTML = matches
      .map((s) => `<li class="autocomplete-item">${escapeHtml(s)}</li>`)
      .join("");

    // Position: prefer below input, flip above if not enough room
    const rect = inputEl.getBoundingClientRect();
    const estHeight = Math.min(matches.length * 32 + 8, 160);
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
    if (window.innerHeight - rect.bottom >= estHeight) {
      dropdown.style.top = `${rect.bottom + 2}px`;
      dropdown.style.bottom = "auto";
    } else {
      dropdown.style.top = "auto";
      dropdown.style.bottom = `${window.innerHeight - rect.top + 2}px`;
    }
    dropdown.style.display = "block";

    dropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
      item.addEventListener("mousedown", (e) => {
        e.preventDefault(); // keep focus on input so blur doesn't race
        onSelect(item.textContent);
        hide();
      });
    });
  };

  inputEl.addEventListener("input", show);
  inputEl.addEventListener("focus", show);
  inputEl.addEventListener("blur", () => setTimeout(hide, 150));

  return {
    detach() {
      inputEl.removeEventListener("input", show);
      inputEl.removeEventListener("focus", show);
      dropdown.remove();
    },
  };
}
