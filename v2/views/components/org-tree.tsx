// Org chart tree — renders PersonWithChildren[] as a canvas-style hierarchical
// tree with CSS connector lines between parent and child nodes.
// Nodes are draggable for hierarchy reordering (handled by org-tree.js).

import type { FC } from "hono/jsx";
import type { PersonWithChildren } from "../../types/person.types.ts";
import { collectFieldValues } from "../../utils/tree.ts";

// ---------------------------------------------------------------------------
// Tree node
// ---------------------------------------------------------------------------

type NodeProps = {
  node: PersonWithChildren;
  level: number;
  allDepts: string[];
};

const OrgNode: FC<NodeProps> = ({ node, level, allDepts }) => {
  const initials = node.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const deptIdx = allDepts.indexOf(node.departments?.[0] ?? "");
  const deptText = node.departments?.join(", ") ?? "";
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div class="orgchart-node-wrapper">
      <div
        class={`orgchart-node level-${level}`}
        data-member-id={node.id}
        draggable="true"
      >
        <div
          class={`orgchart-node-header orgchart-dept-${
            deptIdx >= 0 ? deptIdx : "none"
          }`}
        >
          <div
            class="orgchart-drag-handle"
            title="Drag to change reporting structure"
          >
            &#8942;&#8942;
          </div>
          <div class="orgchart-node-identity">
            <span
              class={`person-card__avatar person-card__avatar--${
                node.agentType ?? "human"
              }`}
            >
              {initials}
            </span>
            <div>
              <div class="orgchart-node-name">
                <a href={`/people/${node.id}`}>{node.name}</a>
              </div>
              <div class="orgchart-node-title">
                {node.title || node.role || ""}
              </div>
            </div>
          </div>
          {node.agentType && (
            <span
              class={`person-card__badge person-card__badge--${node.agentType}`}
            >
              {node.agentType}
            </span>
          )}
          {deptText && <div class="orgchart-node-dept">{deptText}</div>}
        </div>
      </div>
      {hasChildren && (
        <div class="orgchart-children">
          {node.children!.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              level={level + 1}
              allDepts={allDepts}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tree root
// ---------------------------------------------------------------------------

type Props = {
  tree: PersonWithChildren[];
};

export const OrgTree: FC<Props> = ({ tree }) => {
  if (tree.length === 0) {
    return (
      <div class="orgchart-empty">
        No reporting structure defined. Set the "Reports To" field on people to
        build the org chart.
      </div>
    );
  }

  const allDepts = collectFieldValues(tree, (n) => n.departments ?? []);

  return (
    <div id="orgchartContainer" class="orgchart-container">
      <div class="orgchart-controls">
        <button
          id="orgchartFit"
          class="btn btn--secondary btn--sm"
          type="button"
        >
          Fit
        </button>
        <input
          id="orgchartZoom"
          class="orgchart-controls__slider"
          type="range"
          min="0.25"
          max="2"
          step="0.05"
          value="1"
        />
        <span id="orgchartZoomLabel" class="orgchart-controls__label">
          100%
        </span>
        <span class="orgchart-controls__sep"></span>
        <button
          id="orgchartExportSVG"
          class="btn btn--secondary btn--sm"
          type="button"
        >
          Export SVG
        </button>
        <button
          id="orgchartExportPDF"
          class="btn btn--secondary btn--sm"
          type="button"
        >
          Print
        </button>
      </div>
      <div id="orgchartViewport" class="orgchart-viewport">
        <div class="orgchart-tree">
          {tree.map((root) => (
            <OrgNode
              key={root.id}
              node={root}
              level={0}
              allDepts={allDepts}
            />
          ))}
        </div>
      </div>
      <div id="orgchartUnlinkZone" class="orgchart-unlink-zone">
        Drop here to remove manager
      </div>
    </div>
  );
};
