// Settings page — features check/uncheck, search filter, tag/link management,
// dirty form tracking with snapshot comparison, tab indicator, beforeunload guard.

(function () {
  // -----------------------------------------------------------------------
  // Snapshot-based dirty tracking
  // -----------------------------------------------------------------------
  var snapshots = {};
  var dirtyForms = {};

  // Serialize a form's current state into a comparable string.
  // Handles text/number/date inputs, textareas, and checkboxes.
  function serializeForm(formId) {
    var form = document.getElementById(formId);
    if (!form) return "";
    var parts = [];
    var inputs = form.querySelectorAll("input, textarea, select");
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      var name = el.name;
      if (!name) continue;
      if (el.type === "checkbox") {
        parts.push(name + "=" + el.checked + ":" + el.value);
      } else {
        parts.push(name + "=" + el.value);
      }
    }
    return parts.join("&");
  }

  function snapshotForm(formId) {
    snapshots[formId] = serializeForm(formId);
    setDirty(formId, false);
  }

  function checkDirty(formId) {
    var current = serializeForm(formId);
    var isDirty = current !== snapshots[formId];
    setDirty(formId, isDirty);
  }

  function setDirty(formId, dirty) {
    dirtyForms[formId] = dirty;
    updateTabIndicator(formId, dirty);
    updateBeforeUnload();
  }

  var tabMap = {
    "features-form": "tab-views",
    "project-form": "tab-project",
    "schedule-form": "tab-schedule",
    "tags-form": "tab-tags",
    "links-form": "tab-links",
    "sections-form": "tab-sections",
  };

  function updateTabIndicator(formId, dirty) {
    var radioId = tabMap[formId];
    if (!radioId) return;
    var radio = document.getElementById(radioId);
    if (!radio) return;
    var label = radio.nextElementSibling;
    if (!label) return;
    label.classList.toggle("settings-tabs__label--dirty", dirty);
  }

  function updateBeforeUnload() {
    var anyDirty = Object.keys(dirtyForms).some(function (k) {
      return dirtyForms[k];
    });
    if (anyDirty) {
      window.onbeforeunload = function () {
        return true;
      };
    } else {
      window.onbeforeunload = null;
    }
  }

  function trackForm(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    snapshotForm(formId);
    form.addEventListener("input", function () {
      checkDirty(formId);
    });
    form.addEventListener("change", function () {
      checkDirty(formId);
    });
  }

  // Re-snapshot on successful save
  document.body.addEventListener("htmx:afterRequest", function (e) {
    var form = e.detail.elt;
    if (!form || !form.id) return;
    if (e.detail.successful) {
      snapshotForm(form.id);
    }
  });

  // Track all settings forms
  ["project-form", "schedule-form", "tags-form", "links-form", "sections-form"]
    .forEach(trackForm);

  // -----------------------------------------------------------------------
  // Features: check all / uncheck all
  // -----------------------------------------------------------------------
  var featuresForm = document.getElementById("features-form");
  var search = document.getElementById("features-search");

  if (featuresForm) {
    function toggleAll(checked) {
      featuresForm.querySelectorAll('input[name="features"]').forEach(
        function (cb) {
          cb.checked = checked;
        },
      );
      htmx.trigger(featuresForm, "change");
    }

    var checkAll = featuresForm.querySelector("[data-check-all]");
    var uncheckAll = featuresForm.querySelector("[data-uncheck-all]");
    if (checkAll) {
      checkAll.addEventListener("click", function () {
        toggleAll(true);
      });
    }
    if (uncheckAll) {
      uncheckAll.addEventListener("click", function () {
        toggleAll(false);
      });
    }
  }

  // -----------------------------------------------------------------------
  // Features: search filter
  // -----------------------------------------------------------------------
  if (search && featuresForm) {
    search.addEventListener("input", function () {
      var query = search.value.toLowerCase().trim();
      featuresForm.querySelectorAll(".settings-page__feature-item").forEach(
        function (item) {
          var label = item.querySelector(".settings-page__feature-label");
          var text = label ? label.textContent.toLowerCase() : "";
          item.classList.toggle(
            "is-hidden",
            query !== "" && text.indexOf(query) === -1,
          );
        },
      );
    });
  }

  // -----------------------------------------------------------------------
  // Tags: add / remove rows
  // -----------------------------------------------------------------------
  var tagsList = document.getElementById("tags-list");
  var addTagBtn = document.querySelector("[data-add-tag]");

  if (tagsList && addTagBtn) {
    addTagBtn.addEventListener("click", function () {
      var row = document.createElement("div");
      row.className = "settings-tag-row";
      row.innerHTML =
        '<input type="text" name="tags" placeholder="New tag" class="settings-field__input" />' +
        '<button type="button" class="btn btn--danger btn--sm" data-remove-tag>Remove</button>';
      tagsList.appendChild(row);
      row.querySelector("input").focus();
      checkDirty("tags-form");
    });

    tagsList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-tag]");
      if (btn) {
        btn.closest(".settings-tag-row").remove();
        checkDirty("tags-form");
      }
    });
  }

  // -----------------------------------------------------------------------
  // Links: add / remove rows
  // -----------------------------------------------------------------------
  var linksList = document.getElementById("links-list");
  var addLinkBtn = document.querySelector("[data-add-link]");

  if (linksList && addLinkBtn) {
    function nextLinkIndex() {
      return linksList.querySelectorAll(".settings-link-row").length;
    }

    addLinkBtn.addEventListener("click", function () {
      var i = nextLinkIndex();
      var row = document.createElement("div");
      row.className = "settings-link-row";
      row.innerHTML = '<input type="text" name="link_title_' + i +
        '" placeholder="Title" class="settings-field__input" />' +
        '<input type="url" name="link_url_' + i +
        '" placeholder="https://..." class="settings-field__input" />' +
        '<button type="button" class="btn btn--danger btn--sm" data-remove-link>Remove</button>';
      linksList.appendChild(row);
      row.querySelector("input").focus();
      checkDirty("links-form");
    });

    linksList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-link]");
      if (btn) {
        btn.closest(".settings-link-row").remove();
        checkDirty("links-form");
      }
    });
  }

  // -----------------------------------------------------------------------
  // Sections: add / remove / reorder rows
  // -----------------------------------------------------------------------
  var sectionsList = document.getElementById("sections-list");
  var addSectionBtn = document.querySelector("[data-section-add]");
  var sectionNewInput = document.getElementById("section-new-name");

  function refreshSectionPositions() {
    if (!sectionsList) return;
    var rows = sectionsList.querySelectorAll(".settings-section-row");
    for (var i = 0; i < rows.length; i++) {
      var pos = rows[i].querySelector(".settings-section-row__position");
      if (pos) pos.textContent = String(i + 1);
      var upBtn = rows[i].querySelector("[data-section-up]");
      var downBtn = rows[i].querySelector("[data-section-down]");
      if (upBtn) upBtn.disabled = i === 0;
      if (downBtn) downBtn.disabled = i === rows.length - 1;
    }
    checkDirty("sections-form");
  }

  if (sectionsList) {
    sectionsList.addEventListener("click", function (e) {
      var row = e.target.closest(".settings-section-row");
      if (!row) return;

      if (e.target.closest("[data-section-remove]")) {
        row.remove();
        refreshSectionPositions();
        return;
      }

      if (e.target.closest("[data-section-up]")) {
        var prev = row.previousElementSibling;
        if (prev) {
          sectionsList.insertBefore(row, prev);
          refreshSectionPositions();
        }
        return;
      }

      if (e.target.closest("[data-section-down]")) {
        var next = row.nextElementSibling;
        if (next) {
          sectionsList.insertBefore(next, row);
          refreshSectionPositions();
        }
        return;
      }
    });
  }

  if (addSectionBtn && sectionNewInput && sectionsList) {
    addSectionBtn.addEventListener("click", function () {
      var name = sectionNewInput.value.trim();
      if (!name) return;
      var count = sectionsList.querySelectorAll(".settings-section-row").length;
      var row = document.createElement("div");
      row.className = "settings-section-row";
      row.innerHTML =
        '<span class="settings-section-row__position">' + (count + 1) + "</span>" +
        '<input type="text" name="sections" value="' + name.replace(/"/g, "&quot;") +
        '" class="settings-field__input" readonly />' +
        '<div class="settings-section-row__actions">' +
        '<button type="button" class="btn btn--secondary btn--sm" data-section-up>&#9650;</button>' +
        '<button type="button" class="btn btn--secondary btn--sm" data-section-down disabled>&#9660;</button>' +
        '<button type="button" class="btn btn--danger btn--sm" data-section-remove>Remove</button>' +
        "</div>";
      sectionsList.appendChild(row);
      sectionNewInput.value = "";
      refreshSectionPositions();
    });
  }
})();
