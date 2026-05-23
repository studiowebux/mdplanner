// Data integrity scanner — checks cross-references between entities.
// Read-only: uses existing service list() methods, never writes.
//
// Results are grouped per domain (with a checked count) so the UI can render
// a per-module green/red breakdown instead of a flat global list.

import {
  getBrainstormService,
  getCompanyService,
  getContactService,
  getCustomerService,
  getDealService,
  getGoalService,
  getMeetingService,
  getMilestoneService,
  getPeopleService,
  getPortfolioService,
  getReflectionService,
  getReflectionTemplateService,
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

export type DomainCheckResult = {
  /** Stable key, e.g. "task". */
  key: string;
  /** Human label, e.g. "Tasks". */
  label: string;
  /** Number of entities scanned in this domain. */
  checked: number;
  /** Issues found (errors + warnings) for entities in this domain. */
  checks: CheckResult[];
};

export type IntegrityScanResult = {
  /** One entry per domain scanned, in the order they were checked. */
  domains: DomainCheckResult[];
  summary: { errors: number; warnings: number; checked: number };
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

    const [
      tasks,
      people,
      milestones,
      goals,
      meetings,
      portfolio,
      companies,
      contacts,
      deals,
      customers,
      brainstorms,
      reflections,
      reflectionTemplates,
    ] = await Promise.all([
      getTaskService().list(),
      getPeopleService().list(),
      getMilestoneService().list(),
      getGoalService().list(),
      getMeetingService().list(),
      getPortfolioService().list(),
      getCompanyService().list(),
      getContactService().list(),
      getDealService().list(),
      getCustomerService().list(),
      getBrainstormService().list(),
      getReflectionService().list(),
      getReflectionTemplateService().list(),
    ]);

    const taskIds = new Set(tasks.map((t) => t.id));
    const personIds = new Set(people.map((p) => p.id));
    const milestoneNames = new Set(milestones.map((m) => m.name));
    const portfolioNames = new Set(portfolio.map((p) => p.name));
    const companyNames = new Set(companies.map((c) => c.name));
    const contactNames = new Set(contacts.map((c) => c.name));
    const goalIds = new Set(goals.map((g) => g.id));
    const meetingIds = new Set(meetings.map((m) => m.id));
    const reflectionTemplateIds = new Set(reflectionTemplates.map((t) => t.id));

    const domains: DomainCheckResult[] = [];
    const bucket = (key: string, label: string, checked: number) => {
      const checks: CheckResult[] = [];
      domains.push({ key, label, checked, checks });
      return checks;
    };
    const checkDupes = (
      items: Array<{ id: string }>,
      b: CheckResult[],
      type: string,
    ) => {
      const seen = new Set<string>();
      for (const it of items) {
        if (seen.has(it.id)) {
          b.push(err(type, it.id, "id", `Duplicate ID "${it.id}"`));
        } else {
          seen.add(it.id);
        }
      }
    };

    // Tasks
    const taskChecks = bucket("task", "Tasks", tasks.length);
    checkDupes(tasks, taskChecks, "task");
    for (const t of tasks) {
      if (t.assignee && !personIds.has(t.assignee)) {
        taskChecks.push(
          err("task", t.id, "assignee", `Unknown person "${t.assignee}"`),
        );
      }
      if (t.milestone && !milestoneNames.has(t.milestone)) {
        taskChecks.push(
          warn("task", t.id, "milestone", `Unknown milestone "${t.milestone}"`),
        );
      }
      if (t.project && !portfolioNames.has(t.project)) {
        taskChecks.push(
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
          taskChecks.push(
            err("task", t.id, "blocked_by", `Unknown task ID "${dep}"`),
          );
        }
      }
    }

    // People
    const personChecks = bucket("person", "People", people.length);
    checkDupes(people, personChecks, "person");
    for (const p of people) {
      if (p.reportsTo && !personIds.has(p.reportsTo)) {
        personChecks.push(
          err("person", p.id, "reportsTo", `Unknown person "${p.reportsTo}"`),
        );
      }
    }

    // Milestones — duplicate IDs only.
    const milestoneChecks = bucket(
      "milestone",
      "Milestones",
      milestones.length,
    );
    checkDupes(milestones, milestoneChecks, "milestone");

    // Goals
    const goalChecks = bucket("goal", "Goals", goals.length);
    checkDupes(goals, goalChecks, "goal");
    for (const g of goals) {
      if (g.owner && !personIds.has(g.owner)) {
        goalChecks.push(
          err("goal", g.id, "owner", `Unknown person "${g.owner}"`),
        );
      }
    }

    // Meetings — attendees, relatedMeetings.
    const meetingChecks = bucket("meeting", "Meetings", meetings.length);
    checkDupes(meetings, meetingChecks, "meeting");
    for (const m of meetings) {
      for (const att of m.attendees ?? []) {
        if (!personIds.has(att)) {
          meetingChecks.push(
            err("meeting", m.id, "attendees", `Unknown person "${att}"`),
          );
        }
      }
      for (const r of m.relatedMeetings ?? []) {
        if (!meetingIds.has(r)) {
          meetingChecks.push(
            err(
              "meeting",
              m.id,
              "relatedMeetings",
              `Unknown meeting ID "${r}"`,
            ),
          );
        }
      }
    }

    // Portfolio — linkedGoals.
    const portfolioChecks = bucket(
      "portfolio",
      "Portfolio Items",
      portfolio.length,
    );
    checkDupes(portfolio, portfolioChecks, "portfolio");
    for (const p of portfolio) {
      for (const gid of p.linkedGoals ?? []) {
        if (!goalIds.has(gid)) {
          portfolioChecks.push(
            err("portfolio", p.id, "linkedGoals", `Unknown goal ID "${gid}"`),
          );
        }
      }
    }

    // Companies — duplicate IDs only.
    const companyChecks = bucket("company", "Companies", companies.length);
    checkDupes(companies, companyChecks, "company");

    // Contacts
    const contactChecks = bucket("contact", "Contacts", contacts.length);
    checkDupes(contacts, contactChecks, "contact");
    for (const c of contacts) {
      if (c.company && !companyNames.has(c.company)) {
        contactChecks.push(
          err("contact", c.id, "company", `Unknown company "${c.company}"`),
        );
      }
    }

    // Deals
    const dealChecks = bucket("deal", "Deals", deals.length);
    checkDupes(deals, dealChecks, "deal");
    for (const d of deals) {
      if (d.company && !companyNames.has(d.company)) {
        dealChecks.push(
          err("deal", d.id, "company", `Unknown company "${d.company}"`),
        );
      }
      if (d.contact && !contactNames.has(d.contact)) {
        dealChecks.push(
          warn("deal", d.id, "contact", `Unknown contact "${d.contact}"`),
        );
      }
    }

    // Customers
    const customerChecks = bucket("customer", "Customers", customers.length);
    checkDupes(customers, customerChecks, "customer");
    for (const c of customers) {
      if (c.company && !companyNames.has(c.company)) {
        customerChecks.push(
          warn("customer", c.id, "company", `Unknown company "${c.company}"`),
        );
      }
    }

    // Brainstorms — linkedTasks, linkedGoals, linkedProjects.
    const brainstormChecks = bucket(
      "brainstorm",
      "Brainstorms",
      brainstorms.length,
    );
    checkDupes(brainstorms, brainstormChecks, "brainstorm");
    for (const b of brainstorms) {
      for (const tid of b.linkedTasks ?? []) {
        if (!taskIds.has(tid)) {
          brainstormChecks.push(
            err(
              "brainstorm",
              b.id,
              "linkedTasks",
              `Unknown task ID "${tid}"`,
            ),
          );
        }
      }
      for (const gid of b.linkedGoals ?? []) {
        if (!goalIds.has(gid)) {
          brainstormChecks.push(
            err(
              "brainstorm",
              b.id,
              "linkedGoals",
              `Unknown goal ID "${gid}"`,
            ),
          );
        }
      }
      for (const proj of b.linkedProjects ?? []) {
        if (!portfolioNames.has(proj)) {
          brainstormChecks.push(
            warn(
              "brainstorm",
              b.id,
              "linkedProjects",
              `Unknown portfolio item "${proj}"`,
            ),
          );
        }
      }
    }

    // Reflections — templateId.
    const reflectionChecks = bucket(
      "reflection",
      "Reflections",
      reflections.length,
    );
    checkDupes(reflections, reflectionChecks, "reflection");
    for (const r of reflections) {
      if (r.templateId && !reflectionTemplateIds.has(r.templateId)) {
        reflectionChecks.push(
          err(
            "reflection",
            r.id,
            "templateId",
            `Unknown reflection template ID "${r.templateId}"`,
          ),
        );
      }
    }

    // Reflection templates — duplicate IDs only.
    const templateChecks = bucket(
      "reflection-template",
      "Reflection Templates",
      reflectionTemplates.length,
    );
    checkDupes(reflectionTemplates, templateChecks, "reflection-template");

    const all = domains.flatMap((d) => d.checks);
    const errors = all.filter((c) => c.severity === "error").length;
    const warnings = all.filter((c) => c.severity === "warning").length;
    const checked = domains.reduce((acc, d) => acc + d.checked, 0);

    return {
      domains,
      summary: { errors, warnings, checked },
      durationMs: Math.round(performance.now() - start),
    };
  }
}

let _instance: IntegrityService | null = null;

export function getIntegrityService(): IntegrityService {
  if (!_instance) _instance = new IntegrityService();
  return _instance;
}
