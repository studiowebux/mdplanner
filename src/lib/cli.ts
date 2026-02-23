/** Shared CLI utilities used by both the HTTP server and MCP server entry points. */

/**
 * Validates that `path` exists, is a directory, and contains a project.md file.
 * Exits with code 1 on any failure.
 */
export async function validateProjectPath(path: string): Promise<void> {
  try {
    const stat = await Deno.stat(path);
    if (!stat.isDirectory) {
      console.error(`Error: '${path}' is not a directory`);
      Deno.exit(1);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: Directory '${path}' does not exist`);
      Deno.exit(1);
    }
    throw error;
  }

  try {
    await Deno.stat(`${path}/project.md`);
  } catch {
    console.error(`Error: '${path}' does not contain a project.md file`);
    console.error("Create a project.md file to initialize the project.");
    Deno.exit(1);
  }
}
