/**
 * Zod schemas for brain management entities.
 * Brains are Claude Code brain directories — not part of the parser/cache layer.
 */

import { z } from "zod";

export const BrainSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  isCore: z.boolean().default(false),
  stacks: z.array(z.string()).default([]),
  practices: z.array(z.string()).default([]),
  workflows: z.array(z.string()).default([]),
});

export type Brain = z.infer<typeof BrainSchema>;

export const BrainInfoSchema = BrainSchema.extend({
  lastActive: z.string().nullable().optional(),
});

export type BrainInfo = z.infer<typeof BrainInfoSchema>;

export const RegisterBrainSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  isCore: z.boolean().default(false),
  stacks: z.array(z.string()).default([]),
  practices: z.array(z.string()).default([]),
  workflows: z.array(z.string()).default([]),
});

export type RegisterBrain = z.infer<typeof RegisterBrainSchema>;

export const UpdateBrainSchema = z.object({
  name: z.string().min(1).optional(),
  isCore: z.boolean().optional(),
  stacks: z.array(z.string()).optional(),
  practices: z.array(z.string()).optional(),
  workflows: z.array(z.string()).optional(),
});

export type UpdateBrain = z.infer<typeof UpdateBrainSchema>;

export const SetupRequestSchema = z.object({
  parentDir: z.string().min(1),
  codeRepoPath: z.string().default(""),
  stacks: z.array(z.string()).default([]),
  practices: z.array(z.string()).default([]),
  workflows: z.array(z.string()).default([]),
});

export type SetupRequest = z.infer<typeof SetupRequestSchema>;

export const SyncApplySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  files: z.array(z.string()).min(1),
});

export type SyncApply = z.infer<typeof SyncApplySchema>;

export const RegistryFileSchema = z.object({
  brains: z.array(BrainSchema).default([]),
});

export type RegistryFile = z.infer<typeof RegistryFileSchema>;
