// Data integrity scanner — checks cross-references between entities.
// Read-only: uses existing service list() methods, never writes.

import {
  getGoalService,
  getMeetingService,
  getMilestoneService,
  getPeopleService,
  getPortfolioService,
  getTaskService,
} from "../singletons/services.ts";

export type CheckSeverity = "error" | "warning";

export type CheckResult = {
  entityType: string;
  entityId: string;
  field: string;
  issue: string;
  severity: CheckSeverity;
};

export type IntegrityScanResult = {
  checks: CheckResult[];
  summary: { errors: number; warnings: number };
  durationMs: number;
};

function err(
  entityType: string,
  entityId: string,
  field: string,
  issue: string,
): CheckResult {
  return { entityType, entityId, field, issue, severity: "error" };
}

function warn(
  entityType: string,
  entityId: string,
  field: string,
  issue: string,
): CheckResult {
  return { entityType, entityId, field, issue, severity: "warning" };
}

export class IntegrityService {
  async scan(): Promise<IntegrityScanResult> {
    const start = performance.now();
    const checks: CheckResult[] = [];

    const [tasks, people, milestones, goals, meetings, portfolio] =
      await Promise.all([
        getTaskService().list(),
        getPeopleService().list(),
        getMilestoneService().list(),
        getGoalService().list(),
        getMeetingService().list(),
        getPortfolioService().list(),
      ]);

    const taskIds = new Set(tasks.map((t) => t.id));
    const personIds = new Set(people.map((p) => p.id));
    const milestoneNames = new Set(milestones.map((m) => m.name));
    const portfolioNames = new Set(portfolio.map((p) => p.name));

    // Duplicate ID detection per entity type
    const seen = new Map<string, Set<string>>();
    const checkDuplicates = (type: string, ids: string[]) => {
      const s = seen.get(type) ?? new Set<string>();
      seen.set(type, s);
      for (const id of ids) {
        if (s.has(id)) {
          checks.push(err(type, id, "id", `Duplicate ID "${id}"`));
        }
        s.add(id);
      }
    };

    checkDuplicates("task", tasks.map((t) => t.id));
    checkDuplicates("person", people.map((p) => p.id));
    checkDuplicates("milestone", milestones.map((m) => m.id));
    checkDuplicates("goal", goals.map((g) => g.id));
    checkDuplicates("meeting", meetings.map((m) => m.id));
    checkDuplicates("portfolio", portfolio.map((p) => p.id));

    // Tasks
    for (const t of tasks) {
      if (t.assignee && !personIds.has(t.assignee)) {
        checks.push(
          err("task", t.id, "assignee", `Unknown person "${t.assignee}"`),
        );
      }
      if (t.milestone && !milestoneNames.has(t.milestone)) {
        checks.push(
          warn(
            "task",
            t.id,
            "milestone",
            `Unknown milestone "${t.milestone}"`,
          ),
        );
      }
      if (t.project && !portfolioNames.has(t.project)) {
        checks.push(
          warn(
            "task",
            t.id,
            "project",
            `Unknown portfolio item "${t.project}"`,
          ),
        );
      }
      for (const dep of t.blocked_by ?? []) {
        if (!taskIds.has(dep)) {
          checks.push(
            err("task", t.id, "blocked_by", `Unknown task ID "${dep}"`),
          );
        }
      }
    }

    // People
    for (const p of people) {
      if (p.reportsTo && !personIds.has(p.reportsTo)) {
        checks.push(
          err("person", p.id, "reportsTo", `Unknown person "${p.reportsTo}"`),
        );
      }
    }

    // Goals
    for (const g of goals) {
      if (g.owner && !personIds.has(g.owner)) {
        checks.push(err("goal", g.id, "owner", `Unknown person "${g.owner}"`));
      }
    }

    // Meetings
    for (const m of meetings) {
      for (const att of m.attendees ?? []) {
        if (!personIds.has(att)) {
          checks.push(
            err(
              "meeting",
              m.id,
              "attendees",
              `Unknown person "${att}"`,
            ),
          );
        }
      }
    }

    const durationMs = Math.round(performance.now() - start);
    const errors = checks.filter((c) => c.severity === "error").length;
    const warnings = checks.filter((c) => c.severity === "warning").length;

    return { checks, summary: { errors, warnings }, durationMs };
  }
}

let _instance: IntegrityService | null = null;

export function getIntegrityService(): IntegrityService {
  if (!_instance) _instance = new IntegrityService();
  return _instance;
}
