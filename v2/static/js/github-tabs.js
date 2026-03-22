// GitHub tabs — toggle active class on click + refresh via event delegation.
document.addEventListener("click", function (e) {
  var tab = e.target.closest("[data-github-tab]");
  if (tab) {
    var tabs = tab.closest(".github-tabs");
    if (!tabs) return;
    tabs.querySelectorAll("[data-github-tab]").forEach(function (b) {
      b.classList.remove("github-tabs__btn--active");
    });
    tab.classList.add("github-tabs__btn--active");
    return;
  }

  var refresh = e.target.closest("[data-github-refresh]");
  if (refresh) {
    var container = refresh.closest(".github-tabs");
    if (!container) return;
    var active = container.querySelector(".github-tabs__btn--active");
    if (active) active.click();
  }
});
