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
import type { Task } from "../types/task.types.ts";
import type { Person } from "../types/person.types.ts";
import type { Goal } from "../types/goal.types.ts";
import type { Meeting } from "../types/meeting.types.ts";
import type { PortfolioItem } from "../types/portfolio.types.ts";
import type { Contact } from "../types/contact.types.ts";
import type { Deal } from "../types/deal.types.ts";
import type { Customer } from "../types/customer.types.ts";
import type { Brainstorm } from "../types/brainstorm.types.ts";
import type { Reflection } from "../types/reflection.types.ts";

/** Severity of an integrity finding: "error" (blocking) or "warning" (advisory). */
export type CheckSeverity = "error" | "warning";

/** A single integrity finding against one entity field. */
export type CheckResult = {
  entityType: string;
  entityId: string;
  field: string;
  issue: string;
  severity: CheckSeverity;
};

/** Integrity findings for one domain, with the count of entities scanned. */
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

/** Full integrity scan output: per-domain results plus aggregate summary and timing. */
export type IntegrityScanResult = {
  /** One entry per domain scanned, in the order they were checked. */
  domains: DomainCheckResult[];
  summary: { errors: number; warnings: number; checked: number };
  durationMs: number;
};

/** Pre-computed reference sets the per-domain checks validate against. */
type Refs = {
  taskIds: Set<string>;
  personIds: Set<string>;
  milestoneNames: Set<string>;
  portfolioNames: Set<string>;
  companyNames: Set<string>;
  contactNames: Set<string>;
  goalIds: Set<string>;
  meetingIds: Set<string>;
  reflectionTemplateIds: Set<string>;
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

/** Flag any entity whose ID was already seen in the same domain. */
function checkDupes(
  items: Array<{ id: string }>,
  b: CheckResult[],
  type: string,
): void {
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) {
      b.push(err(type, it.id, "id", `Duplicate ID "${it.id}"`));
    } else {
      seen.add(it.id);
    }
  }
}

function checkTasks(tasks: Task[], refs: Refs, b: CheckResult[]): void {
  for (const t of tasks) {
    if (t.assignee && !refs.personIds.has(t.assignee)) {
      b.push(err("task", t.id, "assignee", `Unknown person "${t.assignee}"`));
    }
    if (t.milestone && !refs.milestoneNames.has(t.milestone)) {
      b.push(
        warn("task", t.id, "milestone", `Unknown milestone "${t.milestone}"`),
      );
    }
    if (t.project && !refs.portfolioNames.has(t.project)) {
      b.push(
        warn("task", t.id, "project", `Unknown portfolio item "${t.project}"`),
      );
    }
    for (const dep of t.blocked_by ?? []) {
      if (!refs.taskIds.has(dep)) {
        b.push(err("task", t.id, "blocked_by", `Unknown task ID "${dep}"`));
      }
    }
  }
}

function checkPeople(people: Person[], refs: Refs, b: CheckResult[]): void {
  for (const p of people) {
    if (p.reportsTo && !refs.personIds.has(p.reportsTo)) {
      b.push(
        err("person", p.id, "reportsTo", `Unknown person "${p.reportsTo}"`),
      );
    }
  }
}

function checkGoals(goals: Goal[], refs: Refs, b: CheckResult[]): void {
  for (const g of goals) {
    if (g.owner && !refs.personIds.has(g.owner)) {
      b.push(err("goal", g.id, "owner", `Unknown person "${g.owner}"`));
    }
  }
}

function checkMeetings(
  meetings: Meeting[],
  refs: Refs,
  b: CheckResult[],
): void {
  for (const m of meetings) {
    for (const att of m.attendees ?? []) {
      if (!refs.personIds.has(att)) {
        b.push(err("meeting", m.id, "attendees", `Unknown person "${att}"`));
      }
    }
    for (const r of m.relatedMeetings ?? []) {
      if (!refs.meetingIds.has(r)) {
        b.push(
          err("meeting", m.id, "relatedMeetings", `Unknown meeting ID "${r}"`),
        );
      }
    }
  }
}

function checkPortfolio(
  portfolio: PortfolioItem[],
  refs: Refs,
  b: CheckResult[],
): void {
  for (const p of portfolio) {
    for (const gid of p.linkedGoals ?? []) {
      if (!refs.goalIds.has(gid)) {
        b.push(
          err("portfolio", p.id, "linkedGoals", `Unknown goal ID "${gid}"`),
        );
      }
    }
  }
}

function checkContacts(
  contacts: Contact[],
  refs: Refs,
  b: CheckResult[],
): void {
  for (const c of contacts) {
    if (c.company && !refs.companyNames.has(c.company)) {
      b.push(err("contact", c.id, "company", `Unknown company "${c.company}"`));
    }
  }
}

function checkDeals(deals: Deal[], refs: Refs, b: CheckResult[]): void {
  for (const d of deals) {
    if (d.company && !refs.companyNames.has(d.company)) {
      b.push(err("deal", d.id, "company", `Unknown company "${d.company}"`));
    }
    if (d.contact && !refs.contactNames.has(d.contact)) {
      b.push(warn("deal", d.id, "contact", `Unknown contact "${d.contact}"`));
    }
  }
}

function checkCustomers(
  customers: Customer[],
  refs: Refs,
  b: CheckResult[],
): void {
  for (const c of customers) {
    if (c.company && !refs.companyNames.has(c.company)) {
      b.push(
        warn("customer", c.id, "company", `Unknown company "${c.company}"`),
      );
    }
  }
}

function checkBrainstorms(
  brainstorms: Brainstorm[],
  refs: Refs,
  b: CheckResult[],
): void {
  for (const bs of brainstorms) {
    for (const tid of bs.linkedTasks ?? []) {
      if (!refs.taskIds.has(tid)) {
        b.push(
          err("brainstorm", bs.id, "linkedTasks", `Unknown task ID "${tid}"`),
        );
      }
    }
    for (const gid of bs.linkedGoals ?? []) {
      if (!refs.goalIds.has(gid)) {
        b.push(
          err("brainstorm", bs.id, "linkedGoals", `Unknown goal ID "${gid}"`),
        );
      }
    }
    for (const proj of bs.linkedProjects ?? []) {
      if (!refs.portfolioNames.has(proj)) {
        b.push(
          warn(
            "brainstorm",
            bs.id,
            "linkedProjects",
            `Unknown portfolio item "${proj}"`,
          ),
        );
      }
    }
  }
}

function checkReflections(
  reflections: Reflection[],
  refs: Refs,
  b: CheckResult[],
): void {
  for (const r of reflections) {
    if (r.templateId && !refs.reflectionTemplateIds.has(r.templateId)) {
      b.push(
        err(
          "reflection",
          r.id,
          "templateId",
          `Unknown reflection template ID "${r.templateId}"`,
        ),
      );
    }
  }
}

/**
 * Cross-entity referential-integrity scanner. `scan()` validates every domain's
 * references (e.g. task.project / brainstorm.linkedProjects against portfolio
 * NAME; contact/deal.company against company name) and reports errors/warnings.
 */
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

    const refs: Refs = {
      taskIds: new Set(tasks.map((t) => t.id)),
      personIds: new Set(people.map((p) => p.id)),
      milestoneNames: new Set(milestones.map((m) => m.name)),
      portfolioNames: new Set(portfolio.map((p) => p.name)),
      companyNames: new Set(companies.map((c) => c.name)),
      contactNames: new Set(contacts.map((c) => c.name)),
      goalIds: new Set(goals.map((g) => g.id)),
      meetingIds: new Set(meetings.map((m) => m.id)),
      reflectionTemplateIds: new Set(reflectionTemplates.map((t) => t.id)),
    };

    const domains: DomainCheckResult[] = [];
    const bucket = (key: string, label: string, checked: number) => {
      const checks: CheckResult[] = [];
      domains.push({ key, label, checked, checks });
      return checks;
    };

    const taskChecks = bucket("task", "Tasks", tasks.length);
    checkDupes(tasks, taskChecks, "task");
    checkTasks(tasks, refs, taskChecks);

    const personChecks = bucket("person", "People", people.length);
    checkDupes(people, personChecks, "person");
    checkPeople(people, refs, personChecks);

    // Milestones — duplicate IDs only.
    const milestoneChecks = bucket(
      "milestone",
      "Milestones",
      milestones.length,
    );
    checkDupes(milestones, milestoneChecks, "milestone");

    const goalChecks = bucket("goal", "Goals", goals.length);
    checkDupes(goals, goalChecks, "goal");
    checkGoals(goals, refs, goalChecks);

    const meetingChecks = bucket("meeting", "Meetings", meetings.length);
    checkDupes(meetings, meetingChecks, "meeting");
    checkMeetings(meetings, refs, meetingChecks);

    const portfolioChecks = bucket(
      "portfolio",
      "Portfolio Items",
      portfolio.length,
    );
    checkDupes(portfolio, portfolioChecks, "portfolio");
    checkPortfolio(portfolio, refs, portfolioChecks);

    // Companies — duplicate IDs only.
    const companyChecks = bucket("company", "Companies", companies.length);
    checkDupes(companies, companyChecks, "company");

    const contactChecks = bucket("contact", "Contacts", contacts.length);
    checkDupes(contacts, contactChecks, "contact");
    checkContacts(contacts, refs, contactChecks);

    const dealChecks = bucket("deal", "Deals", deals.length);
    checkDupes(deals, dealChecks, "deal");
    checkDeals(deals, refs, dealChecks);

    const customerChecks = bucket("customer", "Customers", customers.length);
    checkDupes(customers, customerChecks, "customer");
    checkCustomers(customers, refs, customerChecks);

    const brainstormChecks = bucket(
      "brainstorm",
      "Brainstorms",
      brainstorms.length,
    );
    checkDupes(brainstorms, brainstormChecks, "brainstorm");
    checkBrainstorms(brainstorms, refs, brainstormChecks);

    const reflectionChecks = bucket(
      "reflection",
      "Reflections",
      reflections.length,
    );
    checkDupes(reflections, reflectionChecks, "reflection");
    checkReflections(reflections, refs, reflectionChecks);

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

/** Lazily-instantiated singleton accessor for the IntegrityService. */
export function getIntegrityService(): IntegrityService {
  if (!_instance) _instance = new IntegrityService();
  return _instance;
}
