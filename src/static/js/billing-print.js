// Auto-triggers window.print() after a billing print page (invoice or quote)
// fully loads. Shared by invoice-print.tsx and quote-print.tsx.
window.addEventListener("load", function () {
  window.print();
});
