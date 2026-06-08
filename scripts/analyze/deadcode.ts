/**
 * scripts/analyze/deadcode.ts
 *
 * Cross-file dead-export detection: an exported symbol whose only reference is
 * its own declaration is dead; one referenced solely from test files is
 * test-only. These are the un-migrated v1->v2 leftovers regex sweeps cannot
 * see. Uses the in-process LanguageService (ts-host.ts) findReferences.
 *
 * NOT auto-actionable: dynamic registration (view registry, MCP tool wiring,
 * route mounting) and string-keyed lookups can make a live export look dead.
 * Results are CANDIDATES — confirm by reading before deleting. Entry points
 * (`bin*.ts`) and barrel re-exports (`mod.ts`) are excluded: their exports are
 * the public surface by definition.
 */
import ts from "typescript";
import { createService, type TsFile } from "./ts-host.ts";

export interface DeadExport {
  rel: string;
  name: string;
  line: number;
  testOnly: boolean; // referenced only from test files (softer signal than dead)
}

// Files whose exports are a public surface, not dead-code candidates.
const PUBLIC_SURFACE = /(^|[\/\\])(bin|bin-mcp|mod)\.tsx?$/;
const TEST_PATH = /(_test\.|\.test\.|[\/\\]tests?[\/\\])/;

/** Exported declaration names + the position to query references from. */
function* exportedSymbols(
  sf: ts.SourceFile,
): Generator<{ name: string; pos: number }> {
  for (const st of sf.statements) {
    const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined;
    const exported = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (exported) {
      if (
        (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) ||
          ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) ||
          ts.isEnumDeclaration(st)) && st.name
      ) {
        yield { name: st.name.text, pos: st.name.getStart(sf) };
      } else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name)) {
            yield { name: d.name.text, pos: d.name.getStart(sf) };
          }
        }
      }
    }
    // `export { a, b }` (with or without `from`).
    if (
      ts.isExportDeclaration(st) && st.exportClause &&
      ts.isNamedExports(st.exportClause)
    ) {
      for (const el of st.exportClause.elements) {
        yield { name: el.name.text, pos: el.name.getStart(sf) };
      }
    }
  }
}

export function analyzeDeadCode(files: TsFile[]): DeadExport[] {
  const { service, tsFiles } = createService(files);
  const program = service.getProgram();
  if (!program) return [];

  const out: DeadExport[] = [];
  for (const f of tsFiles) {
    if (f.isTest || PUBLIC_SURFACE.test(f.rel)) continue;
    const sf = program.getSourceFile(f.path);
    if (!sf) continue;

    for (const { name, pos } of exportedSymbols(sf)) {
      const refs = service.findReferences(f.path, pos) ?? [];
      const nonDecl = refs
        .flatMap((r) => r.references)
        .filter((r) => !r.isDefinition);

      if (nonDecl.length === 0) {
        out.push({ rel: f.rel, name, line: lineOf(sf, pos), testOnly: false });
        continue;
      }
      // Live within its own file is fine (not exported-but-dead). Flag only when
      // every external reference comes from a test file.
      const externalFiles = new Set(
        nonDecl.map((r) => r.fileName).filter((fn) => fn !== f.path),
      );
      if (
        externalFiles.size > 0 &&
        [...externalFiles].every((fn) => TEST_PATH.test(fn))
      ) {
        out.push({ rel: f.rel, name, line: lineOf(sf, pos), testOnly: true });
      }
    }
  }
  // Dead first, then test-only; largest signal at the top.
  return out.sort((a, b) => Number(a.testOnly) - Number(b.testOnly));
}

function lineOf(sf: ts.SourceFile, pos: number): number {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}
