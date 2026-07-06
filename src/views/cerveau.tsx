// Cerveau viewer — read-only SSR view over a configured Cerveau root. Layout:
// a left sidebar (version + brains list + Registry/Files entries) and a detail
// panel. All interactions are declarative htmx: sidebar entries hx-get a
// fragment into #cerveau-detail (no fetch, no custom JS). The per-brain detail
// shows the brain's referenced packages (resolved against the registry) + Brain
// Memory — the v1 stacks/practices/workflows/agents taxonomy no longer exists.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import type { ViewProps } from "../types/app.ts";
import type {
  CerveauBrain,
  CerveauPackage,
  CerveauProtocolOverview,
} from "../types/cerveau.types.ts";

const CERVEAU_STYLES = ["/css/views/cerveau.css"];

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const Sidebar: FC<{ version: string | null; brains: CerveauBrain[] }> = ({
  version,
  brains,
}) => (
  <aside class="cerveau-sidebar">
    {version && <div class="cerveau-version">Cerveau {version}</div>}
    <div class="cerveau-sidebar-section">Brains</div>
    <div class="cerveau-sidebar-list">
      {brains.map((b) => (
        <button
          key={b.name}
          type="button"
          class="cerveau-sidebar-item"
          hx-get={`/cerveau/brain/${encodeURIComponent(b.name)}`}
          hx-target="#cerveau-detail"
          hx-swap="innerHTML"
        >
          <span class="cerveau-sidebar-name">{b.name}</span>
          <span class="cerveau-sidebar-count">{b.packages.length}</span>
        </button>
      ))}
    </div>
    <div class="cerveau-sidebar-section">Catalog</div>
    <div class="cerveau-sidebar-list">
      <button
        type="button"
        class="cerveau-sidebar-item"
        hx-get="/cerveau/registry"
        hx-target="#cerveau-detail"
        hx-swap="innerHTML"
      >
        <span class="cerveau-sidebar-name">Registry</span>
      </button>
      <button
        type="button"
        class="cerveau-sidebar-item"
        hx-get="/cerveau/files"
        hx-target="#cerveau-detail"
        hx-swap="innerHTML"
      >
        <span class="cerveau-sidebar-name">Files</span>
      </button>
    </div>
  </aside>
);

// ---------------------------------------------------------------------------
// Detail fragments (each rendered standalone into #cerveau-detail)
// ---------------------------------------------------------------------------

/** A brain's referenced packages, resolved against the registry, + Brain Memory. */
export const BrainDetail: FC<{
  brain: CerveauBrain;
  resolved: { ref: string; matches: CerveauPackage[] }[];
  memory: string;
}> = ({ brain, resolved, memory }) => (
  <div class="cerveau-panel">
    <h2 class="cerveau-panel-title">{brain.name}</h2>
    <div class="cerveau-props">
      <div class="cerveau-prop">
        <span class="cerveau-prop-label">Path</span>
        <span class="cerveau-prop-value">{brain.path}</span>
      </div>
      <div class="cerveau-prop">
        <span class="cerveau-prop-label">Codebase</span>
        <span class="cerveau-prop-value">{brain.codebase}</span>
      </div>
    </div>

    <div class="cerveau-card-header">Packages ({brain.packages.length})</div>
    <div class="cerveau-cards">
      {resolved.map(({ ref, matches }) => (
        <div key={ref} class="cerveau-card">
          <div class="cerveau-card-title">{ref}</div>
          {matches.length === 0
            ? <div class="cerveau-tag-none">Not found in registry</div>
            : (
              <ul class="cerveau-pkg-versions">
                {matches.map((p) => (
                  <li key={p.version} class="cerveau-pkg-version">
                    <span class="cerveau-pkg-ver">@{p.version}</span>
                    <span class="cerveau-pkg-desc">{p.description}</span>
                    <span class="cerveau-pkg-files">
                      {p.files.length} files
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      ))}
    </div>

    <div class="cerveau-card-header">Brain Memory</div>
    {memory
      ? <pre class="cerveau-memory">{memory}</pre>
      : <div class="cerveau-tag-none">No Brain Memory recorded</div>}
  </div>
);

/** Registry overview — every package + the protocol file-type breakdown. */
export const RegistryDetail: FC<{
  packages: CerveauPackage[];
  protocol: CerveauProtocolOverview;
}> = ({ packages, protocol }) => (
  <div class="cerveau-panel">
    <h2 class="cerveau-panel-title">Registry</h2>

    <div class="cerveau-card-header">Protocol items by type</div>
    <div class="cerveau-cards">
      {Object.keys(protocol).sort().map((type) => (
        <div key={type} class="cerveau-card">
          <div class="cerveau-card-title">{type} ({protocol[type].length})</div>
          <div class="cerveau-tags">
            {protocol[type].map((n) => (
              <span key={n} class="cerveau-tag">{n}</span>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div class="cerveau-card-header">Packages ({packages.length})</div>
    <div class="cerveau-cards">
      {packages.map((p) => (
        <div key={`${p.org}/${p.name}@${p.version}`} class="cerveau-card">
          <div class="cerveau-card-title">
            {p.org}/{p.name} <span class="cerveau-pkg-ver">@{p.version}</span>
          </div>
          <div class="cerveau-pkg-desc">{p.description}</div>
          <div class="cerveau-tags">
            {p.tags.map((t) => <span key={t} class="cerveau-tag">{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** A directory listing fragment — folders hx-get deeper, files hx-get content. */
export const FilesDetail: FC<{
  path: string;
  parent: string | null;
  entries: { name: string; path: string; isDir: boolean; size?: number }[];
}> = ({ path, parent, entries }) => (
  <div class="cerveau-panel">
    <h2 class="cerveau-panel-title">Files</h2>
    <div class="cerveau-breadcrumb">/{path}</div>
    <div class="cerveau-filelist">
      {parent !== null && (
        <button
          type="button"
          class="cerveau-filerow cerveau-filerow--dir"
          hx-get={`/cerveau/files?path=${encodeURIComponent(parent)}`}
          hx-target="#cerveau-detail"
          hx-swap="innerHTML"
        >
          <span class="cerveau-file-icon">↩</span>
          <span class="cerveau-file-name">..</span>
        </button>
      )}
      {entries.map((e) => (
        <button
          key={e.path}
          type="button"
          class={`cerveau-filerow ${
            e.isDir ? "cerveau-filerow--dir" : "cerveau-filerow--file"
          }`}
          hx-get={`/cerveau/${e.isDir ? "files" : "file"}?path=${
            encodeURIComponent(e.path)
          }`}
          hx-target={e.isDir ? "#cerveau-detail" : "#cerveau-file-viewer"}
          hx-swap="innerHTML"
        >
          <span class="cerveau-file-icon">{e.isDir ? "▸" : "·"}</span>
          <span class="cerveau-file-name">{e.name}</span>
          {!e.isDir && e.size !== undefined && (
            <span class="cerveau-file-size">{e.size} B</span>
          )}
        </button>
      ))}
    </div>
    <div id="cerveau-file-viewer" class="cerveau-file-viewer"></div>
  </div>
);

/** Read-only file content. */
export const FileContent: FC<{ path: string; content: string }> = ({
  path,
  content,
}) => (
  <div class="cerveau-file-content">
    <div class="cerveau-file-content-head">{path}</div>
    <pre class="cerveau-file-pre">{content}</pre>
  </div>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type CerveauProps = ViewProps & {
  configured: boolean;
  version: string | null;
  brains: CerveauBrain[];
};

export const CerveauView: FC<CerveauProps> = (
  { configured, version, brains, ...viewProps },
) => (
  <MainLayout {...viewProps} title="Cerveau" styles={CERVEAU_STYLES}>
    {configured
      ? (
        <div class="cerveau">
          <Sidebar version={version} brains={brains} />
          <div id="cerveau-detail" class="cerveau-detail">
            <EmptyState message="Select a brain or the registry to inspect it." />
          </div>
        </div>
      )
      : (
        <div class="cerveau cerveau--unconfigured">
          <EmptyState message="The Cerveau viewer is not configured. Set a Cerveau directory in Settings → Project to enable it." />
        </div>
      )}
  </MainLayout>
);
