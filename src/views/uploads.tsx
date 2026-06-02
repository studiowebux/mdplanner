// Uploads management admin view — storage overview, all files, dangling file cleanup.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadedFile = {
  taskId: string;
  taskTitle: string;
  filename: string;
  relPath: string; // "uploads/<taskId>/<filename>"
  sizeBytes: number;
  mtime: Date;
  isDangling: boolean; // true if not in any task's attachments array
};

export type UploadsViewProps = ViewProps & {
  files: UploadedFile[];
  totalBytes: number;
  taskCount: number;
  danglingCount: number;
  filter: "all" | "dangling";
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ext(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SummaryCards: FC<
  Pick<UploadsViewProps, "files" | "totalBytes" | "taskCount" | "danglingCount">
> = ({ files, totalBytes, taskCount, danglingCount }) => (
  <div class="uploads__stat-grid">
    <div class="uploads__stat-card">
      <span class="uploads__stat-value">{files.length}</span>
      <span class="uploads__stat-label">Total files</span>
    </div>
    <div class="uploads__stat-card">
      <span class="uploads__stat-value">{formatBytes(totalBytes)}</span>
      <span class="uploads__stat-label">Total storage</span>
    </div>
    <div class="uploads__stat-card">
      <span class="uploads__stat-value">{taskCount}</span>
      <span class="uploads__stat-label">Tasks with files</span>
    </div>
    <div
      class={`uploads__stat-card${
        danglingCount > 0 ? " uploads__stat-card--warn" : ""
      }`}
    >
      <span class="uploads__stat-value">{danglingCount}</span>
      <span class="uploads__stat-label">Dangling files</span>
    </div>
  </div>
);

const FileRow: FC<{ file: UploadedFile }> = ({ file }) => (
  <tr class={`uploads__row${file.isDangling ? " uploads__row--dangling" : ""}`}>
    <td class="uploads__td uploads__td--name">
      <a
        href={`/api/v1/tasks/${file.taskId}/upload/${file.filename}`}
        class="uploads__file-link"
        download={file.filename}
      >
        {file.filename}
      </a>
      {file.isDangling && (
        <span class="badge uploads__badge--dangling">dangling</span>
      )}
    </td>
    <td class="uploads__td uploads__td--task">
      {file.isDangling
        ? <span class="uploads__no-task">{file.taskId}</span>
        : (
          <a href={`/tasks/${file.taskId}`} class="uploads__task-link">
            {file.taskTitle}
          </a>
        )}
    </td>
    <td class="uploads__td uploads__td--ext">
      <span class="badge">{ext(file.filename) || "—"}</span>
    </td>
    <td class="uploads__td uploads__td--size">{formatBytes(file.sizeBytes)}</td>
    <td class="uploads__td uploads__td--date">{formatDate(file.mtime)}</td>
    <td class="uploads__td uploads__td--actions">
      <button
        type="button"
        class="btn btn--danger btn--sm"
        hx-delete={`/uploads/files/${file.taskId}/${file.filename}`}
        hx-confirm={`Delete ${file.filename}?`}
        hx-target="closest tr"
        hx-swap="outerHTML swap:200ms"
      >
        Delete
      </button>
    </td>
  </tr>
);

const FilesTable: FC<{ files: UploadedFile[]; filter: "all" | "dangling" }> = (
  { files, filter },
) => {
  const shown = filter === "dangling"
    ? files.filter((f) => f.isDangling)
    : files;
  if (shown.length === 0) {
    return (
      <p class="uploads__empty">
        {filter === "dangling" ? "No dangling files." : "No uploads yet."}
      </p>
    );
  }
  return (
    <div class="uploads__table-wrap">
      <table class="data-table uploads__table">
        <thead>
          <tr class="data-table__th-row">
            <th class="data-table__th">Filename</th>
            <th class="data-table__th">Task</th>
            <th class="data-table__th">Type</th>
            <th class="data-table__th">Size</th>
            <th class="data-table__th">Uploaded</th>
            <th class="data-table__th">Actions</th>
          </tr>
        </thead>
        <tbody id="uploads-table-body">
          {shown.map((f) => <FileRow key={f.relPath} file={f} />)}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export const UploadsView: FC<UploadsViewProps> = (
  { files, totalBytes, taskCount, danglingCount, filter, ...viewProps },
) => {
  return (
    <MainLayout
      {...viewProps}
      activePath="/uploads"
      title="Uploads"
      styles={["/css/views/uploads.css"]}
    >
      <div class="uploads">
        <div class="uploads__header">
          <h1 class="uploads__title">Uploads</h1>
        </div>

        <SummaryCards
          files={files}
          totalBytes={totalBytes}
          taskCount={taskCount}
          danglingCount={danglingCount}
        />

        <div class="uploads__toolbar">
          <nav class="uploads__filter-tabs">
            <a
              href="/uploads"
              class={`uploads__filter-tab${
                filter === "all" ? " uploads__filter-tab--active" : ""
              }`}
            >
              All files ({files.length})
            </a>
            <a
              href="/uploads?filter=dangling"
              class={`uploads__filter-tab${
                filter === "dangling" ? " uploads__filter-tab--active" : ""
              }`}
            >
              Dangling ({danglingCount})
            </a>
          </nav>
          {danglingCount > 0 && filter === "dangling" && (
            <button
              type="button"
              class="btn btn--danger btn--sm"
              hx-delete="/uploads/dangling"
              hx-confirm={`Delete all ${danglingCount} dangling files?`}
              hx-target="#uploads-table-body"
              hx-swap="innerHTML"
            >
              Delete all dangling
            </button>
          )}
        </div>

        <FilesTable files={files} filter={filter} />
      </div>
    </MainLayout>
  );
};
