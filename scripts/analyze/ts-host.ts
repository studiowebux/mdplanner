/**
 * scripts/analyze/ts-host.ts
 *
 * Builds one in-process `ts.LanguageService` over the analyzed TypeScript files
 * so the dead-code pass can run real cross-file `findReferences` — the "did
 * anything actually import this?" question that no regex can answer. This is
 * the deliberate alternative to driving an external Deno LSP over JSON-RPC: no
 * subprocess, no startup race, deterministic.
 *
 * The host is fed from the already-walked file set (in-memory snapshots, no
 * extra disk reads). Relative `./x.ts` imports resolve under moduleResolution
 * Bundler + allowImportingTsExtensions; `npm:`/`jsr:`/`https:` specifiers stay
 * unresolved (external — irrelevant to internal reference counting).
 */
import ts from "typescript";

export interface TsFile {
  path: string; // absolute path (module-resolution + reference identity key)
  rel: string;
  text: string;
  isTest: boolean;
}

const COMPILER_OPTIONS: ts.CompilerOptions = {
  allowImportingTsExtensions: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  jsx: ts.JsxEmit.Preserve,
  noEmit: true,
  skipLibCheck: true,
};

/**
 * Create a LanguageService over the `.ts`/`.tsx` files (tests included, so
 * test-only usage is detectable). Returns the service + the TS files it covers.
 */
export function createService(
  files: TsFile[],
): { service: ts.LanguageService; tsFiles: TsFile[] } {
  const tsFiles = files.filter(
    (f) => f.path.endsWith(".ts") || f.path.endsWith(".tsx"),
  );
  const snapshots = new Map(tsFiles.map((f) => [f.path, f.text]));
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [...snapshots.keys()],
    getScriptVersion: () => "1",
    getScriptSnapshot: (f) => {
      const text = snapshots.get(f);
      return text === undefined
        ? undefined
        : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => Deno.cwd(),
    getCompilationSettings: () => COMPILER_OPTIONS,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => snapshots.has(f),
    readFile: (f) => snapshots.get(f),
  };
  return {
    service: ts.createLanguageService(host, ts.createDocumentRegistry()),
    tsFiles,
  };
}
