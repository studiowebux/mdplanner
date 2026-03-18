// Autocomplete — selection handler only. Results are server-rendered via htmx.
// Clicking an <li> sets the hidden input value and visible text, then clears the list.

(function () {
  document.addEventListener("click", function (e) {
    var item = e.target.closest(".form__autocomplete-item");
    if (item) {
      var wrapper = item.closest(".form__autocomplete");
      if (!wrapper) return;
      var search = wrapper.querySelector("[data-autocomplete-target]");
      var targetId = search
        ? search.getAttribute("data-autocomplete-target")
        : null;
      var hidden = targetId ? document.getElementById(targetId) : null;
      if (hidden) hidden.value = item.getAttribute("data-value") || "";
      if (search) search.value = item.textContent || "";
      var list = item.closest(".form__autocomplete-list");
      if (list) list.innerHTML = "";
      return;
    }
    // Click outside — close all open lists
    if (!e.target.closest(".form__autocomplete")) {
      var lists = document.querySelectorAll(".form__autocomplete-list");
      for (var i = 0; i < lists.length; i++) lists[i].innerHTML = "";
    }
  });
})();
