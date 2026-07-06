// C4 Architecture canvas — SSR component.
// Boxes positioned via data-x/data-y + CSSOM (c4-canvas.js sets CSS vars).
// SVG arrows rendered server-side, updated live by JS after drag/pan/zoom.
// Edit mode toggled by html.c4-edit-mode class (JS).

import type { FC } from "hono/jsx";
import type { C4Component } from "../../types/c4.types.ts";
import { C4_LEVEL_LABELS } from "../../domains/c4/constants.tsx";
import { EmptyState } from "../../components/ui/empty-state.tsx";
import { Sidenav } from "../../components/ui/sidenav.tsx";

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

type BreadcrumbEntry = { label: string; href?: string };

type BreadcrumbProps = { entries: BreadcrumbEntry[] };

const C4Breadcrumb: FC<BreadcrumbProps> = ({ entries }) => (
  <nav class="c4-breadcrumb" aria-label="C4 level navigation">
    {entries.map((entry, i) => (
      <span key={entry.label}>
        {i > 0 && <span class="c4-breadcrumb__sep" aria-hidden="true">›</span>}
        {entry.href
          ? <a href={entry.href} class="c4-breadcrumb__link">{entry.label}</a>
          : <span class="c4-breadcrumb__current">{entry.label}</span>}
      </span>
    ))}
  </nav>
);

// ---------------------------------------------------------------------------
// Component box
// ---------------------------------------------------------------------------

type BoxProps = { component: C4Component };

const C4Box: FC<BoxProps> = ({ component }) => (
  <div
    class="c4-box"
    data-id={component.id}
    data-x={component.position.x}
    data-y={component.position.y}
    data-type={component.type.toLowerCase().replace(/\s+/g, "_")}
    data-level={component.level}
    data-connections={(component.connections ?? []).map((c) => c.target).join(
      ",",
    )}
  >
    {/* Port dots — visible in edit mode only (CSS: html.c4-edit-mode .c4-port) */}
    <div class="c4-port c4-port--top" data-port="top" />
    <div class="c4-port c4-port--right" data-port="right" />
    <div class="c4-port c4-port--bottom" data-port="bottom" />
    <div class="c4-port c4-port--left" data-port="left" />

    <div class="c4-box__inner">
      <span class="c4-type-badge">{component.type}</span>
      <div class="c4-box__name">
        <button
          type="button"
          class="c4-box__open-btn"
          data-sidenav-open="c4-detail-panel"
          hx-get={`/c4/${component.id}/panel`}
          hx-target="#c4-detail-panel .sidenav__body"
          hx-swap="innerHTML"
        >
          {component.name}
        </button>
      </div>
      {component.technology && (
        <div class="c4-box__tech">[{component.technology}]</div>
      )}
      {component.description && (
        <div class="c4-box__desc">{component.description}</div>
      )}
    </div>

    {/* Drill-down link for components that have children */}
    {component.children && component.children.length > 0 && (
      <a
        class="c4-box__drill"
        href={`/c4?level=${_nextLevel(component.level)}&parent=${component.id}`}
        title="Drill into this component"
        aria-label={`Open ${component.name} sub-diagram`}
      >
        ↳
      </a>
    )}
  </div>
);

function _nextLevel(level: string): string {
  const map: Record<string, string> = {
    context: "container",
    container: "component",
    component: "code",
  };
  return map[level] ?? "component";
}

// ---------------------------------------------------------------------------
// SVG connection arrows
// ---------------------------------------------------------------------------

type ArrowsProps = {
  components: C4Component[];
  ids: Set<string>;
};

// Box dimensions must match CSS vars --c4-box-w / --c4-box-h (224px / 128px).
// JS will recompute after drag; this gives a correct initial render.
const BOX_W = 224;
const BOX_H = 128;

const C4Arrows: FC<ArrowsProps> = ({ components, ids }) => {
  const arrows: {
    id: string;
    src: string;
    tgt: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label?: string;
    tech?: string;
  }[] = [];

  for (const comp of components) {
    for (const conn of comp.connections ?? []) {
      if (!ids.has(conn.target)) continue;
      const target = components.find((c) => c.id === conn.target);
      if (!target) continue;

      arrows.push({
        id: conn.id,
        src: comp.id,
        tgt: conn.target,
        x1: comp.position.x + BOX_W / 2,
        y1: comp.position.y + BOX_H / 2,
        x2: target.position.x + BOX_W / 2,
        y2: target.position.y + BOX_H / 2,
        label: conn.label,
        tech: conn.technology ?? undefined,
      });
    }
  }

  if (arrows.length === 0) return null;

  return (
    <svg
      class="c4-connections"
      id="c4Connections"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="c4-arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" class="c4-arrowhead" />
        </marker>
      </defs>
      {arrows.map((a) => (
        <g
          key={a.id}
          class="c4-arrow"
          data-conn-id={a.id}
          data-src={a.src}
          data-tgt={a.tgt}
        >
          <line
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            marker-end="url(#c4-arrowhead)"
          />
          {a.label && (
            <text
              x={(a.x1 + a.x2) / 2}
              y={(a.y1 + a.y2) / 2 - 6}
              class="c4-arrow__label"
              text-anchor="middle"
            >
              {a.label}
              {a.tech && (
                <tspan class="c4-arrow__tech" dx="0" dy="14">
                  [{a.tech}]
                </tspan>
              )}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

type C4ToolbarProps = { editMode: boolean; diagram: string };

const C4Toolbar: FC<C4ToolbarProps> = ({ editMode, diagram }) => (
  <div class="c4-toolbar" role="toolbar" aria-label="Canvas controls">
    <button
      id="c4ToggleEdit"
      class={`btn btn--sm c4-toolbar__btn${editMode ? " is-active" : ""}`}
      type="button"
      title={editMode ? "Switch to view mode" : "Switch to edit mode"}
      aria-pressed={editMode ? "true" : "false"}
    >
      {editMode ? "View" : "Edit"}
    </button>
    <button
      id="c4ZoomIn"
      class="btn btn--sm c4-toolbar__btn"
      type="button"
      title="Zoom in"
    >
      +
    </button>
    <button
      id="c4ZoomOut"
      class="btn btn--sm c4-toolbar__btn"
      type="button"
      title="Zoom out"
    >
      −
    </button>
    <button
      id="c4FitScreen"
      class="btn btn--sm c4-toolbar__btn"
      type="button"
      title="Fit to screen"
    >
      ⤢
    </button>
    <span class="c4-toolbar__sep" aria-hidden="true" />
    <span class="c4-toolbar__diagram-label">Diagram:</span>
    <span class="c4-toolbar__diagram-current">{diagram}</span>
    <button
      id="c4NewDiagram"
      class="btn btn--sm c4-toolbar__btn"
      type="button"
      title="Switch to a different diagram or create a new one"
    >
      Switch
    </button>
    <input
      id="c4NewDiagramInput"
      class="c4-toolbar__diagram-input is-hidden"
      type="text"
      placeholder="Diagram name…"
      aria-label="Diagram name"
      maxlength={64}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Minimap
// ---------------------------------------------------------------------------

const C4Minimap: FC = () => (
  <div class="c4-minimap" id="c4Minimap" aria-hidden="true">
    <canvas id="c4MinimapCanvas" />
  </div>
);

// ---------------------------------------------------------------------------
// Main canvas
// ---------------------------------------------------------------------------

export type C4CanvasProps = {
  components: C4Component[];
  diagram: string;
  level: string;
  parentId?: string;
  parentName?: string;
  editMode: boolean;
};

const LEVEL_ORDER = ["context", "container", "component", "code"];

function buildC4Breadcrumb(
  level: string,
  parentId: string | undefined,
  parentName: string | undefined,
  diagramParam: string,
): BreadcrumbEntry[] {
  const breadcrumb: BreadcrumbEntry[] = [
    { label: "All", href: `/c4?view=canvas${diagramParam}` },
  ];
  if (parentId && parentName) {
    const currentIdx = LEVEL_ORDER.indexOf(level);
    for (let i = 0; i < currentIdx - 1; i++) {
      const l = LEVEL_ORDER[i];
      breadcrumb.push({
        label: C4_LEVEL_LABELS[l] ?? l,
        href: `/c4?view=canvas&level=${l}${diagramParam}`,
      });
    }
    const parentLevel = LEVEL_ORDER[currentIdx - 1];
    if (parentLevel) {
      breadcrumb.push({
        label: C4_LEVEL_LABELS[parentLevel] ?? parentLevel,
        href: `/c4?view=canvas&level=${parentLevel}${diagramParam}`,
      });
    }
    breadcrumb.push({ label: parentName });
  } else if (level === "context") {
    breadcrumb.push({ label: C4_LEVEL_LABELS["context"] ?? "Context" });
  } else {
    const currentIdx = LEVEL_ORDER.indexOf(level);
    for (let i = 0; i < currentIdx; i++) {
      const l = LEVEL_ORDER[i];
      breadcrumb.push({
        label: C4_LEVEL_LABELS[l] ?? l,
        href: `/c4?view=canvas&level=${l}${diagramParam}`,
      });
    }
    breadcrumb.push({ label: C4_LEVEL_LABELS[level] ?? level });
  }
  return breadcrumb;
}

export const C4Canvas: FC<C4CanvasProps> = ({
  components,
  diagram,
  level,
  parentId,
  parentName,
  editMode,
}) => {
  const ids = new Set(components.map((c) => c.id));

  // "All" always links to /c4 (no level = show all components).
  // Current level is always the trailing no-href entry so "All" is never non-clickable.
  const diagramParam = diagram !== "default"
    ? `&diagram=${encodeURIComponent(diagram)}`
    : "";
  const breadcrumb = buildC4Breadcrumb(
    level,
    parentId,
    parentName,
    diagramParam,
  );

  return (
    <div
      class={`c4-canvas-root${editMode ? " c4-edit-mode" : ""}`}
      id="c4Root"
      data-diagram={diagram}
    >
      <C4Breadcrumb entries={breadcrumb} />

      <C4Toolbar editMode={editMode} diagram={diagram} />

      <div class="c4-canvas-wrapper" id="c4Wrapper">
        <div class="c4-canvas" id="c4Canvas" data-loading>
          {components.length === 0
            ? (
              <EmptyState message="No components in this diagram. Switch to edit mode to add components." />
            )
            : (
              <>
                <C4Arrows components={components} ids={ids} />
                {components.map((comp) => (
                  <C4Box key={comp.id} component={comp} />
                ))}
              </>
            )}
        </div>
      </div>

      <C4Minimap />

      <Sidenav id="c4-detail-panel" title="Component">
        <div class="sidenav__placeholder">
          Select a component to view details.
        </div>
      </Sidenav>

      {/* SSE listener on separate div outside main to avoid htmx inheritance */}
      <div
        hx-ext="sse"
        sse-connect="/sse"
        hx-trigger="sse:c4.created, sse:c4.updated, sse:c4.deleted"
        hx-get={`/c4?diagram=${diagram}&level=${level}${
          parentId ? `&parent=${parentId}` : ""
        }&_partial=canvas`}
        hx-target="#c4Canvas"
        hx-swap="outerHTML"
      />
    </div>
  );
};
