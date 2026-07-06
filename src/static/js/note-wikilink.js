// Wiki-link autocomplete — `[[` trigger in the note editor.
//
// Typing `[[query` in a `.note-editor__textarea` opens a dropdown of matching
// entities (notes, tasks, portfolio, people) from /autocomplete/entities.
// Selecting one inserts a `[[<id>|<title>]]` token; WikiLinkText renders it as
// a link to the entity's detail page (the id prefix encodes the type).
//
// Mirrors mention-autocomplete.js (@name): same dropdown CSS, fetch-parses the
// shared autocomplete <li> fragments. Classic browser IIFE — assigns
// globalThis.NoteWikilink so the pure token builder is unit-testable; DOM wiring
// is guarded by `typeof document` so importing under Deno does not touch the DOM.
(function (root) {
  "use strict";

  // Build the inline token. A `]` in a title would break parsing, so it is
  // stripped; titles do not legitimately contain it.
  function buildToken(id, name) {
    return "[[" + id + "|" + String(name).replace(/\]/g, "") + "]]";
  }

  root.NoteWikilink = { buildToken: buildToken };

  if (typeof document === "undefined") return;

  var DROPDOWN_ID = "wikilink-autocomplete-dropdown";
  var MIN_QUERY_LEN = 1;
  var active = null; // { textarea, start, query }  (start = index of the `[[`)

  function getOrCreateDropdown() {
    var el = document.getElementById(DROPDOWN_ID);
    if (!el) {
      el = document.createElement("ul");
      el.id = DROPDOWN_ID;
      el.className = "mention-autocomplete__list";
      el.setAttribute("role", "listbox");
      document.body.appendChild(el);
    }
    return el;
  }

  function closeDropdown() {
    var el = document.getElementById(DROPDOWN_ID);
    if (el) el.innerHTML = "";
    active = null;
  }

  function positionDropdown(textarea) {
    var rect = textarea.getBoundingClientRect();
    var rootEl = document.documentElement;
    rootEl.style.setProperty(
      "--mention-top",
      (rect.bottom + globalThis.scrollY) + "px",
    );
    rootEl.style.setProperty(
      "--mention-left",
      (rect.left + globalThis.scrollX) + "px",
    );
    rootEl.style.setProperty("--mention-width", rect.width + "px");
  }

  function insertLink(textarea, id, name) {
    if (!active) return;
    var before = textarea.value.slice(0, active.start);
    var after = textarea.value.slice(active.start + active.query.length + 2);
    var token = buildToken(id, name);
    textarea.value = before + token + after;
    var pos = before.length + token.length;
    textarea.setSelectionRange(pos, pos);
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    closeDropdown();
  }

  function renderItems(items, textarea) {
    var dropdown = getOrCreateDropdown();
    dropdown.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("li");
      empty.className = "mention-autocomplete__empty";
      empty.textContent = "No results";
      dropdown.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "mention-autocomplete__item form__autocomplete-item";
      li.setAttribute("role", "option");
      li.setAttribute("data-id", item.id);
      li.setAttribute("data-name", item.name);
      li.textContent = item.name;
      li.addEventListener("mousedown", function (e) {
        e.preventDefault();
        insertLink(textarea, item.id, item.name);
      });
      dropdown.appendChild(li);
    });
    positionDropdown(textarea);
  }

  function fetchSuggestions(query, textarea) {
    fetch("/autocomplete/entities?q=" + encodeURIComponent(query))
      .then(function (r) {
        return r.text();
      })
      .then(function (html) {
        var tmp = document.createElement("ul");
        tmp.innerHTML = html;
        var items = [];
        tmp.querySelectorAll("li[data-value]").forEach(function (li) {
          items.push({
            id: li.getAttribute("data-value"),
            name: (li.getAttribute("data-title") || li.textContent).trim(),
          });
        });
        if (active) renderItems(items, textarea);
      });
  }

  function onInput(e) {
    var textarea = e.target;
    if (!textarea.matches || !textarea.matches(".note-editor__textarea")) {
      return;
    }

    var segment = textarea.value.slice(0, textarea.selectionStart);
    var openIdx = segment.lastIndexOf("[[");
    if (openIdx === -1) {
      closeDropdown();
      return;
    }
    var query = segment.slice(openIdx + 2);
    // A `]` or newline closes the trigger; the token must be on one line.
    if (/[\]\n]/.test(query) || query.length < MIN_QUERY_LEN) {
      closeDropdown();
      return;
    }
    active = { textarea: textarea, start: openIdx, query: query };
    fetchSuggestions(query, textarea);
  }

  function onKeydown(e) {
    var dropdown = document.getElementById(DROPDOWN_ID);
    if (!dropdown || !dropdown.children.length) return;
    var items = dropdown.querySelectorAll(".mention-autocomplete__item");
    if (!items.length) return;

    var activeItem = dropdown.querySelector(
      ".mention-autocomplete__item--active",
    );
    var idx = -1;
    items.forEach(function (item, i) {
      if (item === activeItem) idx = i;
    });

    if (e.key === "ArrowDown") {
      e.preventDefault();
      var next = items[idx + 1] || items[0];
      if (activeItem) {
        activeItem.classList.remove("mention-autocomplete__item--active");
      }
      next.classList.add("mention-autocomplete__item--active");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      var prev = items[idx - 1] || items[items.length - 1];
      if (activeItem) {
        activeItem.classList.remove("mention-autocomplete__item--active");
      }
      prev.classList.add("mention-autocomplete__item--active");
    } else if (e.key === "Enter" && activeItem) {
      e.preventDefault();
      if (active) {
        insertLink(
          active.textarea,
          activeItem.getAttribute("data-id"),
          activeItem.getAttribute("data-name"),
        );
      }
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  }

  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("click", function (e) {
    var dropdown = document.getElementById(DROPDOWN_ID);
    if (dropdown && !dropdown.contains(e.target)) closeDropdown();
  });
})(globalThis);
