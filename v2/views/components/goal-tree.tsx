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
      byId.get(node.parentGoal)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const GoalTreeNode: FC<{ node: GoalNode }> = ({ node }) => (
  <li class="goal-tree__item">
    <div class="goal-tree__node">
      <a href={`/goals/${node.id}`} class="goal-tree__title">
        {node.title}
      </a>
      <span class={`badge goal-status goal-status--${node.status}`}>
        {node.status}
      </span>
      {node.priority && (
        <span class={`badge priority--${node.priority}`}>
          {PRIORITY_LABELS[String(node.priority)] ?? `P${node.priority}`}
        </span>
      )}
      {node.progress !== undefined && (
        <span class="goal-tree__progress">
          <progress class="progress-bar" value={node.progress} max={100} />
          {node.progress}%
        </span>
      )}
      {node.owner && <span class="goal-tree__owner">{node.owner}</span>}
    </div>
    {node.children.length > 0 && (
      <ul class="goal-tree__children">
        {node.children.map((child) => <GoalTreeNode node={child} />)}
      </ul>
    )}
  </li>
);

export const GoalTree: FC<{ goals: Goal[] }> = ({ goals }) => {
  const tree = buildGoalTree(goals);

  if (tree.length === 0) {
    return <p class="empty-state">No goals to display.</p>;
  }

  return (
    <ul class="goal-tree">
      {tree.map((node) => <GoalTreeNode node={node} />)}
    </ul>
  );
};
