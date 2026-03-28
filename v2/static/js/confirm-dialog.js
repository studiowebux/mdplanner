// Confirm dialog — promise-based API.
// Usage: confirmAction({ title, message, confirmLabel }).then(function(ok) { ... })

(function () {
  var dialog = document.getElementById("confirm-dialog");
  if (!dialog) return;

  var titleEl = document.getElementById("confirm-dialog-title");
  var msgEl = document.getElementById("confirm-dialog-message");
  var confirmBtn = dialog.querySelector(".confirm-dialog__confirm");
  var cancelBtn = dialog.querySelector(".confirm-dialog__cancel");
  var _resolve = null;

  window.confirmAction = function (opts) {
    titleEl.textContent = opts.title || "Confirm";
    msgEl.textContent = opts.message || "Are you sure?";
    confirmBtn.textContent = opts.confirmLabel || "Confirm";
    dialog.showModal();
    return new Promise(function (resolve) {
      _resolve = resolve;
    });
  };

  confirmBtn.addEventListener("click", function () {
    dialog.close();
    if (_resolve) _resolve(true);
    _resolve = null;
  });

  cancelBtn.addEventListener("click", function () {
    dialog.close();
    if (_resolve) _resolve(false);
    _resolve = null;
  });

  dialog.addEventListener("close", function () {
    if (_resolve) _resolve(false);
    _resolve = null;
  });
})();
