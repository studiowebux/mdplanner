// Tags input — multi-value pill field with optional autocomplete.
// Manages pills, hidden input (comma-separated), and Enter key to add.

(function () {
  function getState(field) {
    var hidden = field.querySelector("input[type='hidden']");
    var val = hidden ? hidden.value : "";
    return val
      ? val.split(",").map(function (s) {
        return s.trim();
      }).filter(Boolean)
      : [];
  }

  function setState(field, tags) {
    var hidden = field.querySelector("input[type='hidden']");
    if (hidden) {
      hidden.value = tags.join(", ");
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function renderPills(field, tags) {
    var container = field.querySelector(".form__tags-pills");
    if (!container) return;
    container.innerHTML = "";
    tags.forEach(function (tag) {
      var pill = document.createElement("span");
      pill.className = "form__tags-pill";
      pill.setAttribute("data-tag-value", tag);
      pill.textContent = tag;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "form__tags-pill-remove";
      btn.setAttribute("data-tag-remove", tag);
      btn.setAttribute("aria-label", "Remove " + tag);
      btn.innerHTML = "&times;";
      pill.appendChild(btn);
      container.appendChild(pill);
    });
  }

  function addTag(field, value) {
    var tag = value.trim();
    if (!tag) return;
    var tags = getState(field);
    if (tags.indexOf(tag) !== -1) return;
    tags.push(tag);
    setState(field, tags);
    renderPills(field, tags);
  }

  function removeTag(field, value) {
    var tags = getState(field).filter(function (t) {
      return t !== value;
    });
    setState(field, tags);
    renderPills(field, tags);
  }

  // Hide already-selected items from autocomplete results
  function hideSelected(field) {
    var tags = getState(field);
    var items = field.querySelectorAll(".form__autocomplete-item");
    for (var i = 0; i < items.length; i++) {
      var val = items[i].getAttribute("data-value") || items[i].textContent;
      items[i].style.display = tags.indexOf(val) !== -1 ? "none" : "";
    }
  }

  // Watch for htmx swaps that populate the autocomplete list
  document.addEventListener("htmx:afterSwap", function (e) {
    var field = e.target.closest(".form__tags");
    if (field) hideSelected(field);
  });

  // Enter key — add tag from input
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var input = e.target.closest("[data-tags-target]");
    if (!input) return;
    e.preventDefault();
    var field = input.closest(".form__tags");
    if (field) {
      addTag(field, input.value);
      input.value = "";
      // Clear autocomplete results
      var list = field.querySelector(".form__autocomplete-list");
      if (list) list.innerHTML = "";
    }
  });

  // Click pill remove button
  document.addEventListener("click", function (e) {
    var removeBtn = e.target.closest("[data-tag-remove]");
    if (removeBtn) {
      var field = removeBtn.closest(".form__tags");
      if (field) removeTag(field, removeBtn.getAttribute("data-tag-remove"));
      return;
    }

    // Autocomplete item selection in tags context
    var item = e.target.closest(".form__autocomplete-item");
    if (!item) return;
    var field = item.closest(".form__tags");
    if (!field) return; // Not a tags field — let autocomplete.js handle it
    e.stopPropagation();
    addTag(field, item.getAttribute("data-value") || item.textContent || "");
    var input = field.querySelector("[data-tags-target]");
    if (input) input.value = "";
    var list = item.closest(".form__autocomplete-list");
    if (list) list.innerHTML = "";
  });
})();
