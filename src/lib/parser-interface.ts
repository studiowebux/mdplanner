/**
 * Parser interface - simplified for directory-based projects only.
 */

import { DirectoryMarkdownParser } from "./parser/directory/parser.ts";

/**
 * Parser type alias for DirectoryMarkdownParser.
 * Kept for backward compatibility with existing imports.
 */
export type Parser = DirectoryMarkdownParser;

/**
 * Check if a path is a directory-based project.
 * Directory projects have a project.md file in the root.
 */
export async function isDirectoryProject(path: string): Promise<boolean> {
  return DirectoryMarkdownParser.isDirectoryProject(path);
}

/**
 * Create a parser for a directory-based project.
 */
export function createParser(path: string): DirectoryMarkdownParser {
  return new DirectoryMarkdownParser(path);
}
