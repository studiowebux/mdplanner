import type { FC } from "hono/jsx";
import type { Goal } from "../../types/goal.types.ts";
import { PRIORITY_LABELS } from "../../constants/mod.ts";

type GoalNode = Goal & { children: GoalNode[] };

/** Build a tree from a flat list using parentGoal field. */
export function buildGoalTree(goals: Goal[]): GoalNode[] {
  const byId = new Map<string, GoalNode>();
  for (const g of goals) {
    byId.set(g.id, { ...g, children: [] });
  }

  const roots: GoalNode[] = [];
  for (const node of byId.values()) {
    if (node.parentGoal && byId.has(node.parentGoal)) {
      const parent = byId.get(node.parentGoal);
      if (parent) parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Group root nodes by project, preserving order within each group. */
function groupByProject(
  roots: GoalNode[],
): { project: string; goals: GoalNode[] }[] {
  const map = new Map<string, GoalNode[]>();
  for (const node of roots) {
    const key = node.project || "";
    const arr = map.get(key) ?? [];
    arr.push(node);
    map.set(key, arr);
  }
  const groups: { project: string; goals: GoalNode[] }[] = [];
  for (const [project, goals] of map) {
    groups.push({ project, goals });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Tree node — recursive
// ---------------------------------------------------------------------------

const GoalTreeNode: FC<{ node: GoalNode; depth: number }> = (
  { node, depth },
) => {
  const isRoot = depth === 0;
  return (
    <li class={`goal-tree__item${isRoot ? " goal-tree__item--root" : ""}`}>
      <div class="goal-tree__node">
        <a
          href={`/goals/${node.id}`}
          class={`goal-tree__title${isRoot ? " goal-tree__title--root" : ""}`}
        >
          {node.title}
        </a>
        <span class={`badge goal-status goal-status--${node.status}`}>
          {node.status}
        </span>
        <span class={`badge goal-badge goal-badge--${node.type}`}>
          {node.type}
        </span>
        {node.priority && (
          <span class={`badge priority--${node.priority}`}>
            {PRIORITY_LABELS[String(node.priority)] ?? `P${node.priority}`}
          </span>
        )}
        {node.progress != null && (
          <span class="goal-tree__progress">
            <progress class="progress-bar" value={node.progress} max={100} />
            {node.progress}%
          </span>
        )}
        {node.owner && <span class="goal-tree__owner">{node.owner}</span>}
      </div>
      {node.children.length > 0 && (
        <ul class="goal-tree__children">
          {node.children.map((child) => (
            <GoalTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

// ---------------------------------------------------------------------------
// Main tree view
// ---------------------------------------------------------------------------

export const GoalTree: FC<{ goals: Goal[] }> = ({ goals }) => {
  const tree = buildGoalTree(goals);

  if (tree.length === 0) {
    return <p class="empty-state">No goals to display.</p>;
  }

  const groups = groupByProject(tree);
  const hasMultipleGroups = groups.length > 1 ||
    (groups.length === 1 && groups[0].project !== "");

  if (!hasMultipleGroups) {
    return (
      <ul class="goal-tree">
        {tree.map((node) => (
          <GoalTreeNode key={node.id} node={node} depth={0} />
        ))}
      </ul>
    );
  }

  const toSlug = (s: string) =>
    (s || "ungrouped").toLowerCase().replace(/\s+/g, "-");

  return (
    <div class="goal-tree-groups">
      <nav class="goal-tree-groups__nav" aria-label="Jump to project">
        {groups.map(({ project }) => (
          <a
            key={project}
            class="btn btn--secondary btn--sm"
            href={`#goal-group-${toSlug(project)}`}
          >
            {project || "Ungrouped"}
          </a>
        ))}
      </nav>
      {groups.map(({ project, goals: nodes }) => (
        <section
          key={project}
          id={`goal-group-${toSlug(project)}`}
          class="goal-tree-group"
        >
          <h3 class="goal-tree-group__heading">
            {project || "Ungrouped"}
          </h3>
          <ul class="goal-tree">
            {nodes.map((node) => (
              <GoalTreeNode key={node.id} node={node} depth={0} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
