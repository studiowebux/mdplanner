/* OllamaModule — thin wrapper that registers the Ollama chat view in mdplanner.
 *
 * Design pattern: Facade / Adapter
 * Bridges mdplanner's view lifecycle (load/init) to the self-contained
 * ollamaui module that lives in modules/features/ollamaui/ and runs as
 * ES modules with a shared App namespace.
 */

import { init } from "./ollamaui/index.js";

export class OllamaModule {
  constructor(_taskManager) {
    this.initialized = false;
  }

  load() {
    if (!this.initialized) {
      init();
      this.initialized = true;
    }
  }
}
