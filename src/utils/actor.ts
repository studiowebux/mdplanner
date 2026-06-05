// Actor-to-userId resolution helpers for per-user data scoping.
//
// Per-user scoping inside domains (habits, future per-user data) needs a
// stable string identifier for the acting principal. The identity middleware
// resolves Actor { name, id?, source }. Cookie identities carry id; API keys
// carry only name; anonymous is neither.
//
// A UserScope pairs the resolved userId with isDefault — whether this user is
// the project's configured default. Legacy data that pre-dates per-user
// scoping (e.g. untagged habit completions with no userId) is owned by the
// default user, so isDefault gates whether such rows are visible/mutable.

import type { Actor } from "../types/actor.ts";
import type { AppContext } from "../types/app.ts";
import { getPeopleService, getProjectService } from "../singletons/services.ts";

const LEGACY_BUCKET = "_legacy";

/** Resolved scope for per-user data access. */
export type UserScope = {
  /** Stable identifier of the acting user. */
  userId: string;
  /** True when this user owns legacy (untagged) rows. */
  isDefault: boolean;
};

/** Stable identifier for an actor: id when set, else name. */
function actorUserId(actor: Actor): string {
  return actor.id ?? actor.name;
}

/**
 * Resolve the project's default user id — the bucket that owns legacy data
 * and that automation falls back to when no explicit actor is supplied.
 *
 * Resolution:
 *   1. project.md `default_user_id` if set
 *   2. first person record by name (ascending) if any exist
 *   3. terminal fallback to "_legacy" (no legitimate actor can match)
 */
export async function getDefaultUserId(): Promise<string> {
  const config = await getProjectService().getConfig();
  if (config.defaultUserId) return config.defaultUserId;

  const people = await getPeopleService().list();
  if (people.length > 0) {
    const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
    return sorted[0].id;
  }

  return LEGACY_BUCKET;
}

/**
 * Resolve the scope for the current request. Anonymous actors fall back to
 * the project's default user; non-anonymous actors use their own identifier.
 */
export async function resolveUserScope(c: AppContext): Promise<UserScope> {
  const defaultUserId = await getDefaultUserId();
  const actor = c.get("actor");
  const userId = (!actor || actor.source === "anonymous")
    ? defaultUserId
    : actorUserId(actor);
  return { userId, isDefault: userId === defaultUserId };
}

/**
 * Scope for automation paths without an actor (MCP tools, analytics aggregates
 * with no request context). Resolves to the default user, which owns legacy
 * untagged data.
 */
export async function defaultScope(): Promise<UserScope> {
  const userId = await getDefaultUserId();
  return { userId, isDefault: true };
}

/**
 * Scope for an explicit user id (e.g. an MCP tool that names the user). The
 * isDefault flag is computed against the project default so the named user
 * also sees legacy untagged data when they are the default.
 */
export async function scopeForUserId(userId: string): Promise<UserScope> {
  const defaultUserId = await getDefaultUserId();
  return { userId, isDefault: userId === defaultUserId };
}
