// Habit note dialog — JS sets hx-post URL + hx-target, htmx submits the form.

(function () {
  const dialog = document.getElementById("habit-note-dialog");
  const form = document.getElementById("habit-note-form");
  const noteInput = document.getElementById("habit-note-input");
  const cancelBtn = document.getElementById("habit-note-cancel");

  if (!dialog || !form || !noteInput || !cancelBtn) return;

  document.body.appendChild(dialog);

  function openFor(postUrl, targetSelector) {
    form.setAttribute("hx-post", postUrl);
    form.setAttribute("hx-target", targetSelector);
    noteInput.value = "";
    htmx.process(form);
    dialog.showModal();
    noteInput.focus();
  }

  function postDirect(postUrl, targetSelector) {
    htmx.ajax("POST", postUrl, { target: targetSelector, swap: "outerHTML" });
  }

  document.addEventListener("click", (e) => {
    const cell = e.target.closest(".habit-heatmap__cell");
    if (cell) {
      const row = cell.closest(".habit-heatmap__row");
      const habitId = row.dataset.habitId;
      const date = cell.dataset.date;
      const isDone = cell.dataset.done === "true";
      if (isDone) {
        postDirect(
          `/habits/${habitId}/toggle-date/${date}`,
          `#hrow-${habitId}`,
        );
      } else {
        openFor(
          `/habits/${habitId}/toggle-date/${date}`,
          `#hrow-${habitId}`,
        );
      }
      return;
    }

    const btn = e.target.closest("[data-action='log-today']");
    if (btn) {
      const habitId = btn.dataset.habitId;
      openFor(
        `/habits/${habitId}/check-today`,
        `[data-id='${habitId}']`,
      );
    }
  });

  form.addEventListener("htmx:afterRequest", (e) => {
    if (e.detail.successful) dialog.close();
  });

  cancelBtn.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    noteInput.value = "";
  });
})();
