/* index.js — ollamaui ES module entry point
 *
 * Imports all sub-modules (which attach their functions to App) and
 * exports a single init() that wires up listeners and bootstraps the UI.
 */

import { App, initThemeLabel } from "./state.js";
import "./markdown.js";
import { initMessageListeners } from "./messages.js";
import { initConfigListeners } from "./config.js";
import "./chat.js";
import { initActionListeners } from "./actions.js";
import { initInputListeners, initKeyboardShortcuts } from "./input.js";

export function init() {
  /* Expose App globally for inline onclick handlers in index.html */
  window.App = App;

  initThemeLabel();
  initMessageListeners();
  initConfigListeners();
  initActionListeners();
  initInputListeners();
  initKeyboardShortcuts();

  App.populateConfigUI();
  App.loadHistory();
  App.renderHistory();
  App.renderBranchNav();
  App.loadModels();
  App.checkConnection();
}
