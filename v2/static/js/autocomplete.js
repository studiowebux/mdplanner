// Autocomplete — selection handler + keyboard navigation.
// Results are server-rendered via htmx. Clicking or pressing Enter on an <li>
// sets the hidden input value and visible text, then clears the list.
// Arrow keys navigate items, Escape closes the dropdown.
// Freetext mode: typing also syncs to the hidden input (for fields that allow new values).

(function () {
  var ACTIVE_CLASS = "form__autocomplete-item--active";

  function selectItem(item) {
    var wrapper = item.closest(".form__autocomplete");
    if (!wrapper) return;
    var search = wrapper.querySelector("[data-autocomplete-target]");
    var targetId = search
      ? search.getAttribute("data-autocomplete-target")
      : null;
    var hidden = targetId ? document.getElementById(targetId) : null;
    if (hidden) {
      hidden.value = item.getAttribute("data-value") || "";
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (search) search.value = item.textContent || "";
    var list = item.closest(".form__autocomplete-list");
    if (list) list.innerHTML = "";
  }

  function getActiveList(input) {
    var wrapper = input.closest(".form__autocomplete");
    if (!wrapper) return null;
    var list = wrapper.querySelector(".form__autocomplete-list");
    return list && list.children.length > 0 ? list : null;
  }

  function clearActive(list) {
    var prev = list.querySelector("." + ACTIVE_CLASS);
    if (prev) prev.classList.remove(ACTIVE_CLASS);
  }

  function setActive(list, index) {
    var items = list.querySelectorAll(".form__autocomplete-item");
    if (index < 0 || index >= items.length) return;
    clearActive(list);
    items[index].classList.add(ACTIVE_CLASS);
    items[index].scrollIntoView({ block: "nearest" });
  }

  function getActiveIndex(list) {
    var items = list.querySelectorAll(".form__autocomplete-item");
    for (var i = 0; i < items.length; i++) {
      if (items[i].classList.contains(ACTIVE_CLASS)) return i;
    }
    return -1;
  }

  // Click handler — select item or close on outside click
  document.addEventListener("click", function (e) {
    var item = e.target.closest(".form__autocomplete-item");
    if (item) {
      selectItem(item);
      return;
    }
    // Click outside — close all open lists
    if (
      !e.target.closest(".form__autocomplete") &&
      !e.target.closest(".form__tags")
    ) {
      var lists = document.querySelectorAll(".form__autocomplete-list");
      for (var i = 0; i < lists.length; i++) lists[i].innerHTML = "";
    }
  });

  // Keyboard navigation — arrow keys, enter, escape
  document.addEventListener("keydown", function (e) {
    var input = e.target.closest("[data-autocomplete-target]");
    if (!input) return;
    var list = getActiveList(input);
    if (!list) return;

    var items = list.querySelectorAll(".form__autocomplete-item");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      var idx = getActiveIndex(list);
      setActive(list, idx < items.length - 1 ? idx + 1 : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      var idx2 = getActiveIndex(list);
      setActive(list, idx2 > 0 ? idx2 - 1 : items.length - 1);
    } else if (e.key === "Enter") {
      var active = list.querySelector("." + ACTIVE_CLASS);
      if (active) {
        e.preventDefault();
        selectItem(active);
      }
    }
  });

  // Freetext mode — sync typed text to hidden input on every keystroke
  document.addEventListener("input", function (e) {
    var search = e.target.closest("[data-freetext]");
    if (!search) return;
    var targetId = search.getAttribute("data-autocomplete-target");
    var hidden = targetId ? document.getElementById(targetId) : null;
    if (hidden) hidden.value = search.value;
  });
})();
