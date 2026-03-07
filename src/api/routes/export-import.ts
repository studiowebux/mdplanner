/**
 * Export/Import routes (CSV, PDF).
 */

import { Hono } from "hono";
import {
  AppVariables,
  cacheWriteThrough,
  corsHeaders,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";
import {
  Fishbone,
  Goal,
  Habit,
  Idea,
  JournalEntry,
  Meeting,
  Note,
  Person,
  Task,
} from "../../lib/types.ts";
import type { Company, Contact, Deal } from "../../lib/types.ts";
import { PortfolioItem } from "../../lib/parser/directory/portfolio.ts";

export const exportImportRouter = new Hono<{ Variables: AppVariables }>();

// Helper functions

function flattenTasks(tasks: Task[]): Task[] {
  const flattened: Task[] = [];
  for (const task of tasks) {
    flattened.push(task);
    if (task.children && task.children.length > 0) {
      flattened.push(...flattenTasks(task.children));
    }
  }
  return flattened;
}

function flattenTasksWithParent(
  tasks: Task[],
  parentId?: string,
): Array<Task & { parentId?: string }> {
  const flattened: Array<Task & { parentId?: string }> = [];
  for (const task of tasks) {
    const taskWithParent = { ...task, parentId };
    flattened.push(taskWithParent);
    if (task.children && task.children.length > 0) {
      flattened.push(...flattenTasksWithParent(task.children, task.id));
    }
  }
  return flattened;
}

function escapeCSV(value: string): string {
  if (!value) return '""';
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function convertTasksToCSV(tasks: Task[]): string {
  const headers = [
    "ID",
    "Title",
    "Section",
    "Completed",
    "Priority",
    "Assignee",
    "Due Date",
    "Effort",
    "Tags",
    "Blocked By",
    "Milestone",
    "Description",
    "Parent ID",
  ];
  let csv = headers.join(",") + "\n";

  const flatTasks = flattenTasksWithParent(tasks);

  for (const task of flatTasks) {
    const row = [
      escapeCSV(task.id),
      escapeCSV(task.title),
      escapeCSV(task.section),
      task.completed ? "TRUE" : "FALSE",
      escapeCSV(task.config.priority?.toString() || ""),
      escapeCSV(task.config.assignee || ""),
      escapeCSV(task.config.due_date || ""),
      escapeCSV(task.config.effort?.toString() || ""),
      escapeCSV(task.config.tags?.join(", ") || ""),
      escapeCSV(task.config.blocked_by?.join(", ") || ""),
      escapeCSV(task.config.milestone || ""),
      escapeCSV(task.description?.join(" ") || ""),
      escapeCSV(task.parentId || ""),
    ];
    csv += row.join(",") + "\n";
  }

  return csv;
}

function convertNotesToCSV(notes: Note[]): string {
  const headers = ["ID", "Title", "Created At", "Updated At", "Tags", "Body"];
  let csv = headers.join(",") + "\n";
  for (const note of notes) {
    const tags = (note as unknown as { tags?: string[] }).tags?.join(", ") ??
      "";
    const body = note.content ?? "";
    csv += [
      escapeCSV(note.id),
      escapeCSV(note.title),
      escapeCSV(note.createdAt),
      escapeCSV(note.updatedAt),
      escapeCSV(tags),
      escapeCSV(body.replace(/\n/g, " ").slice(0, 500)),
    ].join(",") + "\n";
  }
  return csv;
}

function convertGoalsToCSV(goals: Goal[]): string {
  const headers = [
    "ID",
    "Title",
    "Type",
    "Status",
    "KPI",
    "Start Date",
    "End Date",
    "Description",
  ];
  let csv = headers.join(",") + "\n";
  for (const goal of goals) {
    csv += [
      escapeCSV(goal.id),
      escapeCSV(goal.title),
      escapeCSV(goal.type),
      escapeCSV(goal.status),
      escapeCSV(goal.kpi),
      escapeCSV(goal.startDate),
      escapeCSV(goal.endDate),
      escapeCSV(goal.description ?? ""),
    ].join(",") + "\n";
  }
  return csv;
}

function convertMeetingsToCSV(meetings: Meeting[]): string {
  const headers = [
    "ID",
    "Title",
    "Date",
    "Attendees",
    "Open Actions",
    "Done Actions",
  ];
  let csv = headers.join(",") + "\n";
  for (const meeting of meetings) {
    const open = meeting.actions.filter((a) => a.status === "open").length;
    const done = meeting.actions.filter((a) => a.status === "done").length;
    csv += [
      escapeCSV(meeting.id),
      escapeCSV(meeting.title),
      escapeCSV(meeting.date),
      escapeCSV(meeting.attendees?.join(", ") ?? ""),
      open.toString(),
      done.toString(),
    ].join(",") + "\n";
  }
  return csv;
}

function convertPeopleToCSV(people: Person[]): string {
  const headers = [
    "ID",
    "Name",
    "Title",
    "Role",
    "Departments",
    "Email",
    "Phone",
    "Start Date",
  ];
  let csv = headers.join(",") + "\n";
  for (const person of people) {
    csv += [
      escapeCSV(person.id),
      escapeCSV(person.name),
      escapeCSV(person.title ?? ""),
      escapeCSV(person.role ?? ""),
      escapeCSV(person.departments?.join(", ") ?? ""),
      escapeCSV(person.email ?? ""),
      escapeCSV(person.phone ?? ""),
      escapeCSV(person.startDate ?? ""),
    ].join(",") + "\n";
  }
  return csv;
}

function convertPortfolioToCSV(items: PortfolioItem[]): string {
  const headers = [
    "ID",
    "Name",
    "Category",
    "Status",
    "Client",
    "Progress",
    "Start Date",
    "End Date",
    "Tech Stack",
    "License",
  ];
  let csv = headers.join(",") + "\n";
  for (const item of items) {
    csv += [
      escapeCSV(item.id),
      escapeCSV(item.name),
      escapeCSV(item.category),
      escapeCSV(item.status),
      escapeCSV(item.client ?? ""),
      item.progress?.toString() ?? "",
      escapeCSV(item.startDate ?? ""),
      escapeCSV(item.endDate ?? ""),
      escapeCSV(item.techStack?.join(", ") ?? ""),
      escapeCSV(item.license ?? ""),
    ].join(",") + "\n";
  }
  return csv;
}

function buildTaskHierarchy(
  flatTasks: Array<Task & { parentId?: string }>,
): Task[] {
  const taskMap = new Map<string, Task>();
  const rootTasks: Task[] = [];

  for (const task of flatTasks) {
    const { parentId, ...taskWithoutParentId } = task;
    taskMap.set(task.id, { ...taskWithoutParentId, children: [] });
  }

  for (const task of flatTasks) {
    const taskObj = taskMap.get(task.id)!;

    if (task.parentId && taskMap.has(task.parentId)) {
      const parent = taskMap.get(task.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(taskObj);
    } else {
      rootTasks.push(taskObj);
    }
  }

  return rootTasks;
}

interface ParseResult {
  tasks: Task[];
  errors: Array<{ row: number; message: string }>;
}

function parseTasksCSV(csvContent: string): ParseResult {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return { tasks: [], errors: [] };

  const tasks: Array<Task & { parentId?: string }> = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < 4) {
      errors.push({
        row: i + 1,
        message: "Not enough columns (expected at least 4)",
      });
      continue;
    }

    const title = values[1]?.trim();
    if (!title) {
      errors.push({ row: i + 1, message: "Missing title" });
      continue;
    }

    const task: Task & { parentId?: string } = {
      id: values[0]?.trim() || `task_${Date.now()}_${i}`,
      title,
      section: values[2]?.trim() || "Backlog",
      completed: values[3]?.toUpperCase() === "TRUE",
      revision: 1,
      config: {
        priority: values[4]?.trim() ? parseInt(values[4]) : undefined,
        assignee: values[5]?.trim() || undefined,
        due_date: values[6]?.trim() || undefined,
        effort: values[7]?.trim() ? parseInt(values[7]) : undefined,
        tags: values[8]?.trim()
          ? values[8].split(", ").filter((t) => t.trim())
          : undefined,
        blocked_by: values[9]?.trim()
          ? values[9].split(", ").filter((t) => t.trim())
          : undefined,
        milestone: values[10]?.trim() || undefined,
      },
      description: values[11]?.trim() ? [values[11]] : undefined,
      parentId: values[12]?.trim() || undefined,
    };

    tasks.push(task);
  }

  return { tasks: buildTaskHierarchy(tasks), errors };
}

type StickyNoteColor =
  | "yellow"
  | "pink"
  | "blue"
  | "green"
  | "purple"
  | "orange";

function parseCanvasCSV(csvContent: string): {
  id: string;
  content: string;
  color: StickyNoteColor;
  position: { x: number; y: number };
  size?: { width: number; height: number };
}[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const stickyNotes = [];

  const validColors: StickyNoteColor[] = [
    "yellow",
    "pink",
    "blue",
    "green",
    "purple",
    "orange",
  ];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= 5) {
      const parsedColor = values[2] || "yellow";
      const color: StickyNoteColor =
        validColors.includes(parsedColor as StickyNoteColor)
          ? (parsedColor as StickyNoteColor)
          : "yellow";
      const stickyNote: {
        id: string;
        content: string;
        color: StickyNoteColor;
        position: { x: number; y: number };
        size?: { width: number; height: number };
      } = {
        id: values[0] || `sticky_note_${Date.now()}_${i}`,
        content: values[1] || "",
        color,
        position: {
          x: parseInt(values[3]) || 0,
          y: parseInt(values[4]) || 0,
        },
      };

      if (values[5] && values[6]) {
        stickyNote.size = {
          width: parseInt(values[5]) || 200,
          height: parseInt(values[6]) || 150,
        };
      }

      stickyNotes.push(stickyNote);
    }
  }

  return stickyNotes;
}

function generateProjectReportHTML(
  projectInfo: {
    name: string;
    description?: string[];
    goals?: {
      title: string;
      type: string;
      status: string;
      kpi: string;
      startDate: string;
      endDate: string;
      description?: string;
    }[];
  },
  tasks: Task[],
  _config: unknown,
): string {
  const totalTasks = flattenTasks(tasks).length;
  const completedTasks = flattenTasks(tasks).filter((t) => t.completed).length;
  const progressPercent = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const sections = [...new Set(tasks.map((t) => t.section))];
  const sectionStats = sections.map((section) => {
    const sectionTasks = tasks.filter((t) => t.section === section);
    const sectionCompleted = sectionTasks.filter((t) => t.completed).length;
    return {
      name: section,
      total: sectionTasks.length,
      completed: sectionCompleted,
      progress: sectionTasks.length > 0
        ? Math.round((sectionCompleted / sectionTasks.length) * 100)
        : 0,
    };
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Report - ${projectInfo.name}</title>
    <style>
        @page { size: A4; margin: 20mm; }
        @media print { body { font-size: 12px; } .no-print { display: none; } }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 210mm; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #3b82f6; margin: 0; font-size: 2.5em; }
        .header .subtitle { color: #666; font-size: 1.1em; margin-top: 10px; }
        .section { margin-bottom: 25px; break-inside: avoid; }
        .section h2 { color: #3b82f6; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #3b82f6; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 0.9em; }
        .progress-bar { background: #e5e7eb; border-radius: 10px; height: 20px; margin: 10px 0; overflow: hidden; }
        .progress-fill { background: linear-gradient(90deg, #10b981, #3b82f6); height: 100%; transition: width 0.3s ease; }
        .task-list { margin: 15px 0; }
        .task-item { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .task-status { width: 20px; height: 20px; border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; }
        .task-completed { background: #10b981; }
        .task-pending { background: #6b7280; }
        .goal-item { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .goal-title { font-weight: bold; color: #3b82f6; margin-bottom: 8px; }
        .goal-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; font-size: 0.9em; color: #666; margin-bottom: 10px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 0.9em; }
        .no-print { margin: 20px 0; text-align: center; }
        .print-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; }
        .print-btn:hover { background: #2563eb; }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="print-btn" onclick="window.print()">Print/Save as PDF</button>
    </div>

    <div class="header">
        <h1>${projectInfo.name}</h1>
        <div class="subtitle">Project Report - Generated on ${
    new Date().toLocaleDateString()
  }</div>
    </div>

    <div class="section">
        <h2>Project Overview</h2>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number">${totalTasks}</div><div class="stat-label">Total Tasks</div></div>
            <div class="stat-card"><div class="stat-number">${completedTasks}</div><div class="stat-label">Completed</div></div>
            <div class="stat-card"><div class="stat-number">${progressPercent}%</div><div class="stat-label">Progress</div></div>
            <div class="stat-card"><div class="stat-number">${sections.length}</div><div class="stat-label">Sections</div></div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${progressPercent}%"></div></div>
        ${
    projectInfo.description ? `<p>${projectInfo.description.join(" ")}</p>` : ""
  }
    </div>

    <div class="section">
        <h2>Section Breakdown</h2>
        ${
    sectionStats.map((section) => `
            <div style="margin-bottom: 20px;">
                <h3>${section.name}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span>${section.completed}/${section.total} tasks completed</span>
                    <span><strong>${section.progress}%</strong></span>
                </div>
                <div class="progress-bar" style="height: 12px;"><div class="progress-fill" style="width: ${section.progress}%"></div></div>
            </div>
        `).join("")
  }
    </div>

    ${
    projectInfo.goals && projectInfo.goals.length > 0
      ? `
    <div class="section">
        <h2>Goals</h2>
        ${
        projectInfo.goals.map((goal) => `
            <div class="goal-item">
                <div class="goal-title">${goal.title}</div>
                <div class="goal-meta">
                    <div>Type: ${goal.type}</div>
                    <div>Status: ${goal.status}</div>
                    <div>KPI: ${goal.kpi}</div>
                    <div>Timeline: ${goal.startDate} - ${goal.endDate}</div>
                </div>
                ${goal.description ? `<div>${goal.description}</div>` : ""}
            </div>
        `).join("")
      }
    </div>
    `
      : ""
  }

    <div class="section">
        <h2>Recent Tasks</h2>
        <div class="task-list">
            ${
    flattenTasks(tasks).slice(0, 20).map((task) => `
                <div class="task-item">
                    <div class="task-status ${
      task.completed ? "task-completed" : "task-pending"
    }">${task.completed ? "V" : "O"}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${task.title}</div>
                        <div style="font-size: 0.9em; color: #666;">${task.section}${
      task.config.assignee ? ` - ${task.config.assignee}` : ""
    }${task.config.due_date ? ` - Due: ${task.config.due_date}` : ""}</div>
                    </div>
                </div>
            `).join("")
  }
        </div>
    </div>

    <div class="footer"><p>Generated by MD Planner - ${
    new Date().toISOString()
  }</p></div>

    <script>if (window.location.search.includes('auto-print')) { window.onload = () => setTimeout(() => window.print(), 1000); }</script>
</body>
</html>`;
}

// ─── Markdown export helpers ────────────────────────────────────────────────

function mdSection(title: string, body: string): string {
  return `# ${title}\n\n${body}\n\n---\n\n`;
}

function convertTasksToMarkdown(tasks: Task[]): string {
  const flat = flattenTasks(tasks);
  const sections = [...new Set(flat.map((t) => t.section))];
  let out = "";
  for (const section of sections) {
    const items = flat.filter((t) => t.section === section);
    out += `## ${section}\n\n`;
    for (const t of items) {
      const check = t.completed ? "[x]" : "[ ]";
      const meta: string[] = [];
      if (t.config.priority) meta.push(`priority:${t.config.priority}`);
      if (t.config.assignee) meta.push(`assignee:${t.config.assignee}`);
      if (t.config.due_date) meta.push(`due:${t.config.due_date}`);
      if (t.config.milestone) meta.push(`milestone:${t.config.milestone}`);
      const suffix = meta.length ? `  _(${meta.join(", ")})_` : "";
      out += `- ${check} **${t.title}**${suffix}\n`;
      if (t.description?.length) {
        out += `\n  ${t.description.join(" ").replace(/\n/g, "\n  ")}\n\n`;
      }
    }
    out += "\n";
  }
  return out.trim();
}

function convertNotesToMarkdown(notes: Note[]): string {
  return notes.map((n) => {
    const meta: string[] = [];
    if (n.createdAt) meta.push(`Created: ${n.createdAt}`);
    if (n.updatedAt) meta.push(`Updated: ${n.updatedAt}`);
    const tags = (n as unknown as { tags?: string[] }).tags;
    if (tags?.length) meta.push(`Tags: ${tags.join(", ")}`);
    let out = `## ${n.title}\n\n`;
    if (meta.length) out += `_${meta.join(" · ")}_\n\n`;
    if (n.content) out += `${n.content}\n`;
    return out;
  }).join("\n---\n\n");
}

function convertGoalsToMarkdown(goals: Goal[]): string {
  return goals.map((g) => {
    let out =
      `## ${g.title}\n\n**Status:** ${g.status} | **Type:** ${g.type} | **KPI:** ${g.kpi}\n`;
    out += `**Timeline:** ${g.startDate} → ${g.endDate}\n\n`;
    if (g.description) out += `${g.description}\n`;
    return out;
  }).join("\n---\n\n");
}

function convertMeetingsToMarkdown(meetings: Meeting[]): string {
  return meetings.map((m) => {
    let out = `## ${m.title}\n\n**Date:** ${m.date}`;
    if (m.attendees?.length) {
      out += ` | **Attendees:** ${m.attendees.join(", ")}`;
    }
    out += "\n\n";
    if (m.agenda) out += `### Agenda\n\n${m.agenda}\n\n`;
    if (m.notes) out += `### Notes\n\n${m.notes}\n\n`;
    if (m.actions?.length) {
      out += `### Action Items\n\n`;
      for (const a of m.actions) {
        const done = a.status === "done" ? "[x]" : "[ ]";
        const owner = a.owner ? ` _(${a.owner})_` : "";
        const due = a.due ? ` — due ${a.due}` : "";
        out += `- ${done} ${a.description}${owner}${due}\n`;
      }
    }
    return out;
  }).join("\n---\n\n");
}

function convertPeopleToMarkdown(people: Person[]): string {
  let out =
    "| Name | Title | Role | Email | Phone | Start Date |\n|------|-------|------|-------|-------|------------|\n";
  for (const p of people) {
    out += `| ${p.name} | ${p.title ?? ""} | ${p.role ?? ""} | ${
      p.email ?? ""
    } | ${p.phone ?? ""} | ${p.startDate ?? ""} |\n`;
  }
  return out;
}

function convertPortfolioToMarkdown(items: PortfolioItem[]): string {
  return items.map((item) => {
    let out =
      `## ${item.name}\n\n**Status:** ${item.status} | **Category:** ${item.category}`;
    if (item.client) out += ` | **Client:** ${item.client}`;
    if (item.progress !== undefined) {
      out += ` | **Progress:** ${item.progress}%`;
    }
    out += "\n\n";
    if (item.techStack?.length) {
      out += `**Tech:** ${item.techStack.join(", ")}\n\n`;
    }
    if (item.startDate || item.endDate) {
      out += `**Timeline:** ${item.startDate ?? "?"} → ${
        item.endDate ?? "?"
      }\n\n`;
    }
    if (item.urls?.length) {
      out += item.urls.map((u) => `[${u.label}](${u.href})`).join(" | ") +
        "\n\n";
    }
    if (item.description) out += `${item.description}\n`;
    return out;
  }).join("\n---\n\n");
}

function convertIdeasToMarkdown(ideas: Idea[]): string {
  return ideas.map((i) => {
    let out = `## ${i.title}\n\n**Status:** ${i.status}`;
    if (i.category) out += ` | **Category:** ${i.category}`;
    if (i.priority) out += ` | **Priority:** ${i.priority}`;
    out += "\n\n";
    if (i.description) out += `${i.description}\n`;
    return out;
  }).join("\n---\n\n");
}

function convertHabitsToMarkdown(habits: Habit[]): string {
  return habits.map((h) => {
    let out = `## ${h.name}\n\n**Frequency:** ${h.frequency}`;
    if (h.targetDays?.length) out += ` | **Days:** ${h.targetDays.join(", ")}`;
    out += `\n**Streak:** ${h.streakCount} (best: ${h.longestStreak})\n\n`;
    if (h.description) out += `${h.description}\n\n`;
    if (h.completions.length) {
      out += `**Completions (last 10):** ${
        h.completions.slice(-10).join(", ")
      }\n`;
    }
    return out;
  }).join("\n---\n\n");
}

function convertJournalToMarkdown(entries: JournalEntry[]): string {
  return entries.map((e) => {
    const title = e.title ? `: ${e.title}` : "";
    let out = `## ${e.date}${title}\n\n`;
    if (e.mood) out += `**Mood:** ${e.mood}`;
    if (e.tags?.length) out += ` | **Tags:** ${e.tags.join(", ")}`;
    if (e.mood || e.tags?.length) out += "\n\n";
    if (e.body) out += `${e.body}\n`;
    return out;
  }).join("\n---\n\n");
}

function convertDnsToMarkdown(
  domains: import("../../lib/types.ts").DnsDomain[],
): string {
  return domains.map((d) => {
    let out = `## ${d.domain}\n\n`;
    if (d.provider) out += `**Provider:** ${d.provider}  `;
    if (d.expiryDate) out += `**Expires:** ${d.expiryDate}  `;
    if (d.autoRenew !== undefined) {
      out += `**Auto-renew:** ${d.autoRenew ? "yes" : "no"}  `;
    }
    out += "\n\n";
    if (d.dnsRecords?.length) {
      out += "| Type | Name | Value | TTL |\n|------|------|-------|-----|\n";
      for (const r of d.dnsRecords) {
        out += `| ${r.type} | ${r.name} | ${r.value} | ${r.ttl} |\n`;
      }
    }
    return out;
  }).join("\n---\n\n");
}

function convertFishbonesToMarkdown(fishbones: Fishbone[]): string {
  return fishbones.map((f) => {
    let out = `## ${f.title}\n\n`;
    if (f.description) out += `${f.description}\n\n`;
    for (const cause of f.causes) {
      out += `### ${cause.category}\n\n`;
      for (const sub of cause.subcauses) out += `- ${sub}\n`;
      out += "\n";
    }
    return out;
  }).join("\n---\n\n");
}

function convertContactsToMarkdown(contacts: Contact[]): string {
  let out =
    "| Name | Title | Email | Phone | Company |\n|------|-------|-------|-------|---------|\n";
  for (const c of contacts) {
    out += `| ${c.firstName} ${c.lastName} | ${c.title ?? ""} | ${
      c.email ?? ""
    } | ${c.phone ?? ""} | ${c.companyId} |\n`;
  }
  return out;
}

function convertCompaniesToMarkdown(companies: Company[]): string {
  return companies.map((c) => {
    let out = `## ${c.name}\n\n`;
    if (c.industry) out += `**Industry:** ${c.industry}  `;
    if (c.website) out += `**Website:** ${c.website}  `;
    if (c.phone) out += `**Phone:** ${c.phone}  `;
    out += "\n\n";
    if (c.notes) out += `${c.notes}\n`;
    return out;
  }).join("\n---\n\n");
}

function convertDealsToMarkdown(deals: Deal[]): string {
  let out =
    "| Title | Stage | Value | Probability | Expected Close |\n|-------|-------|-------|-------------|----------------|\n";
  for (const d of deals) {
    out += `| ${d.title} | ${d.stage} | ${d.value} | ${d.probability}% | ${
      d.expectedCloseDate ?? ""
    } |\n`;
  }
  return out;
}

// ─── End markdown helpers ────────────────────────────────────────────────────

// Routes

// GET /export/csv/:entity - export any supported entity type as CSV
const CSV_SUPPORTED = [
  "tasks",
  "notes",
  "goals",
  "meetings",
  "people",
  "portfolio",
] as const;
type CsvEntity = (typeof CSV_SUPPORTED)[number];

exportImportRouter.get("/export/csv/:entity", async (c) => {
  const entity = c.req.param("entity") as CsvEntity;
  if (!CSV_SUPPORTED.includes(entity)) {
    return errorResponse(
      `Unsupported entity. Supported: ${CSV_SUPPORTED.join(", ")}`,
      400,
    );
  }

  const parser = getParser(c);
  let csv: string;
  let filename: string;

  switch (entity) {
    case "tasks": {
      const tasks = await parser.readTasks();
      csv = convertTasksToCSV(tasks);
      filename = "tasks.csv";
      break;
    }
    case "notes": {
      const notes = await parser.readNotes();
      csv = convertNotesToCSV(notes);
      filename = "notes.csv";
      break;
    }
    case "goals": {
      const goals = await parser.readGoals();
      csv = convertGoalsToCSV(goals);
      filename = "goals.csv";
      break;
    }
    case "meetings": {
      const meetings = await parser.readMeetings();
      csv = convertMeetingsToCSV(meetings);
      filename = "meetings.csv";
      break;
    }
    case "people": {
      const people = await parser.readPeople();
      csv = convertPeopleToCSV(people);
      filename = "people.csv";
      break;
    }
    case "portfolio": {
      const items = await parser.readPortfolioItems();
      csv = convertPortfolioToCSV(items);
      filename = "portfolio.csv";
      break;
    }
  }

  return new Response(csv!, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${filename!}`,
    },
  });
});

// POST /import/csv/tasks - import tasks from CSV
exportImportRouter.post("/import/csv/tasks", async (c) => {
  const parser = getParser(c);
  const body = await c.req.text();
  const { tasks: parsedTasks, errors } = parseTasksCSV(body);
  const existingTasks = await parser.readTasks();

  const existingTitles = new Set(existingTasks.map((t) => t.title));
  const newTasks = parsedTasks.filter((t) => !existingTitles.has(t.title));
  const skipped = parsedTasks.length - newTasks.length;

  let imported = 0;
  for (const task of newTasks) {
    await parser.addTask(task);
    imported++;
  }

  if (imported > 0) await cacheWriteThrough(c, "tasks");

  return jsonResponse({ success: true, imported, skipped, errors });
});

// POST /import/csv/canvas - import canvas sticky notes from CSV
exportImportRouter.post("/import/csv/canvas", async (c) => {
  const parser = getParser(c);
  const body = await c.req.text();
  const stickyNotes = parseCanvasCSV(body);
  const projectInfo = await parser.readProjectInfo();
  projectInfo.stickyNotes = stickyNotes;
  await parser.saveProjectInfo(projectInfo);
  await cacheWriteThrough(c, "sticky_notes");
  return jsonResponse({ success: true, imported: stickyNotes.length });
});

// GET /export/json - export one or more entity types as a JSON bundle
// Query params:
//   entities — comma-separated list (default: all)
//   Supported: tasks, notes, goals, meetings, people, portfolio, ideas,
//              habits, journal, dns, fishbone, contacts, companies, deals
exportImportRouter.get("/export/json", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();

  const SUPPORTED = [
    "tasks",
    "notes",
    "goals",
    "meetings",
    "people",
    "portfolio",
    "ideas",
    "habits",
    "journal",
    "dns",
    "fishbone",
    "contacts",
    "companies",
    "deals",
  ] as const;

  type EntityKey = (typeof SUPPORTED)[number];

  const rawEntities = c.req.query("entities");
  const requested: EntityKey[] = rawEntities
    ? (rawEntities.split(",").map((s) => s.trim()).filter((s) =>
      SUPPORTED.includes(s as EntityKey)
    ) as EntityKey[])
    : [...SUPPORTED];

  if (requested.length === 0) {
    return errorResponse(
      "No valid entity types specified. Supported: " + SUPPORTED.join(", "),
      400,
    );
  }

  const entityFetchers: Record<EntityKey, () => Promise<unknown>> = {
    tasks: () => parser.readTasks(),
    notes: () => parser.readNotes(),
    goals: () => parser.readGoals(),
    meetings: () => parser.readMeetings(),
    people: () => parser.readPeople(),
    portfolio: () => parser.readPortfolioItems(),
    ideas: () => parser.readIdeas(),
    habits: () => parser.readHabits(),
    journal: () => parser.readJournalEntries(),
    dns: () => parser.readDnsDomains(),
    fishbone: () => parser.readFishbones(),
    contacts: () => parser.readContacts(),
    companies: () => parser.readCompanies(),
    deals: () => parser.readDeals(),
  };

  const results = await Promise.all(
    requested.map(async (key) => {
      const data = await entityFetchers[key]();
      return [key, data] as [EntityKey, unknown];
    }),
  );

  const bundle: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    projectName: projectInfo.name,
    entities: Object.fromEntries(results),
  };

  const filename = `${
    (projectInfo.name || "project").replace(/\s+/g, "-").toLowerCase()
  }-export-${new Date().toISOString().split("T")[0]}.json`;

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// GET /export/md - export one or more entity types as a Markdown document
// Query params:
//   entities — comma-separated list (default: all)
//   Supported: tasks, notes, goals, meetings, people, portfolio, ideas,
//              habits, journal, dns, fishbone, contacts, companies, deals
exportImportRouter.get("/export/md", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();

  const SUPPORTED = [
    "tasks",
    "notes",
    "goals",
    "meetings",
    "people",
    "portfolio",
    "ideas",
    "habits",
    "journal",
    "dns",
    "fishbone",
    "contacts",
    "companies",
    "deals",
  ] as const;

  type EntityKey = (typeof SUPPORTED)[number];

  const rawEntities = c.req.query("entities");
  const requested: EntityKey[] = rawEntities
    ? (rawEntities.split(",").map((s) => s.trim()).filter((s) =>
      SUPPORTED.includes(s as EntityKey)
    ) as EntityKey[])
    : [...SUPPORTED];

  if (requested.length === 0) {
    return errorResponse(
      "No valid entity types specified. Supported: " + SUPPORTED.join(", "),
      400,
    );
  }

  const sections: string[] = [];
  sections.push(
    `# ${projectInfo.name ?? "Project"} — Export\n\n_Generated: ${
      new Date().toISOString()
    }_\n`,
  );

  const fetch: Record<EntityKey, () => Promise<string>> = {
    tasks: async () =>
      mdSection("Tasks", convertTasksToMarkdown(await parser.readTasks())),
    notes: async () =>
      mdSection("Notes", convertNotesToMarkdown(await parser.readNotes())),
    goals: async () =>
      mdSection("Goals", convertGoalsToMarkdown(await parser.readGoals())),
    meetings: async () =>
      mdSection(
        "Meetings",
        convertMeetingsToMarkdown(await parser.readMeetings()),
      ),
    people: async () =>
      mdSection("People", convertPeopleToMarkdown(await parser.readPeople())),
    portfolio: async () =>
      mdSection(
        "Portfolio",
        convertPortfolioToMarkdown(await parser.readPortfolioItems()),
      ),
    ideas: async () =>
      mdSection("Ideas", convertIdeasToMarkdown(await parser.readIdeas())),
    habits: async () =>
      mdSection("Habits", convertHabitsToMarkdown(await parser.readHabits())),
    journal: async () =>
      mdSection(
        "Journal",
        convertJournalToMarkdown(await parser.readJournalEntries()),
      ),
    dns: async () =>
      mdSection("DNS", convertDnsToMarkdown(await parser.readDnsDomains())),
    fishbone: async () =>
      mdSection(
        "Fishbone Diagrams",
        convertFishbonesToMarkdown(await parser.readFishbones()),
      ),
    contacts: async () =>
      mdSection(
        "Contacts",
        convertContactsToMarkdown(await parser.readContacts()),
      ),
    companies: async () =>
      mdSection(
        "Companies",
        convertCompaniesToMarkdown(await parser.readCompanies()),
      ),
    deals: async () =>
      mdSection("Deals", convertDealsToMarkdown(await parser.readDeals())),
  };

  for (const key of requested) {
    sections.push(await fetch[key]());
  }

  const content = sections.join("\n");
  const filename = `${
    (projectInfo.name ?? "project").replace(/\s+/g, "-").toLowerCase()
  }-export-${new Date().toISOString().split("T")[0]}.md`;

  return new Response(content, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// GET /export/pdf/report - export project report as HTML (for PDF printing)
exportImportRouter.get("/export/pdf/report", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  const tasks = await parser.readTasks();
  const config = await parser.readProjectConfig();

  const html = generateProjectReportHTML(projectInfo, tasks, config);

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html",
      "Content-Disposition": "inline; filename=project-report.html",
    },
  });
});
