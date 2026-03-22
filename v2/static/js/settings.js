// Settings page — features check/uncheck, search filter, tag/link management,
// dirty form tracking with snapshot comparison, tab indicator, beforeunload guard.

(function () {
  // -----------------------------------------------------------------------
  // Tab persistence via URL hash
  // -----------------------------------------------------------------------
  var tabRadios = document.querySelectorAll(".settings-tabs__radio");

  function activateTabFromHash() {
    var hash = location.hash.replace("#", "");
    if (!hash) return;
    var radio = document.getElementById("tab-" + hash);
    if (radio) radio.checked = true;
  }

  var activeRadio = null;

  function getCheckedRadio() {
    for (var i = 0; i < tabRadios.length; i++) {
      if (tabRadios[i].checked) return tabRadios[i];
    }
    return tabRadios[0] || null;
  }

  activateTabFromHash();
  activeRadio = getCheckedRadio();

  tabRadios.forEach(function (radio) {
    radio.addEventListener("click", function (e) {
      if (radio === activeRadio) return;
      // Check if any form is dirty
      var dirtyTab = null;
      for (var formId in dirtyForms) {
        if (dirtyForms[formId]) {
          dirtyTab = formId;
          break;
        }
      }
      if (dirtyTab) {
        e.preventDefault();
        if (window.toast) {
          window.toast({
            type: "warning",
            message: "Save or discard changes before switching tabs",
          });
        }
        // Re-check the active radio
        if (activeRadio) activeRadio.checked = true;
        return;
      }
      activeRadio = radio;
      var tabName = radio.id.replace("tab-", "");
      history.replaceState(null, "", "#" + tabName);
    });
  });

  window.addEventListener("hashchange", function () {
    activateTabFromHash();
    activeRadio = getCheckedRadio();
  });

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
    var form = document.getElementById(formId);
    if (form) form.classList.toggle("settings-form--dirty", dirty);
    var anyDirty = Object.keys(dirtyForms).some(function (k) {
      return dirtyForms[k];
    });
    window.onbeforeunload = anyDirty
      ? function () {
        return true;
      }
      : null;
  }

  var tabMap = {
    "features-form": "tab-views",
    "project-form": "tab-project",
    "schedule-form": "tab-schedule",
    "tags-form": "tab-tags",
    "links-form": "tab-links",
    "sections-form": "tab-sections",
    "nav-categories-form": "tab-navigation",
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
    form.addEventListener("submit", function () {
      setDirty(formId, false);
    });
  }

  // Discard — reload page on current tab to reset all state
  document.body.addEventListener("click", function (e) {
    if (!e.target.closest("[data-discard]")) return;
    window.onbeforeunload = null;
    window.location.reload();
  });

  // Re-snapshot on successful save
  document.body.addEventListener("htmx:afterRequest", function (e) {
    var form = e.detail.elt;
    if (!form || !form.id) return;
    if (e.detail.successful) {
      snapshotForm(form.id);
    }
  });

  // Track all settings forms
  [
    "project-form",
    "schedule-form",
    "tags-form",
    "links-form",
    "sections-form",
    "nav-categories-form",
  ].forEach(trackForm);

  // -----------------------------------------------------------------------
  // Features: check all / uncheck all
  // -----------------------------------------------------------------------
  var featuresForm = document.getElementById("features-form");
  var search = document.getElementById("features-search");

  var enabledDetails = document.getElementById("features-enabled");
  var disabledDetails = document.getElementById("features-disabled");
  var enabledList = enabledDetails
    ? enabledDetails.querySelector(".settings-page__feature-list")
    : null;
  var disabledList = disabledDetails
    ? disabledDetails.querySelector(".settings-page__feature-list")
    : null;

  function updateSectionCounts() {
    if (enabledDetails) {
      var ec = enabledDetails.querySelector(".settings-collapse__count");
      if (ec) ec.textContent = String(enabledList.children.length);
    }
    if (disabledDetails) {
      var dc = disabledDetails.querySelector(".settings-collapse__count");
      if (dc) dc.textContent = String(disabledList.children.length);
    }
  }

  if (featuresForm && enabledList && disabledList) {
    featuresForm.addEventListener("change", function (e) {
      var cb = e.target.closest('input[name="features"]');
      if (!cb) return;
      var item = cb.closest(".settings-page__feature-item");
      if (!item) return;
      var targetList = cb.checked ? enabledList : disabledList;
      targetList.appendChild(item);
      updateSectionCounts();
    });
  }

  if (featuresForm) {
    function toggleAll(checked) {
      featuresForm.querySelectorAll('input[name="features"]').forEach(
        function (cb) {
          cb.checked = checked;
          var item = cb.closest(".settings-page__feature-item");
          if (item) {
            var targetList = checked ? enabledList : disabledList;
            if (targetList) targetList.appendChild(item);
          }
        },
      );
      updateSectionCounts();
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
  // Features: search filter with count + auto-open collapsibles
  // -----------------------------------------------------------------------
  var featuresCount = document.getElementById("features-count");
  var collapseStates = {};

  if (search && featuresForm) {
    search.addEventListener("input", function () {
      var query = search.value.toLowerCase().trim();
      var items = featuresForm.querySelectorAll(".settings-page__feature-item");
      var total = items.length;
      var visible = 0;

      items.forEach(function (item) {
        var label = item.querySelector(".settings-page__feature-label");
        var text = label ? label.textContent.toLowerCase() : "";
        var hidden = query !== "" && text.indexOf(query) === -1;
        item.classList.toggle("is-hidden", hidden);
        if (!hidden) visible++;
      });

      // Update count
      if (featuresCount) {
        featuresCount.textContent = query
          ? visible + "/" + total
          : total + " total";
      }

      // Update collapsible header counts
      var collapses = featuresForm.querySelectorAll(".settings-collapse");
      collapses.forEach(function (el) {
        var countSpan = el.querySelector(".settings-collapse__count");
        if (countSpan) {
          var visibleInSection = el.querySelectorAll(
            ".settings-page__feature-item:not(.is-hidden)",
          ).length;
          var totalInSection = el.querySelectorAll(
            ".settings-page__feature-item",
          ).length;
          countSpan.textContent = query
            ? visibleInSection + "/" + totalInSection
            : String(totalInSection);
        }
      });

      // Auto-open/restore collapsibles
      if (query) {
        collapses.forEach(function (el) {
          if (!(el.id in collapseStates)) {
            collapseStates[el.id || collapses.length] = el.open;
          }
          el.open = true;
        });
      } else {
        collapses.forEach(function (el) {
          var key = el.id || collapses.length;
          if (key in collapseStates) {
            el.open = collapseStates[key];
          }
        });
        collapseStates = {};
      }
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
    sectionNewInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addSectionBtn.click();
      }
    });

    addSectionBtn.addEventListener("click", function () {
      var name = sectionNewInput.value.trim();
      if (!name) return;
      var count = sectionsList.querySelectorAll(".settings-section-row").length;
      var row = document.createElement("div");
      row.className = "settings-section-row";
      row.innerHTML = '<span class="settings-section-row__position">' +
        (count + 1) + "</span>" +
        '<input type="text" name="sections" value="' +
        name.replace(/"/g, "&quot;") +
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

  // -----------------------------------------------------------------------
  // Navigation: add new category to all select dropdowns
  // -----------------------------------------------------------------------
  var addCatBtn = document.querySelector("[data-add-category]");
  var catNewInput = document.getElementById("nav-category-new-name");
  var navForm = document.getElementById("nav-categories-form");

  // Expand / collapse all nav categories
  var navCatsList = document.getElementById("nav-categories-list");
  var expandAllBtn = document.querySelector("[data-nav-expand-all]");
  var collapseAllBtn = document.querySelector("[data-nav-collapse-all]");

  if (navCatsList && expandAllBtn) {
    expandAllBtn.addEventListener("click", function () {
      navCatsList.querySelectorAll("details").forEach(function (d) {
        d.open = true;
      });
    });
  }
  if (navCatsList && collapseAllBtn) {
    collapseAllBtn.addEventListener("click", function () {
      navCatsList.querySelectorAll("details").forEach(function (d) {
        d.open = false;
      });
    });
  }

  // Jump nav — open details and scroll
  var jumpBar = document.querySelector("[data-nav-jump]");
  if (jumpBar) {
    jumpBar.addEventListener("click", function (e) {
      var pill = e.target.closest("[data-nav-target]");
      if (!pill) return;
      e.preventDefault();
      var target = document.getElementById(
        pill.getAttribute("data-nav-target"),
      );
      if (target) {
        target.open = true;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (addCatBtn && catNewInput && navForm) {
    catNewInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addCatBtn.click();
      }
    });

    addCatBtn.addEventListener("click", function () {
      var name = catNewInput.value.trim();
      if (!name) return;
      navForm.querySelectorAll(".settings-nav__feature-row select").forEach(
        function (sel) {
          // Skip if option already exists
          for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === name) return;
          }
          var opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          sel.appendChild(opt);
        },
      );
      catNewInput.value = "";
      checkDirty("nav-categories-form");
      if (window.toast) {
        window.toast({
          type: "success",
          message: 'Category "' + name + '" added — assign features and save',
        });
      }
    });
  }

  // -- Clear input buttons (data-clear-input="<input-id>") --
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-clear-input]");
    if (!btn) return;
    var inputId = btn.getAttribute("data-clear-input");
    var input = document.getElementById(inputId);
    if (!input) return;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    var form = input.closest("form");
    if (form && form.id) checkDirty(form.id);
  });
})();
