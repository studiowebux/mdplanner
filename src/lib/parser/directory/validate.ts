/**
 * Directory Structure Validation
 * Verifies integrity of directory-based project structure.
 */

import { join } from "@std/path";
import { exists } from "@std/fs";
import { parseFrontmatter } from "./frontmatter.ts";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: ValidationStats;
}

export interface ValidationError {
  type: "missing_file" | "invalid_frontmatter" | "missing_id" | "duplicate_id" | "invalid_structure";
  path: string;
  message: string;
}

export interface ValidationWarning {
  type: "empty_directory" | "orphaned_file" | "missing_optional";
  path: string;
  message: string;
}

export interface ValidationStats {
  directories: number;
  files: number;
  sections: Record<string, number>;
}

// Expected subdirectories for a valid project
const EXPECTED_DIRECTORIES = [
  "board",
  "notes",
  "goals",
  "milestones",
  "ideas",
  "retrospectives",
  "canvas",
  "mindmaps",
  "c4",
  "swot",
  "risk",
  "leancanvas",
  "businessmodel",
  "projectvalue",
  "brief",
  "capacity",
  "strategiclevels",
  "billing",
  "crm",
] as const;

// Optional directories
const OPTIONAL_DIRECTORIES = [
  "portfolio",
  "timetracking",
] as const;

// Nested structure for billing and crm
const NESTED_DIRECTORIES: Record<string, string[]> = {
  billing: ["customers", "rates", "quotes", "invoices", "payments"],
  crm: ["companies", "contacts", "deals", "interactions"],
  board: [], // Dynamic based on sections
};

/**
 * Validate a directory-based project structure
 */
export async function validateProjectDirectory(projectDir: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const stats: ValidationStats = {
    directories: 0,
    files: 0,
    sections: {},
  };

  // Check project.md exists
  const projectFile = join(projectDir, "project.md");
  if (!await exists(projectFile)) {
    errors.push({
      type: "missing_file",
      path: projectFile,
      message: "Required file project.md not found",
    });
  } else {
    stats.files++;
    // Validate project.md frontmatter
    try {
      const content = await Deno.readTextFile(projectFile);
      const { frontmatter } = parseFrontmatter(content);
      if (!frontmatter.name) {
        warnings.push({
          type: "missing_optional",
          path: projectFile,
          message: "Project name not specified in frontmatter",
        });
      }
    } catch (e) {
      errors.push({
        type: "invalid_frontmatter",
        path: projectFile,
        message: `Invalid frontmatter: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // Check expected directories
  for (const dir of EXPECTED_DIRECTORIES) {
    const dirPath = join(projectDir, dir);
    if (!await exists(dirPath)) {
      // Not an error, directories are created on demand
      warnings.push({
        type: "missing_optional",
        path: dirPath,
        message: `Directory ${dir}/ not found (will be created on first use)`,
      });
    } else {
      stats.directories++;
      // Validate files in directory
      const dirStats = await validateDirectory(dirPath, dir, errors, warnings);
      stats.files += dirStats.files;
      stats.sections[dir] = dirStats.files;

      // Check nested directories
      if (NESTED_DIRECTORIES[dir]) {
        for (const nestedDir of NESTED_DIRECTORIES[dir]) {
          const nestedPath = join(dirPath, nestedDir);
          if (await exists(nestedPath)) {
            stats.directories++;
            const nestedStats = await validateDirectory(nestedPath, `${dir}/${nestedDir}`, errors, warnings);
            stats.files += nestedStats.files;
            stats.sections[`${dir}/${nestedDir}`] = nestedStats.files;
          }
        }
      }
    }
  }

  // Check optional directories
  for (const dir of OPTIONAL_DIRECTORIES) {
    const dirPath = join(projectDir, dir);
    if (await exists(dirPath)) {
      stats.directories++;
      const dirStats = await validateDirectory(dirPath, dir, errors, warnings);
      stats.files += dirStats.files;
      stats.sections[dir] = dirStats.files;
    }
  }

  // Check for duplicate IDs across all files
  await checkDuplicateIds(projectDir, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * Validate files in a directory
 */
async function validateDirectory(
  dirPath: string,
  dirName: string,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): Promise<{ files: number }> {
  let fileCount = 0;

  try {
    for await (const entry of Deno.readDir(dirPath)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        fileCount++;
        const filePath = join(dirPath, entry.name);

        // Validate frontmatter
        try {
          const content = await Deno.readTextFile(filePath);
          const { frontmatter } = parseFrontmatter(content);

          if (!frontmatter.id) {
            errors.push({
              type: "missing_id",
              path: filePath,
              message: "Missing required 'id' field in frontmatter",
            });
          }
        } catch (e) {
          errors.push({
            type: "invalid_structure",
            path: filePath,
            message: `Failed to read file: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
    }

    if (fileCount === 0) {
      warnings.push({
        type: "empty_directory",
        path: dirPath,
        message: `Directory ${dirName}/ is empty`,
      });
    }
  } catch (e) {
    errors.push({
      type: "invalid_structure",
      path: dirPath,
      message: `Failed to read directory: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return { files: fileCount };
}

/**
 * Check for duplicate IDs across all markdown files
 */
async function checkDuplicateIds(
  projectDir: string,
  errors: ValidationError[],
): Promise<void> {
  const idMap = new Map<string, string[]>();

  async function scanDirectory(dir: string): Promise<void> {
    try {
      for await (const entry of Deno.readDir(dir)) {
        const entryPath = join(dir, entry.name);

        if (entry.isDirectory) {
          await scanDirectory(entryPath);
        } else if (entry.isFile && entry.name.endsWith(".md")) {
          try {
            const content = await Deno.readTextFile(entryPath);
            const { frontmatter } = parseFrontmatter(content);

            if (frontmatter.id) {
              const id = String(frontmatter.id);
              if (!idMap.has(id)) {
                idMap.set(id, []);
              }
              idMap.get(id)!.push(entryPath);
            }
          } catch {
            // Skip files that can't be parsed
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  await scanDirectory(projectDir);

  // Report duplicates
  for (const [id, paths] of idMap) {
    if (paths.length > 1) {
      errors.push({
        type: "duplicate_id",
        path: paths.join(", "),
        message: `Duplicate ID '${id}' found in ${paths.length} files`,
      });
    }
  }
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(`Validation ${result.valid ? "PASSED" : "FAILED"}`);
  lines.push("");

  // Stats
  lines.push("Statistics:");
  lines.push(`  Directories: ${result.stats.directories}`);
  lines.push(`  Files: ${result.stats.files}`);
  if (Object.keys(result.stats.sections).length > 0) {
    lines.push("  By section:");
    for (const [section, count] of Object.entries(result.stats.sections)) {
      lines.push(`    ${section}: ${count} files`);
    }
  }
  lines.push("");

  // Errors
  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      lines.push(`  [${error.type}] ${error.message}`);
      lines.push(`    Path: ${error.path}`);
    }
    lines.push("");
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      lines.push(`  [${warning.type}] ${warning.message}`);
    }
  }

  return lines.join("\n");
}
