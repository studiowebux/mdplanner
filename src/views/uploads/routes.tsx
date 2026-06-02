// Uploads management view routes — GET /uploads, DELETE /uploads/files/:taskId/:filename,
// DELETE /uploads/dangling

import { Hono } from "hono";
import { getProjectDir, getTaskService } from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";
import type { UploadedFile } from "../uploads.tsx";
import { UploadsView } from "../uploads.tsx";

export const uploadsRouter = new Hono<{ Variables: AppVariables }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function scanUploads(projectDir: string): Promise<
  { taskId: string; filename: string; sizeBytes: number; mtime: Date }[]
> {
  const uploadsDir = `${projectDir}/uploads`;
  const results: {
    taskId: string;
    filename: string;
    sizeBytes: number;
    mtime: Date;
  }[] = [];

  const taskDirs: Deno.DirEntry[] = [];
  try {
    for await (const entry of Deno.readDir(uploadsDir)) {
      if (entry.isDirectory) taskDirs.push(entry);
    }
  } catch {
    return results;
  }

  for (const taskDir of taskDirs) {
    const taskId = taskDir.name;
    const taskPath = `${uploadsDir}/${taskId}`;
    try {
      for await (const fileEntry of Deno.readDir(taskPath)) {
        if (!fileEntry.isFile) continue;
        const filePath = `${taskPath}/${fileEntry.name}`;
        try {
          const stat = await Deno.stat(filePath);
          results.push({
            taskId,
            filename: fileEntry.name,
            sizeBytes: stat.size,
            mtime: stat.mtime ?? new Date(0),
          });
        } catch {
          // skip unreadable files
        }
      }
    } catch {
      // skip unreadable task dirs
    }
  }

  return results;
}

async function buildFileList(projectDir: string): Promise<UploadedFile[]> {
  const rawFiles = await scanUploads(projectDir);
  if (rawFiles.length === 0) return [];

  // Gather all tasks that have attachments — one list call is cheaper than N gets
  const allTasks = await getTaskService().list();
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));

  // Build a set of all known attachment paths
  const knownPaths = new Set<string>();
  for (const task of allTasks) {
    for (const a of task.attachments ?? []) {
      knownPaths.add(a);
    }
  }

  return rawFiles.map((f) => {
    const relPath = `uploads/${f.taskId}/${f.filename}`;
    const task = taskMap.get(f.taskId);
    const isDangling = !knownPaths.has(relPath);
    return {
      taskId: f.taskId,
      taskTitle: task?.title ?? f.taskId,
      filename: f.filename,
      relPath,
      sizeBytes: f.sizeBytes,
      mtime: f.mtime,
      isDangling,
    };
  });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

uploadsRouter.get("/", async (c) => {
  const projectDir = getProjectDir();
  const files = await buildFileList(projectDir);

  const totalBytes = files.reduce((s, f) => s + f.sizeBytes, 0);
  const taskCount = new Set(files.map((f) => f.taskId)).size;
  const danglingCount = files.filter((f) => f.isDangling).length;

  const rawFilter = c.req.query("filter");
  const filter: "all" | "dangling" = rawFilter === "dangling"
    ? "dangling"
    : "all";

  return c.html(
    <UploadsView
      {...viewProps(c, "/uploads")}
      files={files}
      totalBytes={totalBytes}
      taskCount={taskCount}
      danglingCount={danglingCount}
      filter={filter}
    />,
  );
});

// DELETE /uploads/files/:taskId/:filename — delete a single file
uploadsRouter.delete("/files/:taskId/:filename", async (c) => {
  const taskId = c.req.param("taskId");
  const filename = c.req.param("filename").replace(/[^a-zA-Z0-9._-]/g, "_");
  const projectDir = getProjectDir();
  const filePath = `${projectDir}/uploads/${taskId}/${filename}`;

  try {
    await Deno.remove(filePath);
  } catch {
    return c.html("", 404);
  }

  // Remove from task attachments if referenced
  const relPath = `uploads/${taskId}/${filename}`;
  const task = await getTaskService().getById(taskId);
  if (task) {
    const remaining = (task.attachments ?? []).filter((a: string) =>
      a !== relPath
    );
    await getTaskService().update(taskId, { attachments: remaining });
  }

  // Return empty string — hx-swap="outerHTML" removes the row
  return c.html("");
});

// DELETE /uploads/dangling — delete all dangling files
uploadsRouter.delete("/dangling", async (c) => {
  const projectDir = getProjectDir();
  const files = await buildFileList(projectDir);
  const dangling = files.filter((f) => f.isDangling);

  await Promise.all(
    dangling.map(async (f) => {
      try {
        await Deno.remove(`${projectDir}/${f.relPath}`);
      } catch {
        // ignore missing
      }
    }),
  );

  // Return empty tbody content
  return c.html(
    <tr>
      <td colspan={6} class="uploads__empty-cell">
        All dangling files deleted.
      </td>
    </tr>,
  );
});
