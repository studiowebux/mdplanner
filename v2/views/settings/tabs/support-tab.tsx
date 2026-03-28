import type { FC } from "hono/jsx";
import { APP_VERSION } from "../../../constants/mod.ts";

export const SupportTab: FC = () => (
  <div class="settings-tabs__panel settings-tabs__panel--support">
    <section class="settings-support">
      <h2 class="settings-support__heading">MDPlanner</h2>
      <p class="settings-support__version">
        Version {APP_VERSION}
      </p>

      <h3 class="settings-support__subheading">Funding</h3>
      <ul class="settings-support__links">
        <li>
          <a
            href="https://buymeacoffee.com/studiowebux"
            target="_blank"
            rel="noopener"
          >
            Buy Me a Coffee
          </a>
        </li>
        <li>
          <a
            href="https://github.com/sponsors/studiowebux"
            target="_blank"
            rel="noopener"
          >
            GitHub Sponsors
          </a>
        </li>
        <li>
          <a
            href="https://patreon.com/studiowebux"
            target="_blank"
            rel="noopener"
          >
            Patreon
          </a>
        </li>
      </ul>

      <h3 class="settings-support__subheading">Support</h3>
      <ul class="settings-support__links">
        <li>
          <a
            href="https://github.com/studiowebux/mdplanner/issues"
            target="_blank"
            rel="noopener"
          >
            Bug Tracker (GitHub Issues)
          </a>
        </li>
        <li>
          <a
            href="https://discord.gg/BG5Erm9fNv"
            target="_blank"
            rel="noopener"
          >
            Discord
          </a>
        </li>
      </ul>

      <h3 class="settings-support__subheading">Contact</h3>
      <ul class="settings-support__links">
        <li>
          <a
            href="https://studiowebux.com"
            target="_blank"
            rel="noopener"
          >
            Studio Webux
          </a>
        </li>
      </ul>

      <p class="settings-support__license">
        Licensed under MIT
      </p>
    </section>
  </div>
);
