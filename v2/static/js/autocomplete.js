// Autocomplete — shows all options on focus, filters on type, bolds matches.

(function () {
  var DEBOUNCE_MS = 150;
  var timers = {};

  function fetchResults(input) {
    var source = input.getAttribute("data-autocomplete-source");
    var displayKey = input.getAttribute("data-autocomplete-display");
    var valueKey = input.getAttribute("data-autocomplete-value");
    var targetId = input.getAttribute("data-autocomplete-target");
    var listId = targetId + "-results";
    var list = document.getElementById(listId);
    var query = input.value.trim();

    clearTimeout(timers[targetId]);

    timers[targetId] = setTimeout(function () {
      var url = source;
      if (query.length > 0) {
        var sep = source.indexOf("?") === -1 ? "?" : "&";
        url = source + sep + "q=" + encodeURIComponent(query);
      }

      fetch(url)
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
            li.setAttribute("data-value", item[valueKey]);

            var text = item[displayKey];
            if (query.length > 0) {
              var idx = text.toLowerCase().indexOf(query.toLowerCase());
              if (idx >= 0) {
                li.innerHTML =
                  escapeHtml(text.slice(0, idx)) +
                  "<strong>" + escapeHtml(text.slice(idx, idx + query.length)) + "</strong>" +
                  escapeHtml(text.slice(idx + query.length));
              } else {
                li.textContent = text;
              }
            } else {
              li.textContent = text;
            }

            list.appendChild(li);
          });
        });
    }, query.length > 0 ? DEBOUNCE_MS : 0);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Show all on focus
  document.addEventListener("focusin", function (e) {
    var input = e.target.closest("[data-autocomplete-source]");
    if (input) fetchResults(input);
  });

  // Filter on type
  document.addEventListener("input", function (e) {
    var input = e.target.closest("[data-autocomplete-source]");
    if (input) fetchResults(input);
  });

  // Select item or close on outside click
  document.addEventListener("click", function (e) {
    var item = e.target.closest(".form__autocomplete-item");
    if (!item) {
      // Don't close if clicking inside the autocomplete wrapper (input, list, etc.)
      if (e.target.closest(".form__autocomplete")) return;
      var lists = document.querySelectorAll(".form__autocomplete-list");
      for (var i = 0; i < lists.length; i++) lists[i].innerHTML = "";
      return;
    }

    var list = item.closest(".form__autocomplete-list");
    var wrapper = item.closest(".form__autocomplete");
    if (!wrapper) return;

    var searchInput = wrapper.querySelector("[data-autocomplete-target]");
    var targetId = searchInput.getAttribute("data-autocomplete-target");
    var displayKey = searchInput.getAttribute("data-autocomplete-display");
    var hidden = document.getElementById(targetId);

    var value = item.getAttribute("data-value");
    var text = item.textContent;

    if (hidden) hidden.value = value;
    if (searchInput) searchInput.value = text;
    if (list) list.innerHTML = "";
  });
})();
