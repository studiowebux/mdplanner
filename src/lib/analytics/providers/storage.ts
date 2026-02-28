/**
 * Upload storage statistics provider.
 * Walks the uploads/ directory tree to sum file sizes and count files.
 * Returns zero values when the directory does not exist.
 */

export interface StorageStats {
  totalBytes: number;
  formatted: string; // e.g. "10.5 MB"
  fileCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

async function walkDir(
  dirPath: string,
  onFile: (size: number) => void,
): Promise<void> {
  let entries: Deno.DirEntry[];
  try {
    entries = [];
    for await (const entry of Deno.readDir(dirPath)) {
      entries.push(entry);
    }
  } catch {
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = `${dirPath}/${entry.name}`;
      if (entry.isFile) {
        try {
          const stat = await Deno.stat(fullPath);
          onFile(stat.size);
        } catch {
          // file removed between readDir and stat — ignore
        }
      } else if (entry.isDirectory) {
        await walkDir(fullPath, onFile);
      }
    }),
  );
}

export async function collectStorageStats(
  projectDir: string,
): Promise<StorageStats> {
  const uploadsDir = `${projectDir}/uploads`;
  let totalBytes = 0;
  let fileCount = 0;

  await walkDir(uploadsDir, (size) => {
    totalBytes += size;
    fileCount++;
  });

  return { totalBytes, formatted: formatBytes(totalBytes), fileCount };
}
