// Identity types — auth-ready shape for trust-based identity now,
// real verification later. Swap resolveActor() branches, nothing else changes.

export type ActorSource = "jwt" | "apikey" | "cookie" | "anonymous";

export type Actor = {
  name: string;
  id?: string;
  source: ActorSource;
};

export const ANONYMOUS_ACTOR: Actor = {
  name: "anonymous",
  source: "anonymous",
};
