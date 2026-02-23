/* OllamaModule — thin wrapper that registers the Ollama chat view in mdplanner.
 *
 * Design pattern: Facade / Adapter
 * Bridges mdplanner's view lifecycle (load/init) to the self-contained
 * ollamaui module that lives in modules/features/ollamaui/ and runs via
 * the global window.App namespace.
 *
 * No mdplanner internals are exposed to ollamaui. The only connection is
 * this module calling window.App.init() on first activation.
 */
export class OllamaModule {
  constructor(_taskManager) {
    this.initialized = false;
  }

  load() {
    if (!this.initialized) {
      window.App.init();
      this.initialized = true;
    }
  }
}
