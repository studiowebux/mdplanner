// Task workflow error types — thrown by TaskService, mapped to HTTP/MCP codes
// by the shared error middleware via each class's `code`.

/** Thrown on optimistic-lock failure: the task's revision changed since it was read. */
export class RevisionConflictError extends Error {
  readonly code = "REVISION_CONFLICT";
  constructor(id: string, expected: number, actual: number) {
    super(`Task ${id}: expected revision ${expected}, found ${actual}`);
    this.name = "RevisionConflictError";
  }
}

/** Thrown when claiming a task that is no longer in Todo (another agent claimed it first). */
export class ClaimConflictError extends Error {
  readonly code = "CLAIM_CONFLICT";
  constructor(id: string, currentSection: string) {
    super(`Task ${id} is in section '${currentSection}', expected 'Todo'`);
    this.name = "ClaimConflictError";
  }
}

/** Thrown when updating a task currently claimed by a different agent. */
export class ClaimGuardError extends Error {
  readonly code = "CLAIM_GUARD";
  constructor(id: string, claimedBy: string) {
    super(`Task ${id} is claimed by ${claimedBy} — cannot update`);
    this.name = "ClaimGuardError";
  }
}
