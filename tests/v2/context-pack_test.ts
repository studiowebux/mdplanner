/**
 * Context-pack assembler guard — assembleContextPack.
 *
 * The single-call agent boot payload shipped without an automated test. These
 * cases drive the real services (no cache) against isolated temp projects and
 * assert the assembled shape end-to-end: people split, newest-open milestone
 * with task rollups, priority-sorted Todo + ready flags, newest progress
 * excerpt, note partitioning by `[type]` prefix, the summary counters, the
 * configurable stale window, and every `suggestedAction` branch
 * (pick-next / resume / unblock / wait-review / idle).
 *
 * Mirrors the temp-dir + initServices pattern from
 * analytics-milestone-stats_test.ts (cached repos write their cache back into
 * source otherwise — build entities fresh in a temp dir instead).
 */

import { assert, assertEquals } from "@std/assert";
import { assembleContextPack } from "../../src/services/context-pack.service.ts";
import {
  getMilestoneService,
  getNoteService,
  getPeopleService,
  getProjectService,
  getTaskService,
  initServices,
} from "../../src/singletons/services.ts";

const PROJECT = "TestProj";

/** Spin up an isolated project with services wired (no cache). */
async function freshProject(prefix: string): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix });
  initServices(dir, { cache: false });
  return dir;
}

Deno.test("assembleContextPack — full assembly: people, milestone rollup, todo sort, notes, pick-next", async () => {
  const dir = await freshProject("mdplanner-context-pack-full-");
  try {
    const people = getPeopleService();
    const milestones = getMilestoneService();
    const tasks = getTaskService();
    const notes = getNoteService();

    // People: one AI agent, one human owner.
    const claude = await people.create({ name: "Claude", agentType: "ai" });
    const owner = await people.create({ name: "Tommy", agentType: "human" });

    // Two open milestones — the newest (greatest id) is the active one.
    const m1 = await milestones.create({
      name: "vAlpha",
      status: "open",
      project: PROJECT,
    });
    const m2 = await milestones.create({
      name: "vBeta",
      status: "open",
      project: PROJECT,
    });
    const active = [m1, m2].sort((a, b) => b.id.localeCompare(a.id))[0];

    // Two tasks linked to the active milestone (out of the board sections so
    // they do not pollute the Todo assertions); one completed.
    const mDone = await tasks.create({
      title: "Milestone done",
      section: "Done",
      project: PROJECT,
      milestone: active.name,
    });
    await tasks.update(mDone.id, { completed: true });
    await tasks.create({
      title: "Milestone open",
      section: "Done",
      project: PROJECT,
      milestone: active.name,
    });

    // Todo tasks with mixed priorities (no blockers → all ready).
    const pLow = await tasks.create({
      title: "P3",
      section: "Todo",
      project: PROJECT,
      priority: 3,
    });
    const pHigh = await tasks.create({
      title: "P1",
      section: "Todo",
      project: PROJECT,
      priority: 1,
    });
    const pMid = await tasks.create({
      title: "P2",
      section: "Todo",
      project: PROJECT,
      priority: 2,
    });

    // One note per classified type + two progress notes. The two progress
    // notes are created first/last with the other five creates between them so
    // their `updatedAt` differ deterministically (no same-millisecond tie).
    const prog1 = await notes.create({
      title: "[progress] TestProj — older",
      content: "older summary",
      project: PROJECT,
    });
    const decision = await notes.create({
      title: "[decision] TestProj — pick a store",
      content: "decided",
      project: PROJECT,
    });
    const arch = await notes.create({
      title: "[architecture] TestProj — layering",
      content: "layered",
      project: PROJECT,
    });
    const constraint = await notes.create({
      title: "[constraint] TestProj — hard limit",
      content: "limited",
      project: PROJECT,
    });
    const feature = await notes.create({
      title: "[feature] TestProj — dashboard",
      content: "featured",
      project: PROJECT,
    });
    const investigation = await notes.create({
      title: "[investigation] TestProj — perf dig",
      content: "investigated",
      project: PROJECT,
    });
    const prog2 = await notes.create({
      title: "[progress] TestProj — newer",
      content: "newer summary",
      project: PROJECT,
    });
    const newestProg = [prog1, prog2].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    )[0];

    const pack = await assembleContextPack({ project: PROJECT });

    // People: AI in agents, human as owner.
    assertEquals(pack.people.agents.length, 1);
    assertEquals(pack.people.agents[0].id, claude.id);
    assertEquals(pack.people.owner?.id, owner.id);

    // Active milestone = newest open, with task rollups.
    assertEquals(pack.milestone?.id, active.id);
    assertEquals(pack.milestone?.taskCount, 2);
    assertEquals(pack.milestone?.doneCount, 1);

    // Todo: priority-sorted, all ready.
    assertEquals(pack.todo.map((t) => t.id), [pHigh.id, pMid.id, pLow.id]);
    assert(pack.todo.every((t) => t.ready));

    // Recent progress = newest by updatedAt, excerpt = full short content.
    assertEquals(pack.recentProgress?.id, newestProg.id);
    assertEquals(pack.recentProgress?.excerpt, newestProg.content);

    // Note partitioning by `[type]` prefix.
    assertEquals(pack.decisions.map((n) => n.id), [decision.id]);
    assertEquals(pack.architecture.map((n) => n.id), [arch.id]);
    assertEquals(pack.constraints.map((n) => n.id), [constraint.id]);
    assertEquals(pack.features.map((n) => n.id), [feature.id]);
    assertEquals(pack.investigations.map((n) => n.id), [investigation.id]);

    // Summary counters.
    assertEquals(pack.summary.openMilestones, 2);
    assertEquals(pack.summary.totalTodo, 3);
    assertEquals(pack.summary.totalInProgress, 0);
    assertEquals(pack.summary.staleTasks, 0);

    // No In Progress + ready Todo → pick highest-priority ready task.
    assertEquals(pack.suggestedAction.type, "pick-next");
    assertEquals(pack.suggestedAction.taskId, pHigh.id);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("assembleContextPack — resume: in-progress task surfaces checkpoint + relevant files", async () => {
  const dir = await freshProject("mdplanner-context-pack-resume-");
  try {
    const tasks = getTaskService();

    const wip = await tasks.create({
      title: "Refactor parser",
      section: "In Progress",
      project: PROJECT,
      files: ["src/a.ts"],
    });
    // Checkpoint comment drives the resume nextStep. (The comment also carries
    // files_changed metadata, but extractRelevantFiles' comment-metadata source
    // is not asserted here: the frontmatter serializer mangles nested comment
    // metadata to "[object Object]" on the round-trip — see
    // `[bug] MD Planner — comment metadata lost in frontmatter serializer`.)
    await tasks.addComment(
      wip.id,
      "Checkpoint: extracted helper\nremaining: wire callers",
      "Claude",
      { files_changed: ["src/b.ts"] },
    );

    const pack = await assembleContextPack({ project: PROJECT });

    assertEquals(pack.inProgress.length, 1);
    assertEquals(pack.inProgress[0].id, wip.id);
    // relevantFiles surfaces the explicit `files` set.
    assertEquals(pack.inProgress[0].relevantFiles, ["src/a.ts"]);

    assertEquals(pack.suggestedAction.type, "resume");
    assertEquals(pack.suggestedAction.taskId, wip.id);
    assert(
      pack.suggestedAction.nextStep?.includes("Checkpoint: extracted helper"),
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("assembleContextPack — unblock: todo task whose blocker is completed", async () => {
  const dir = await freshProject("mdplanner-context-pack-unblock-");
  try {
    const tasks = getTaskService();

    const blocker = await tasks.create({
      title: "Blocker",
      section: "Pending Review",
      project: PROJECT,
    });
    await tasks.update(blocker.id, { completed: true });

    const blocked = await tasks.create({
      title: "Was blocked",
      section: "Todo",
      project: PROJECT,
      priority: 2,
      blocked_by: [blocker.id],
    });

    const pack = await assembleContextPack({ project: PROJECT });

    assertEquals(pack.suggestedAction.type, "unblock");
    assertEquals(pack.suggestedAction.taskId, blocked.id);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("assembleContextPack — wait-review: only pending-review work + backlog milestone suggestion", async () => {
  const dir = await freshProject("mdplanner-context-pack-review-");
  try {
    const tasks = getTaskService();

    await tasks.create({
      title: "Awaiting review",
      section: "Pending Review",
      project: PROJECT,
    });
    const b1 = await tasks.create({
      title: "Backlog one",
      section: "Backlog",
      project: PROJECT,
      tags: ["infra"],
    });
    const b2 = await tasks.create({
      title: "Backlog two",
      section: "Backlog",
      project: PROJECT,
      tags: ["infra"],
    });

    const pack = await assembleContextPack({ project: PROJECT });

    assertEquals(pack.suggestedAction.type, "wait-review");
    const suggestion = pack.suggestedAction.nextMilestoneSuggestion;
    assertEquals(suggestion?.suggestedName, "Next: Infra");
    assert(suggestion?.candidateTaskIds.includes(b1.id));
    assert(suggestion?.candidateTaskIds.includes(b2.id));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("assembleContextPack — idle: empty board asks owner to queue work", async () => {
  const dir = await freshProject("mdplanner-context-pack-idle-");
  try {
    const pack = await assembleContextPack({ project: PROJECT });

    assertEquals(pack.milestone, null);
    assertEquals(pack.todo.length, 0);
    assertEquals(pack.inProgress.length, 0);
    assertEquals(pack.suggestedAction.type, "idle");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("assembleContextPack — staleTasks honors the project staleDays window", async () => {
  const dir = await freshProject("mdplanner-context-pack-stale-");
  try {
    const tasks = getTaskService();
    const project = getProjectService();

    const wip = await tasks.create({
      title: "Stalled work",
      section: "In Progress",
      project: PROJECT,
    });
    // Last activity 30 days ago.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString();
    await tasks.update(wip.id, {
      comments: [
        {
          id: "comment_stale_seed",
          author: "Claude",
          timestamp: thirtyDaysAgo,
          body: "Paused here.",
        },
      ],
    });

    // Default window is 14 days → 30-day-old comment is stale.
    const stalePack = await assembleContextPack({ project: PROJECT });
    assertEquals(stalePack.summary.staleTasks, 1);

    // Widen the window past 30 days → no longer stale.
    await project.updateConfig({ staleDays: 60 });
    const freshPack = await assembleContextPack({ project: PROJECT });
    assertEquals(freshPack.summary.staleTasks, 0);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
