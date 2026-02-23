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
import { Task } from "../../lib/types.ts";

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
      escapeCSV(task.config.tag?.join(", ") || ""),
      escapeCSV(task.config.blocked_by?.join(", ") || ""),
      escapeCSV(task.config.milestone || ""),
      escapeCSV(task.description?.join(" ") || ""),
      escapeCSV(task.parentId || ""),
    ];
    csv += row.join(",") + "\n";
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

function parseTasksCSV(csvContent: string): Task[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const tasks: Array<Task & { parentId?: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= 4) {
      const task: Task & { parentId?: string } = {
        id: values[0] || `task_${Date.now()}_${i}`,
        title: values[1] || "",
        section: values[2] || "Backlog",
        completed: values[3]?.toUpperCase() === "TRUE",
        config: {
          priority: values[4] ? parseInt(values[4]) : undefined,
          assignee: values[5] || undefined,
          due_date: values[6] || undefined,
          effort: values[7] ? parseInt(values[7]) : undefined,
          tag: values[8]
            ? values[8].split(", ").filter((t) => t.trim())
            : undefined,
          blocked_by: values[9]
            ? values[9].split(", ").filter((t) => t.trim())
            : undefined,
          milestone: values[10] || undefined,
        },
        description: values[11] ? [values[11]] : undefined,
        parentId: values[12] || undefined,
      };

      tasks.push(task);
    }
  }

  return buildTaskHierarchy(tasks);
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

// Routes

// GET /export/csv/tasks - export tasks as CSV
exportImportRouter.get("/export/csv/tasks", async (c) => {
  const parser = getParser(c);
  const tasks = await parser.readTasks();
  const csv = convertTasksToCSV(tasks);
  return new Response(csv, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=tasks.csv",
    },
  });
});

// POST /import/csv/tasks - import tasks from CSV
exportImportRouter.post("/import/csv/tasks", async (c) => {
  const parser = getParser(c);
  const body = await c.req.text();
  const importedTasks = parseTasksCSV(body);
  const existingTasks = await parser.readTasks();

  const existingTitles = new Set(existingTasks.map((t) => t.title));
  const newTasks = importedTasks.filter((t) => !existingTitles.has(t.title));

  if (newTasks.length === 0) {
    return jsonResponse({
      success: true,
      imported: 0,
      message: "No new tasks to import (all tasks already exist)",
    });
  }

  // Add tasks using the parser's addTask method
  let importedCount = 0;
  for (const task of newTasks) {
    await parser.addTask(task);
    importedCount++;
  }

  await cacheWriteThrough(c, "tasks");
  return jsonResponse({ success: true, imported: importedCount });
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
