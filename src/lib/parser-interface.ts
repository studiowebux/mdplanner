/**
 * Parser type that works with both single-file and directory-based parsers.
 * Uses a union type approach since both parsers have compatible method signatures.
 */

import { MarkdownParser } from "./markdown-parser.ts";
import { DirectoryMarkdownParser } from "./parser/directory/parser.ts";

/**
 * Parser type that can be either a single-file or directory-based parser.
 * Both parsers implement the same public interface.
 */
export type Parser = MarkdownParser | DirectoryMarkdownParser;

/**
 * Check if a path is a directory-based project.
 * Directory projects have a project.md file in the root.
 */
export async function isDirectoryProject(path: string): Promise<boolean> {
  return DirectoryMarkdownParser.isDirectoryProject(path);
}

/**
 * Create the appropriate parser for a given path.
 * Auto-detects whether it's a single-file or directory-based project.
 */
export async function createParser(path: string): Promise<Parser> {
  const isDir = await isDirectoryProject(path);
  if (isDir) {
    return new DirectoryMarkdownParser(path);
  }
  return new MarkdownParser(path);
}
