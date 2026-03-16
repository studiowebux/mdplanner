// Autocomplete — debounced fetch from data-autocomplete-source.
// Populates a hidden input (data-autocomplete-target) with the selected value.

(function () {
  var DEBOUNCE_MS = 250;
  var timers = {};

  document.addEventListener("input", function (e) {
    var input = e.target.closest("[data-autocomplete-source]");
    if (!input) return;

    var source = input.getAttribute("data-autocomplete-source");
    var displayKey = input.getAttribute("data-autocomplete-display");
    var valueKey = input.getAttribute("data-autocomplete-value");
    var targetId = input.getAttribute("data-autocomplete-target");
    var listId = targetId + "-results";
    var list = document.getElementById(listId);
    var query = input.value.trim();

    clearTimeout(timers[targetId]);

    if (query.length < 1) {
      if (list) list.innerHTML = "";
      return;
    }

    timers[targetId] = setTimeout(function () {
      var sep = source.indexOf("?") === -1 ? "?" : "&";
      fetch(source + sep + "q=" + encodeURIComponent(query))
        .then(function (r) { return r.json(); })
        .then(function (items) {
          if (!list) return;
          list.innerHTML = "";
          if (!Array.isArray(items) || items.length === 0) {
            list.innerHTML = "<li class=\"form__autocomplete-empty\">No results</li>";
            return;
          }
          items.forEach(function (item) {
            var li = document.createElement("li");
            li.className = "form__autocomplete-item";
            li.textContent = item[displayKey];
            li.setAttribute("data-value", item[valueKey]);
            list.appendChild(li);
          });
        });
    }, DEBOUNCE_MS);
  });

  document.addEventListener("click", function (e) {
    var item = e.target.closest(".form__autocomplete-item");
    if (!item) {
      // Click outside — close all lists
      var lists = document.querySelectorAll(".form__autocomplete-list");
      for (var i = 0; i < lists.length; i++) lists[i].innerHTML = "";
      return;
    }

    var list = item.closest(".form__autocomplete-list");
    var wrapper = item.closest(".form__autocomplete");
    if (!wrapper) return;

    var searchInput = wrapper.querySelector("[data-autocomplete-target]");
    var targetId = searchInput.getAttribute("data-autocomplete-target");
    var hidden = document.getElementById(targetId);

    if (hidden) hidden.value = item.getAttribute("data-value");
    if (searchInput) searchInput.value = item.textContent;
    if (list) list.innerHTML = "";
  });
})();
