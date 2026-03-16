// Sidenav — open/close via data attributes.
// Open:  data-sidenav-open="<sidenav-id>" on any trigger element.
// Close: data-sidenav-close on any element inside the sidenav (or backdrop).

(function () {
  document.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-sidenav-open]");
    if (openBtn) {
      var id = openBtn.getAttribute("data-sidenav-open");
      var el = document.getElementById(id);
      if (el) {
        el.classList.add("is-open");
        el.setAttribute("aria-hidden", "false");
      }
      return;
    }

    var closeBtn = e.target.closest("[data-sidenav-close]");
    if (closeBtn) {
      var el = closeBtn.closest(".sidenav");
      if (el) {
        el.classList.remove("is-open");
        el.setAttribute("aria-hidden", "true");
      }
    }
  });
})();
