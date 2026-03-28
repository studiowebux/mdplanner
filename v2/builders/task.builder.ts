// Task builder — constructs a flat Task from raw frontmatter + body.
// Validates and normalizes fields. Keeps parsing logic out of the repository.

import type { ApprovalVerdict, Task } from "../types/task.types.ts";

export class TaskBuilder {
  private task: Partial<Task> = {};

  static from(
    frontmatter: Record<string, unknown>,
    body: string,
    section: string,
  ): TaskBuilder {
    return new TaskBuilder().applyFrontmatter(frontmatter).applyBody(
      body,
      section,
    );
  }

  applyFrontmatter(fm: Record<string, unknown>): this {
    if (!fm.id) return this;
    this.task.id = String(fm.id);
    this.task.completed = fm.completed === true;
    this.task.revision = typeof fm.revision === "number" ? fm.revision : 1;

    this.str(fm, "completedAt");
    this.str(fm, "createdAt");
    this.str(fm, "updatedAt");
    this.str(fm, "due_date");
    this.str(fm, "assignee");
    this.str(fm, "milestone");
    this.str(fm, "planned_start");
    this.str(fm, "planned_end");
    this.str(fm, "project");
    this.str(fm, "githubRepo");
    this.str(fm, "claimedBy");
    this.str(fm, "claimedAt");

    this.num(fm, "priority");
    this.num(fm, "effort");
    this.num(fm, "order");
    this.num(fm, "githubIssue");
    this.num(fm, "githubPR");

    this.strArray(fm, "tags");
    this.strArray(fm, "blocked_by");
    this.strArray(fm, "attachments");
    this.strArray(fm, "files");

    if (Array.isArray(fm.time_entries)) {
      this.task.time_entries = fm.time_entries.map((e: unknown) => {
        const entry = e as Record<string, unknown>;
        return {
          id: String(entry.id ?? ""),
          date: String(entry.date ?? ""),
          hours: Number(entry.hours ?? 0),
          ...(entry.person != null && { person: String(entry.person) }),
          ...(entry.description != null && {
            description: String(entry.description),
          }),
        };
      });
    }

    if (fm.approvalRequest != null && typeof fm.approvalRequest === "object") {
      const ar = fm.approvalRequest as Record<string, unknown>;
      this.task.approvalRequest = {
        id: String(ar.id ?? ""),
        requestedAt: String(ar.requestedAt ?? ""),
        requestedBy: String(ar.requestedBy ?? ""),
        summary: String(ar.summary ?? ""),
        ...(ar.commitHash != null && { commitHash: String(ar.commitHash) }),
        ...(Array.isArray(ar.artifactUrls) &&
          { artifactUrls: ar.artifactUrls.map(String) }),
        ...(ar.verdict != null && typeof ar.verdict === "object" &&
          { verdict: ar.verdict as ApprovalVerdict }),
      };
    }

    if (Array.isArray(fm.comments)) {
      this.task.comments = fm.comments.map((c: unknown) => {
        const comment = c as Record<string, unknown>;
        return {
          id: String(comment.id ?? ""),
          timestamp: String(comment.timestamp ?? ""),
          body: String(comment.body ?? ""),
          ...(comment.author != null && { author: String(comment.author) }),
          ...(comment.metadata != null && {
            metadata: comment.metadata as Record<string, unknown>,
          }),
        };
      });
    }

    return this;
  }

  applyBody(body: string, section: string): this {
    this.task.section = section;

    const lines = body.split("\n");

    // Title from first # heading
    const titleMatch = lines.findIndex((l) => /^#\s+/.test(l));
    if (titleMatch >= 0) {
      this.task.title = lines[titleMatch].replace(/^#\s+/, "").trim();
    } else {
      this.task.title = this.task.id ?? "Untitled";
    }

    // Description: lines after title, before ## Subtasks
    const subtaskIdx = lines.findIndex((l) => /^##\s+Subtasks?\s*$/i.test(l));
    const descStart = titleMatch >= 0 ? titleMatch + 1 : 0;
    const descEnd = subtaskIdx >= 0 ? subtaskIdx : lines.length;
    const desc = lines.slice(descStart, descEnd).filter((l) => l.trim() !== "");
    if (desc.length > 0) this.task.description = desc;

    // Subtasks: - [x] (id) title
    if (subtaskIdx >= 0) {
      const children: Task[] = [];
      for (let i = subtaskIdx + 1; i < lines.length; i++) {
        const m = lines[i].match(/^-\s+\[([ x])\]\s+\(([^)]+)\)\s+(.+)/);
        if (m) {
          children.push({
            id: m[2],
            title: m[3].trim(),
            completed: m[1] === "x",
            section,
            revision: 1,
            parentId: this.task.id,
          });
        }
      }
      if (children.length > 0) this.task.children = children;
    }

    return this;
  }

  build(): Task | null {
    if (!this.task.id) return null;
    return this.task as Task;
  }

  // --- private helpers ---

  private str<K extends keyof Task>(fm: Record<string, unknown>, key: K): void {
    if (fm[key as string] != null) {
      (this.task as Partial<Task>)[key] = String(fm[key as string]) as Task[K];
    }
  }

  private num<K extends keyof Task>(fm: Record<string, unknown>, key: K): void {
    if (typeof fm[key as string] === "number") {
      (this.task as Partial<Task>)[key] = fm[key as string] as Task[K];
    }
  }

  private strArray<K extends keyof Task>(
    fm: Record<string, unknown>,
    key: K,
  ): void {
    if (Array.isArray(fm[key as string])) {
      (this.task as Partial<Task>)[key] = (fm[key as string] as unknown[]).map(
        String,
      ) as Task[K];
    }
  }
}
