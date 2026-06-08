/**
 * scripts/analyze/ast.ts
 *
 * AST collectors for the codebase analyzer. Uses the in-process TypeScript
 * compiler (the same tsc Deno bundles) via `ts.createSourceFile` — a pure,
 * fast, per-file parse with NO type-checker and NO module resolution. This is
 * the layer that makes Complexity tell the truth: the old brace-tracker counted
 * a whole `(function(){…})()` classic-script IIFE as ONE function (cc 237 for a
 * 1000-line canvas file), hiding every real function inside. Parsing the AST
 * lets us score each real function — declarations, expressions, arrows, methods,
 * accessors — separately, in `.ts`/`.tsx`/`.js` alike.
 *
 * `typescript` is mapped in deno.json (project convention forbids bare `npm:`
 * specifiers — no-import-prefix lint rule). Its node-compat shim reads `TSC_*`
 * env vars at module init, so any task loading this module needs `--allow-env`
 * (the `analyze` task carries it).
 */
import ts from "typescript";

export interface FnComplexity {
  rel: string;
  name: string;
  line: number; // 1-based start line of the function
  cc: number; // McCabe cyclomatic: 1 + decision points in the function body
  loc: number; // line span of the function
}

/** Function-like nodes that get their own complexity score. */
function isFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

// Decision nodes that each add 1 to cyclomatic complexity. Logical operators
// (&&, ||, ??) and the ternary add a branch; switch CASE clauses add one each
// (the default clause does not branch).
function isDecisionNode(n: ts.Node): boolean {
  switch (n.kind) {
    case ts.SyntaxKind.IfStatement:
    case ts.SyntaxKind.ForStatement:
    case ts.SyntaxKind.ForInStatement:
    case ts.SyntaxKind.ForOfStatement:
    case ts.SyntaxKind.WhileStatement:
    case ts.SyntaxKind.DoStatement:
    case ts.SyntaxKind.CaseClause:
    case ts.SyntaxKind.CatchClause:
    case ts.SyntaxKind.ConditionalExpression:
      return true;
    case ts.SyntaxKind.BinaryExpression: {
      const op = (n as ts.BinaryExpression).operatorToken.kind;
      return (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      );
    }
    default:
      return false;
  }
}

/**
 * Count decision points reachable from `root` (a function body) WITHOUT
 * descending into nested functions — each nested function is scored on its own,
 * so its decisions must not inflate the parent.
 */
function countDecisions(root: ts.Node): number {
  let count = 0;
  const visit = (n: ts.Node): void => {
    if (n !== root && isFunctionLike(n)) return; // nested fn → scored separately
    if (isDecisionNode(n)) count++;
    ts.forEachChild(n, visit);
  };
  visit(root);
  return count;
}

/** Best-effort readable name for a function-like node. */
function fnName(n: ts.Node, sf: ts.SourceFile): string {
  const named = n as ts.NamedDeclaration;
  if (named.name && ts.isIdentifier(named.name)) return named.name.text;
  if (ts.isConstructorDeclaration(n)) return "constructor";
  const p = n.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
    return p.name.text;
  }
  if (
    p &&
    (ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) &&
    ts.isIdentifier(p.name)
  ) {
    return p.name.text;
  }
  // Arrow/expression passed inline (callbacks): label by start line for context.
  const ln = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  return `(anonymous@${ln})`;
}

function scriptKind(rel: string): ts.ScriptKind {
  if (rel.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (rel.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (rel.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/**
 * Parse one file and return the cyclomatic complexity of every real function it
 * contains. Real functions inside IIFEs/classic scripts are surfaced too —
 * that is the whole point.
 */
export function collectComplexity(rel: string, text: string): FnComplexity[] {
  const sf = ts.createSourceFile(
    rel,
    text,
    ts.ScriptTarget.Latest,
    true, // setParentNodes — needed for fnName parent lookups + getStart
    scriptKind(rel),
  );
  const out: FnComplexity[] = [];
  const visit = (n: ts.Node): void => {
    if (isFunctionLike(n)) {
      const body = (n as ts.FunctionLikeDeclaration).body;
      if (body) {
        const startLine =
          sf.getLineAndCharacterOfPosition(n.getStart(sf)).line +
          1;
        const endLine = sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1;
        out.push({
          rel,
          name: fnName(n, sf),
          line: startLine,
          cc: 1 + countDecisions(body),
          loc: endLine - startLine + 1,
        });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}
