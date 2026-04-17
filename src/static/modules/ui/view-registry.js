// View Registry — single source of truth for all view definitions.
//
// Replaces the hardcoded nav arrays and if/else chain in switchView().
// Adding a view = one entry here + one HTML partial file.
//
// Shape:
//   partial     — URL path for the HTML partial (fetched by view-loader)
//   navBtnId    — desktop nav button element ID
//   mobileBtnId — mobile nav button element ID
//   label       — human-readable name (breadcrumb, header)
//   category    — breadcrumb category group
//   bind        — called once after partial HTML is injected (event listeners)
//   load        — called every time the view is activated (data fetching)
//
// bind/load receive the TaskManager instance as their sole argument.

/** @type {Record<string, ViewDef>} */
export const VIEWS = {
  analytics: {
    partial: "/views/analytics",
    navBtnId: "analyticsViewBtn",
    mobileBtnId: "analyticsViewBtnMobile",
    label: "Analytics",
    category: "Overview",
    bind: (tm) => tm.analyticsModule.bindEvents(),
    load: (tm) => tm.analyticsModule.load(),
  },
  milestones: {
    partial: "/views/milestones",
    navBtnId: "milestonesViewBtn",
    mobileBtnId: "milestonesViewBtnMobile",
    label: "Milestones",
    category: "Planning",
    bind: (tm) => {
      tm.milestonesModule.bindEvents();
      tm.milestoneSidenavModule.bindEvents();
    },
    load: (tm) => tm.milestonesModule.load(),
  },
};

/**
 * @typedef {object} ViewDef
 * @property {string} partial
 * @property {string} navBtnId
 * @property {string} mobileBtnId
 * @property {string} label
 * @property {string} category
 * @property {((tm: object) => void)|null} [bind]
 * @property {((tm: object) => void|Promise<void>)|null} [load]
 */
