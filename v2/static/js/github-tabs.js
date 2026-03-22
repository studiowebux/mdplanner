// GitHub tabs — toggle active class on click via event delegation.
document.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-github-tab]");
  if (!btn) return;
  var tabs = btn.closest(".github-tabs");
  if (!tabs) return;
  tabs.querySelectorAll("[data-github-tab]").forEach(function (b) {
    b.classList.remove("github-tabs__btn--active");
  });
  btn.classList.add("github-tabs__btn--active");
});
