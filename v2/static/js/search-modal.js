// Search modal — Cmd+K / Ctrl+K to open, ESC to close.
// Arrow keys navigate results, Enter opens full page or selected result.

(function () {
  var dialog = document.getElementById("search-dialog");
  var input = document.getElementById("search-dialog-input");
  var resultsList = document.getElementById("search-dialog-results");
  var topbarInput = document.querySelector(".topbar__search-input");
  if (!dialog || !input || !resultsList) return;

  var activeIndex = -1;

  function open() {
    input.value = "";
    activeIndex = -1;
    resultsList.innerHTML =
      '<li class="search-dialog__empty">Type to search...</li>';
    dialog.showModal();
    input.focus();
  }

  function close() {
    dialog.close();
  }

  function getItems() {
    return resultsList.querySelectorAll(".search-dialog__result");
  }

  function clearActive() {
    var items = getItems();
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("is-active");
    }
  }

  function setActive(index) {
    var items = getItems();
    if (items.length === 0) {
      activeIndex = -1;
      return;
    }
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    clearActive();
    activeIndex = index;
    items[activeIndex].classList.add("is-active");
    items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  // Cmd+K / Ctrl+K opens modal
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      open();
    }
  });

  // Topbar input click opens modal instead of native form
  if (topbarInput) {
    topbarInput.addEventListener("focus", function (e) {
      e.preventDefault();
      topbarInput.blur();
      open();
    });
  }

  function navigateToResult(item) {
    var href = item.getAttribute("data-href");
    if (href) {
      close();
      window.location.href = href;
    } else {
      close();
      window.location.href = "/search?q=" + encodeURIComponent(input.value);
    }
  }

  // Keyboard navigation inside modal
  input.addEventListener("keydown", function (e) {
    var items = getItems();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        navigateToResult(items[activeIndex]);
      } else if (input.value.trim()) {
        close();
        window.location.href = "/search?q=" + encodeURIComponent(input.value);
      }
    }
  });

  // Click on a result
  resultsList.addEventListener("click", function (e) {
    var item = e.target.closest(".search-dialog__result");
    if (!item) return;
    navigateToResult(item);
  });

  // Reset active index when results change (htmx swap)
  resultsList.addEventListener("htmx:afterSwap", function () {
    activeIndex = -1;
    clearActive();
  });

  // Close on backdrop click
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) close();
  });
})();
