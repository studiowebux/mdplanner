/**
 * Fuzzy autocomplete widget.
 *
 * Replaces native <datalist> with a custom dropdown that scores and ranks
 * suggestions using subsequence matching + 1-edit typo tolerance.
 *
 * Usage:
 *   const ac = new FuzzyAutocomplete(inputEl, () => ["Apple", "Banana"]);
 *   // later, if suggestions change:
 *   ac.setSuggestions(["Apple", "Cherry"]);
 *   // destroy when done:
 *   ac.destroy();
 */
export class FuzzyAutocomplete {
  /**
   * @param {HTMLInputElement} input
   * @param {() => string[]} getSuggestions - called each time the dropdown opens
   * @param {object} [opts]
   * @param {number} [opts.maxResults=8]
   * @param {(value: string) => void} [opts.onSelect] - extra callback on selection
   */
  constructor(input, getSuggestions, opts = {}) {
    this._input = input;
    this._getSuggestions = getSuggestions;
    this._maxResults = opts.maxResults ?? 8;
    this._onSelect = opts.onSelect ?? null;
    this._dropdown = null;
    this._activeIndex = -1;
    this._suggestions = [];

    this._onInput = () => this._open();
    this._onKeydown = (e) => this._handleKey(e);
    this._onFocus = () => this._open();
    this._onDocClick = (e) => {
      if (!this._dropdown?.contains(e.target) && e.target !== this._input) {
        this._close();
      }
    };

    input.setAttribute("autocomplete", "off");
    input.addEventListener("input", this._onInput);
    input.addEventListener("keydown", this._onKeydown);
    input.addEventListener("focus", this._onFocus);
    document.addEventListener("click", this._onDocClick, { capture: true });
  }

  /** Replace the suggestion source (e.g. after async data load). */
  setSuggestions(list) {
    this._suggestions = list;
  }

  destroy() {
    this._close();
    this._input.removeEventListener("input", this._onInput);
    this._input.removeEventListener("keydown", this._onKeydown);
    this._input.removeEventListener("focus", this._onFocus);
    document.removeEventListener("click", this._onDocClick, { capture: true });
  }

  // --- Private ---

  _open() {
    const query = this._input.value.trim();
    const allSuggestions = this._getSuggestions();
    const results = query
      ? this._rank(query, allSuggestions).slice(0, this._maxResults)
      : allSuggestions.slice(0, this._maxResults);

    if (!results.length) { this._close(); return; }

    if (!this._dropdown) {
      this._dropdown = document.createElement("ul");
      this._dropdown.className = "fuzzy-autocomplete-dropdown";
      document.body.appendChild(this._dropdown);
    }

    this._activeIndex = -1;
    this._renderItems(results, query);
    this._positionDropdown();
  }

  _renderItems(items, query) {
    this._dropdown.innerHTML = "";
    items.forEach((text, i) => {
      const li = document.createElement("li");
      li.className = "fuzzy-autocomplete-item";
      li.innerHTML = query ? this._highlight(text, query) : this._escapeHtml(text);
      li.addEventListener("mousedown", (e) => {
        e.preventDefault(); // prevent input blur
        this._select(text);
      });
      this._dropdown.appendChild(li);
    });
  }

  _positionDropdown() {
    const rect = this._input.getBoundingClientRect();
    this._dropdown.style.position = "fixed";
    this._dropdown.style.top = `${rect.bottom + 2}px`;
    this._dropdown.style.left = `${rect.left}px`;
    this._dropdown.style.width = `${rect.width}px`;
    this._dropdown.style.zIndex = "9999";
  }

  _close() {
    this._dropdown?.remove();
    this._dropdown = null;
    this._activeIndex = -1;
  }

  _select(value) {
    this._input.value = value;
    this._input.dispatchEvent(new Event("change", { bubbles: true }));
    this._onSelect?.(value);
    this._close();
  }

  _handleKey(e) {
    if (!this._dropdown) return;
    const items = this._dropdown.querySelectorAll(".fuzzy-autocomplete-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this._activeIndex = Math.min(this._activeIndex + 1, items.length - 1);
      this._updateActive(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this._activeIndex = Math.max(this._activeIndex - 1, -1);
      this._updateActive(items);
    } else if (e.key === "Enter" && this._activeIndex >= 0) {
      e.preventDefault();
      this._select(items[this._activeIndex].textContent);
    } else if (e.key === "Escape") {
      this._close();
    }
  }

  _updateActive(items) {
    items.forEach((li, i) => {
      li.classList.toggle("fuzzy-autocomplete-active", i === this._activeIndex);
    });
    if (this._activeIndex >= 0) {
      items[this._activeIndex].scrollIntoView({ block: "nearest" });
    }
  }

  // --- Fuzzy scoring ---

  _rank(query, candidates) {
    const q = query.toLowerCase();
    return candidates
      .map((c) => ({ text: c, score: this._score(q, c.toLowerCase()) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.text);
  }

  _score(q, s) {
    if (s === q) return 1000;
    if (s.startsWith(q)) return 900;
    if (s.includes(q)) return 800;

    // Subsequence scoring — all query chars must appear in order
    const subScore = this._subsequenceScore(q, s);
    if (subScore > 0) return subScore;

    // Typo tolerance: try deleting one character from query
    for (let i = 0; i < q.length; i++) {
      const variant = q.slice(0, i) + q.slice(i + 1);
      if (!variant) continue;
      if (s.includes(variant)) return 200;
      if (this._subsequenceScore(variant, s) > 0) return 150;
    }

    return 0;
  }

  _subsequenceScore(q, s) {
    let qi = 0, score = 0, consecutive = 0;
    for (let si = 0; si < s.length && qi < q.length; si++) {
      if (s[si] === q[qi]) {
        qi++;
        score += 10 + consecutive * 5;
        consecutive++;
      } else {
        consecutive = 0;
      }
    }
    return qi === q.length ? score : 0;
  }

  // --- Highlight matched chars (simple: highlight substring or wrap all) ---

  _highlight(text, query) {
    const escaped = this._escapeHtml(text);
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Highlight exact substring if present
    const idx = t.indexOf(q);
    if (idx !== -1) {
      return (
        this._escapeHtml(text.slice(0, idx)) +
        `<mark class="fuzzy-highlight">${this._escapeHtml(text.slice(idx, idx + q.length))}</mark>` +
        this._escapeHtml(text.slice(idx + q.length))
      );
    }
    return escaped;
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
