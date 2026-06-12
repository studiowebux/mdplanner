// Cerveau viewer types — read-only view of a Cerveau root (_configs_, _packages_,
// version.txt). Models the CURRENT layout: brains reference versioned packages,
// the registry indexes packages with files tagged by type. There is no global
// `_protocol_` dir and no `cerveau-package.json` manifest (the v1 shapes).

import { z } from "@hono/zod-openapi";

// A brain entry from _configs_/brains.json.
export const CerveauBrainSchema = z.object({
  name: z.string(),
  path: z.string(),
  codebase: z.string(),
  packages: z.array(z.string()),
}).openapi("CerveauBrain");

export type CerveauBrain = z.infer<typeof CerveauBrainSchema>;

// A single file declared by a package in the registry, tagged by its type
// (rules | hooks | skills | workflows | templates | claude).
export const CerveauPackageFileSchema = z.object({
  name: z.string(),
  type: z.string(),
  realFile: z.boolean().optional(),
}).openapi("CerveauPackageFile");

export type CerveauPackageFile = z.infer<typeof CerveauPackageFileSchema>;

// A package entry from _configs_/registry.json.
export const CerveauPackageSchema = z.object({
  name: z.string(),
  org: z.string(),
  version: z.string(),
  path: z.string(),
  description: z.string(),
  files: z.array(CerveauPackageFileSchema),
  tags: z.array(z.string()),
}).openapi("CerveauPackage");

export type CerveauPackage = z.infer<typeof CerveauPackageSchema>;

export const CerveauRegistrySchema = z.object({
  version: z.string(),
  packages: z.array(CerveauPackageSchema),
}).openapi("CerveauRegistry");

export type CerveauRegistry = z.infer<typeof CerveauRegistrySchema>;

// Protocol overview — package file names grouped by type, aggregated across the
// registry. Replaces the v1 global stacks/practices/workflows/hooks/skills/agents
// taxonomy, which assumed a single `_protocol_/.claude` dir.
export const CerveauProtocolOverviewSchema = z.record(
  z.string(),
  z.array(z.string()),
).openapi("CerveauProtocolOverview");

export type CerveauProtocolOverview = z.infer<
  typeof CerveauProtocolOverviewSchema
>;

// A filesystem entry within the cerveau tree (generic file browser).
export type CerveauFileEntry = {
  name: string;
  path: string;
  isDir: boolean;
  isSymlink: boolean;
  size?: number;
  children?: CerveauFileEntry[];
};

export const CerveauFileEntrySchema: z.ZodType<CerveauFileEntry> = z.object({
  name: z.string(),
  path: z.string(),
  isDir: z.boolean(),
  isSymlink: z.boolean(),
  size: z.number().optional(),
  children: z.array(z.lazy(() => CerveauFileEntrySchema)).optional(),
}).openapi("CerveauFileEntry");
