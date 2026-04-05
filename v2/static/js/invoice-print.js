document.addEventListener("click", function (e) {
  if (e.target.closest("[data-action='print']")) {
    window.print();
  }
});
