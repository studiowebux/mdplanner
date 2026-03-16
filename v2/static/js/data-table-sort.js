// DataTable client-side sorting — click sortable column headers.

(function () {
  var sortState = {};

  document.addEventListener("click", function (e) {
    var th = e.target.closest(".data-table__th--sortable");
    if (!th) return;

    var table = th.closest(".data-table");
    if (!table) return;

    var key = th.getAttribute("data-sort-key");
    var tableId = table.id || "default";
    var prev = sortState[tableId];
    var asc = prev && prev.key === key ? !prev.asc : true;
    sortState[tableId] = { key: key, asc: asc };

    // Update header indicators
    var ths = table.querySelectorAll(".data-table__th--sortable");
    for (var i = 0; i < ths.length; i++) {
      ths[i].classList.remove("data-table__th--asc", "data-table__th--desc");
    }
    th.classList.add(asc ? "data-table__th--asc" : "data-table__th--desc");

    // Sort rows
    var tbody = table.querySelector(".data-table__body");
    var rows = Array.from(tbody.querySelectorAll(".data-table__row"));
    var colIdx = Array.from(th.parentNode.children).indexOf(th);

    rows.sort(function (a, b) {
      var aVal = a.children[colIdx].textContent.trim();
      var bVal = b.children[colIdx].textContent.trim();
      var aNum = parseFloat(aVal);
      var bNum = parseFloat(bVal);
      var cmp = (!isNaN(aNum) && !isNaN(bNum))
        ? aNum - bNum
        : aVal.localeCompare(bVal);
      return asc ? cmp : -cmp;
    });

    for (var j = 0; j < rows.length; j++) {
      tbody.appendChild(rows[j]);
    }
  });
})();
