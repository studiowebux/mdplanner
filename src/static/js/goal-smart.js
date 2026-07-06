// SMART criteria live hints for the goal form.
// Progressive enhancement — form works without this script.
(function () {
  var CONTAINER_ID = "goals-form-container";
  var HINTS_ID = "smart-hints";

  var CRITERIA = [
    { key: "S", label: "Specific", check: checkSpecific },
    { key: "M", label: "Measurable", check: checkMeasurable },
    { key: "A", label: "Achievable", check: null },
    { key: "R", label: "Relevant", check: checkRelevant },
    { key: "T", label: "Time-bound", check: checkTimeBound },
  ];

  function getField(name) {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) return null;
    return container.querySelector('[name="' + name + '"]');
  }

  function val(name) {
    var el = getField(name);
    return el ? el.value.trim() : "";
  }

  function checkSpecific() {
    return val("title").length > 10;
  }

  function checkMeasurable() {
    return val("kpi").length > 0 || val("kpiMetric").length > 0;
  }

  function checkRelevant() {
    return val("project").length > 0;
  }

  function checkTimeBound() {
    return val("startDate").length > 0 && val("endDate").length > 0;
  }

  function buildHints() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    var form = container.querySelector("form");
    if (!form) return;

    // Don't duplicate
    if (document.getElementById(HINTS_ID)) return;

    var wrapper = document.createElement("div");
    wrapper.id = HINTS_ID;
    wrapper.className = "smart-hints";

    var heading = document.createElement("div");
    heading.className = "smart-hints__title";
    heading.textContent = "SMART Criteria";
    wrapper.appendChild(heading);

    var list = document.createElement("ul");
    list.className = "smart-hints__list";

    for (var i = 0; i < CRITERIA.length; i++) {
      var c = CRITERIA[i];
      var li = document.createElement("li");
      li.className = "smart-hints__item";
      li.setAttribute("data-smart", c.key);

      var icon = document.createElement("span");
      icon.className = "smart-hints__icon";
      li.appendChild(icon);

      var label = document.createElement("span");
      label.className = "smart-hints__label";
      label.textContent = c.key + " — " + c.label;
      li.appendChild(label);

      if (!c.check) {
        // Achievable is always a reminder
        var hint = document.createElement("span");
        hint.className = "smart-hints__hint";
        hint.textContent = "(describe how in description)";
        li.appendChild(hint);
      }

      list.appendChild(li);
    }

    wrapper.appendChild(list);
    form.parentNode.insertBefore(wrapper, form.nextSibling);

    updateHints();
  }

  function updateHints() {
    for (var i = 0; i < CRITERIA.length; i++) {
      var c = CRITERIA[i];
      var li = document.querySelector(
        "#" + HINTS_ID + ' [data-smart="' + c.key + '"]',
      );
      if (!li) continue;

      if (!c.check) {
        // Achievable — always neutral
        li.classList.remove("smart-hints__item--pass");
        li.classList.remove("smart-hints__item--fail");
        li.classList.add("smart-hints__item--neutral");
      } else {
        var pass = c.check();
        li.classList.toggle("smart-hints__item--pass", pass);
        li.classList.toggle("smart-hints__item--fail", !pass);
        li.classList.remove("smart-hints__item--neutral");
      }
    }
  }

  function attachListeners() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    var fields = [
      "title",
      "kpi",
      "kpiMetric",
      "project",
      "startDate",
      "endDate",
    ];
    for (var i = 0; i < fields.length; i++) {
      var el = getField(fields[i]);
      if (el && !el.hasAttribute("data-smart-bound")) {
        el.setAttribute("data-smart-bound", "true");
        el.addEventListener("input", updateHints);
        el.addEventListener("change", updateHints);
      }
    }
  }

  function init() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container || !container.querySelector("form")) return;

    buildHints();
    attachListeners();
  }

  // Run after htmx swaps the form in
  document.addEventListener("htmx:afterSettle", function (e) {
    var target = e.detail.target;
    if (
      target &&
      (target.id === CONTAINER_ID ||
        target.closest("#" + CONTAINER_ID))
    ) {
      // Small delay to let the DOM settle
      requestAnimationFrame(init);
    }
  });
})();
