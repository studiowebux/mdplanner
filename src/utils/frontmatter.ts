// YAML frontmatter parser — extracts the --- block from markdown files.
// Returns the parsed frontmatter object and the remaining body content.

/**
 * Parse a markdown file's YAML frontmatter and body.
 * Returns { frontmatter, body } where frontmatter is a plain object
 * and body is the markdown content after the closing ---.
 */
export function parseFrontmatter(
  content: string,
): { frontmatter: Record<string, unknown>; body: string } {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: {}, body: content };
  }

  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closingIdx = i;
      break;
    }
  }

  if (closingIdx === -1) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = lines.slice(1, closingIdx).join("\n");
  const body = lines.slice(closingIdx + 1).join("\n").replace(/^\n+/, "");
  const frontmatter = parseYaml(yamlBlock);

  return { frontmatter, body };
}

/**
 * Minimal YAML parser — handles flat key: value, arrays, and arbitrarily
 * nested objects. Covers the subset used by MDPlanner frontmatter (no
 * anchors, no tagged scalars, no flow-style maps beyond `{}`).
 */
function parseYaml(yaml: string): Record<string, unknown> {
  const lines = yaml.split("\n");
  const { value } = parseMap(lines, 0, 0);
  return value;
}

/**
 * Parse a YAML map starting at `start`, where every key is indented exactly
 * `indent` columns. Returns the map and the next line index outside the
 * block (i.e. the first line with indent < `indent`).
 */
function parseMap(
  lines: string[],
  start: number,
  indent: number,
): { value: Record<string, unknown>; next: number } {
  const result: Record<string, unknown> = {};
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const currentIndent = leadingSpaces(line);
    if (currentIndent < indent) break;
    if (currentIndent > indent) {
      // Stray deeper line with no parent — skip defensively.
      i++;
      continue;
    }

    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    // Inline array: key: [a, b, c]
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inner = rawValue.slice(1, -1);
      result[key] = inner
        ? inner.split(",").map((s) => parseScalar(s.trim()))
        : [];
      i++;
      continue;
    }

    // Inline empty map: key: {}
    if (rawValue === "{}") {
      result[key] = {};
      i++;
      continue;
    }

    // Block value (next lines indented deeper)
    if (rawValue === "") {
      const childStart = nextNonEmpty(lines, i + 1);
      if (childStart === -1) {
        i++;
        continue;
      }
      const childIndent = leadingSpaces(lines[childStart]);
      if (childIndent <= indent) {
        // No children at all — leave key unset.
        i++;
        continue;
      }
      if (lines[childStart].trim().startsWith("-")) {
        const { value, next } = parseBlockArray(
          lines,
          childStart,
          childIndent,
        );
        result[key] = value;
        i = next;
        continue;
      }
      const { value, next } = parseMap(lines, childStart, childIndent);
      result[key] = value;
      i = next;
      continue;
    }

    // Scalar value
    result[key] = parseScalar(rawValue);
    i++;
  }

  return { value: result, next: i };
}

/**
 * Parse a YAML block sequence where each item begins with `- ` at exactly
 * `indent` columns. Items may be scalars, inline `- key: value` objects
 * (whose remaining fields appear on deeper-indented continuation lines), or
 * deeper nested maps.
 */
/**
 * Resolve an empty-valued key to its deeper-indented nested array or map.
 * `from` is the line index just past the key line; returns null when no block
 * is indented strictly deeper than `parentIndent`.
 */
function parseNestedBlock(
  lines: string[],
  from: number,
  parentIndent: number,
): { value: unknown; next: number } | null {
  const childStart = nextNonEmpty(lines, from);
  if (childStart === -1) return null;
  const childIndent = leadingSpaces(lines[childStart]);
  if (childIndent <= parentIndent) return null;
  return lines[childStart].trim().startsWith("-")
    ? parseBlockArray(lines, childStart, childIndent)
    : parseMap(lines, childStart, childIndent);
}

/** Parse the `key: value` continuation lines for one block-array object. */
function parseItemContinuation(
  lines: string[],
  start: number,
  indent: number,
  obj: Record<string, unknown>,
): number {
  let i = start;
  while (i < lines.length) {
    const cline = lines[i];
    if (!cline.trim() || cline.trim().startsWith("#")) {
      i++;
      continue;
    }
    const cIndent = leadingSpaces(cline);
    if (cIndent <= indent) break;
    if (cline.trim().startsWith("-")) break;
    const ctrim = cline.trim();
    const cc = ctrim.indexOf(":");
    if (cc === -1) {
      i++;
      continue;
    }
    const ck = ctrim.slice(0, cc).trim();
    const cv = ctrim.slice(cc + 1).trim();
    if (cv === "") {
      const nested = parseNestedBlock(lines, i + 1, cIndent);
      if (nested) {
        obj[ck] = nested.value;
        i = nested.next;
      } else {
        i++;
      }
      continue;
    }
    if (cv.startsWith("[") && cv.endsWith("]")) {
      const inner = cv.slice(1, -1);
      obj[ck] = inner ? inner.split(",").map((s) => parseScalar(s.trim())) : [];
    } else {
      obj[ck] = parseScalar(cv);
    }
    i++;
  }
  return i;
}

function parseBlockArray(
  lines: string[],
  start: number,
  indent: number,
): { value: unknown[]; next: number } {
  const items: unknown[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const currentIndent = leadingSpaces(line);
    if (currentIndent < indent) break;
    if (currentIndent > indent || !line.trim().startsWith("-")) {
      // Continuation belonging to the previous item — handled inline below.
      break;
    }

    const afterDash = line.slice(currentIndent + 1).replace(/^\s+/, "");
    const colonIdx = afterDash.indexOf(":");

    if (colonIdx === -1) {
      items.push(parseScalar(afterDash.trim()));
      i++;
      continue;
    }

    const obj: Record<string, unknown> = {};
    const firstKey = afterDash.slice(0, colonIdx).trim();
    const firstVal = afterDash.slice(colonIdx + 1).trim();
    // The first field sits on the dash line; its key starts two columns past
    // the dash, so its own nested block (if any) is indented deeper than that.
    const dashKeyIndent = currentIndent + 2;
    i++;
    if (firstVal.startsWith("[") && firstVal.endsWith("]")) {
      const inner = firstVal.slice(1, -1);
      obj[firstKey] = inner
        ? inner.split(",").map((s) => parseScalar(s.trim()))
        : [];
    } else if (firstVal !== "") {
      obj[firstKey] = parseScalar(firstVal);
    } else {
      // Empty inline value: the first field may carry a nested map/array on
      // deeper-indented lines (same rule as the continuation empty-value path).
      const nested = parseNestedBlock(lines, i, dashKeyIndent);
      if (nested) {
        obj[firstKey] = nested.value;
        i = nested.next;
      }
    }

    i = parseItemContinuation(lines, i, indent, obj);
    items.push(obj);
  }

  return { value: items, next: i };
}

function leadingSpaces(line: string): number {
  const m = line.match(/^( *)/);
  return m ? m[1].length : 0;
}

function nextNonEmpty(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t && !t.startsWith("#")) return i;
  }
  return -1;
}

/**
 * Parse a scalar YAML value to its JS type.
 */
function parseScalar(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~" || value === "") return undefined;

  // Double-quoted: decode escape sequences (symmetric with serializeScalar) so
  // newlines/tabs/quotes survive the round-trip. Single-pass so adjacent escapes
  // like `\\n` (escaped backslash + n) don't get mis-decoded as a newline.
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return unescapeDouble(value.slice(1, -1));
  }
  // Single-quoted: literal (YAML single quotes don't use backslash escapes).
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  // Number
  const num = Number(value);
  if (!isNaN(num) && value !== "") return num;

  return value;
}

/**
 * Decode the escape sequences produced by serializeScalar for double-quoted
 * strings. Single left-to-right pass: each `\` consumes the following char as a
 * unit, so `\\n` decodes to `\n` (backslash + n), not a newline. Unknown
 * escapes are preserved verbatim (`\x` -> `\x`) to avoid dropping data.
 */
function unescapeDouble(s: string): string {
  return s.replace(/\\(.)/g, (_, ch) => {
    switch (ch) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case '"':
        return '"';
      case "\\":
        return "\\";
      default:
        return "\\" + ch;
    }
  });
}

/**
 * Serialize a frontmatter object back to YAML string (for writing).
 * Handles arbitrarily nested objects, arrays of scalars, arrays of objects,
 * and arrays nested inside objects.
 */
export function serializeFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (v === undefined || v === null) continue;
    appendValue(lines, k, v, 0);
  }
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

function appendValue(
  lines: string[],
  key: string,
  value: unknown,
  indent: number,
): void {
  const pad = "  ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${pad}${key}: []`);
      return;
    }
    if (typeof value[0] === "object" && value[0] !== null) {
      lines.push(`${pad}${key}:`);
      const itemPad = "  ".repeat(indent + 1);
      for (const item of value) {
        const entries = Object.entries(item as Record<string, unknown>)
          .filter(([_, rv]) => rv !== undefined && rv !== null);
        if (entries.length === 0) continue;
        const [fk, fv] = entries[0];
        // Emit every field through the shared recursion so nested object/array
        // values (e.g. comment `metadata.files_changed`) serialize properly
        // instead of stringifying to "[object Object]". The first field's line
        // gets the YAML block-sequence dash spliced into its leading pad — the
        // two leading pad spaces become "- " (identical width), so scalar-only
        // items render byte-identical to the previous output.
        const dashIdx = lines.length;
        appendValue(lines, fk, fv, indent + 2);
        lines[dashIdx] = `${itemPad}- ${
          lines[dashIdx].slice((indent + 2) * 2)
        }`;
        for (const [rk, rv] of entries.slice(1)) {
          appendValue(lines, rk, rv, indent + 2);
        }
      }
      return;
    }
    lines.push(`${pad}${key}: [${value.map(serializeScalar).join(", ")}]`);
    return;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([_, rv]) => rv !== undefined && rv !== null);
    if (entries.length === 0) {
      lines.push(`${pad}${key}: {}`);
      return;
    }
    lines.push(`${pad}${key}:`);
    for (const [nk, nv] of entries) {
      appendValue(lines, nk, nv, indent + 1);
    }
    return;
  }

  lines.push(`${pad}${key}: ${serializeScalar(value)}`);
}

function serializeScalar(value: unknown): string {
  if (typeof value === "string") {
    // Quote strings that would otherwise re-parse as a different type
    // (boolean / null / number) — see parseScalar — plus the structural and
    // whitespace characters that break a bare block-YAML scalar. Newlines are
    // the critical case: a bare multi-line value spills past the key and is
    // truncated on re-parse (data loss). Encode them as \n inside a quoted
    // scalar; unescapeDouble reverses it.
    const ambiguous = value === "true" || value === "false" ||
      value === "null" || value === "~" ||
      (value.trim() !== "" && !isNaN(Number(value)));
    const hasSpecial = value.includes(":") || value.includes("#") ||
      value.includes('"') || value.includes("\\") ||
      value.includes("\n") || value.includes("\r") || value.includes("\t");
    if (ambiguous || hasSpecial) {
      const escaped = value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
      return `"${escaped}"`;
    }
    return value;
  }
  return String(value);
}
