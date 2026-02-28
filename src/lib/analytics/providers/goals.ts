/**
 * Goal and milestone statistics provider.
 * Aggregates goals by status and milestones by completion state.
 */

import { DirectoryMarkdownParser } from "../../parser/directory/parser.ts";

export interface GoalStatusStat {
  status: string;
  label: string;
  count: number;
}

export interface MilestoneStat {
  id: string;
  name: string;
  status: "open" | "completed";
}

export interface GoalStats {
  total: number;
  complete: number; // "success"
  healthy: number; // "on-track" + "planning"
  atRisk: number; // "at-risk" + "late" + "failed"
  byStatus: GoalStatusStat[];
  milestones: {
    total: number;
    completed: number;
    open: number;
    completionRate: number; // 0–100
    list: MilestoneStat[];
  };
}

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  "on-track": "On Track",
  "at-risk": "At Risk",
  late: "Late",
  success: "Success",
  failed: "Failed",
};

const STATUS_ORDER = [
  "success",
  "on-track",
  "planning",
  "at-risk",
  "late",
  "failed",
];

export async function collectGoalStats(
  parser: DirectoryMarkdownParser,
): Promise<GoalStats> {
  const [goals, milestones] = await Promise.all([
    parser.readGoals(),
    parser.readMilestones(),
  ]);

  // Status counts
  const statusMap = new Map<string, number>();
  for (const g of goals) {
    statusMap.set(g.status, (statusMap.get(g.status) ?? 0) + 1);
  }

  const byStatus: GoalStatusStat[] = STATUS_ORDER.filter(
    (s) => (statusMap.get(s) ?? 0) > 0,
  ).map((s) => ({
    status: s,
    label: STATUS_LABELS[s] ?? s,
    count: statusMap.get(s) ?? 0,
  }));

  const complete = statusMap.get("success") ?? 0;
  const healthy = (statusMap.get("on-track") ?? 0) +
    (statusMap.get("planning") ?? 0);
  const atRisk = (statusMap.get("at-risk") ?? 0) +
    (statusMap.get("late") ?? 0) +
    (statusMap.get("failed") ?? 0);

  // Milestones
  const mCompleted = milestones.filter((m) => m.status === "completed").length;
  const mOpen = milestones.filter((m) => m.status === "open").length;
  const mTotal = milestones.length;
  const mRate = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;

  const mList: MilestoneStat[] = milestones.map((m) => ({
    id: m.id,
    name: m.name,
    status: m.status,
  }));

  return {
    total: goals.length,
    complete,
    healthy,
    atRisk,
    byStatus,
    milestones: {
      total: mTotal,
      completed: mCompleted,
      open: mOpen,
      completionRate: mRate,
      list: mList,
    },
  };
}
