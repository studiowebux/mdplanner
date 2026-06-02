// Mention autocomplete — @name trigger in data-mentions textareas.
// Fetches /autocomplete/people?q=<query>, renders a dropdown, inserts @name on select.
// Follows IIFE + var pattern (same as autocomplete.js, tags-input.js).

(function () {
  var DROPDOWN_ID = "mention-autocomplete-dropdown";
  var MIN_QUERY_LEN = 1;
  var active = null; // { textarea, start, query }

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
    var root = document.documentElement;
    root.style.setProperty(
      "--mention-top",
      (rect.bottom + window.scrollY) + "px",
    );
    root.style.setProperty(
      "--mention-left",
      (rect.left + window.scrollX) + "px",
    );
    root.style.setProperty("--mention-width", rect.width + "px");
  }

  function insertMention(textarea, name) {
    if (!active) return;
    var before = textarea.value.slice(0, active.start);
    var after = textarea.value.slice(active.start + active.query.length + 1);
    textarea.value = before + "@" + name + " " + after;
    // move cursor after inserted mention
    var pos = before.length + name.length + 2;
    textarea.setSelectionRange(pos, pos);
    textarea.focus();
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
      li.setAttribute("data-name", item.name);
      li.textContent = item.name;
      li.addEventListener("mousedown", function (e) {
        e.preventDefault();
        insertMention(textarea, item.name);
      });
      dropdown.appendChild(li);
    });
    positionDropdown(textarea);
  }

  function fetchSuggestions(query, textarea) {
    var url = "/autocomplete/people?q=" + encodeURIComponent(query);
    fetch(url)
      .then(function (r) {
        return r.text();
      })
      .then(function (html) {
        // autocomplete route returns <li> HTML fragments — parse names from them
        var tmp = document.createElement("ul");
        tmp.innerHTML = html;
        var items = [];
        tmp.querySelectorAll("li[data-value]").forEach(function (li) {
          items.push({ name: li.textContent.trim() });
        });
        if (active) renderItems(items, textarea);
      });
  }

  function onInput(e) {
    var textarea = e.target;
    if (!textarea.hasAttribute("data-mentions")) return;

    var val = textarea.value;
    var cursor = textarea.selectionStart;

    // Find the last @ before cursor that isn't preceded by a word char
    var segment = val.slice(0, cursor);
    var atIdx = segment.lastIndexOf("@");
    if (atIdx === -1) {
      closeDropdown();
      return;
    }

    // Ensure no space between @ and cursor
    var query = segment.slice(atIdx + 1);
    if (/\s/.test(query)) {
      closeDropdown();
      return;
    }

    if (query.length < MIN_QUERY_LEN) {
      closeDropdown();
      return;
    }

    active = { textarea: textarea, start: atIdx, query: query };
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
      var name = activeItem.getAttribute("data-name");
      if (name && active) insertMention(active.textarea, name);
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
})();
