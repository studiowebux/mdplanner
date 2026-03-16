// View toggle — persists preference to localStorage and sets active button class.
// htmx handles the actual view swap via hx-get on the toggle buttons.

(function () {
  var STORAGE_PREFIX = "viewMode:";

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-view-mode]");
    if (!btn) return;
    var container = btn.closest("[data-view-domain]");
    if (!container) return;
    var domain = container.getAttribute("data-view-domain");
    var mode = btn.getAttribute("data-view-mode");

    localStorage.setItem(STORAGE_PREFIX + domain, mode);

    var btns = container.querySelectorAll("[data-view-mode]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("view-toggle__btn--active", btns[i].getAttribute("data-view-mode") === mode);
    }
  });
})();
