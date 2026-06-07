// Global-filter pure logic — DOM-free so it can be unit-tested in Deno
// (loaded as a classic script before global-filter.js; assigns globalThis.
// GlobalFilterCore). Mirrors the mindmap-layout.js + tests pattern.

(function (root) {
  // Case-insensitive substring match. Empty/whitespace query matches all.
  function matchesQuery(label, query) {
    var q = String(query == null ? "" : query).trim().toLowerCase();
    if (q === "") return true;
    return String(label == null ? "" : label).toLowerCase().indexOf(q) !== -1;
  }

  // Values whose label matches the query. Used by the search filter (hide
  // non-matching) AND by All/None so they only act on visible options.
  function visibleValues(options, query) {
    var out = [];
    for (var i = 0; i < options.length; i++) {
      if (matchesQuery(options[i].label, query)) out.push(options[i].value);
    }
    return out;
  }

  root.GlobalFilterCore = {
    matchesQuery: matchesQuery,
    visibleValues: visibleValues,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
