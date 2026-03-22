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
 * Minimal YAML parser — handles flat key: value, arrays, and nested objects.
 * Covers the subset used by MDPlanner frontmatter. Not a full YAML parser.
 */
function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    // Inline array: [a, b, c]
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inner = rawValue.slice(1, -1);
      result[key] = inner
        ? inner.split(",").map((s) => parseScalar(s.trim()))
        : [];
      i++;
      continue;
    }

    // Block array (next lines start with -)
    if (rawValue === "") {
      const arr: unknown[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^\s+-/)) {
        const item = lines[j].replace(/^\s+-\s*/, "").trim();
        // Check if this array item is an object (next lines are indented key: value)
        const nextIndent = lines[j].match(/^(\s+)/)?.[1]?.length ?? 0;
        let k = j + 1;
        const obj: Record<string, unknown> = {};
        let isObj = false;
        while (
          k < lines.length &&
          !lines[k].match(/^\s+-/) &&
          lines[k].trim() !== "" &&
          (lines[k].match(/^(\s+)/)?.[1]?.length ?? 0) > nextIndent
        ) {
          const objLine = lines[k].trim();
          const objColon = objLine.indexOf(":");
          if (objColon !== -1) {
            isObj = true;
            const objKey = objLine.slice(0, objColon).trim();
            const objVal = objLine.slice(objColon + 1).trim();
            obj[objKey] = parseScalar(objVal);
          }
          k++;
        }
        if (isObj) {
          // First line after - may have key: value too
          if (item.includes(":")) {
            const fc = item.indexOf(":");
            obj[item.slice(0, fc).trim()] = parseScalar(
              item.slice(fc + 1).trim(),
            );
          }
          arr.push(obj);
          j = k;
        } else {
          arr.push(parseScalar(item));
          j++;
        }
      }
      if (arr.length > 0) {
        result[key] = arr;
        i = j;
        continue;
      }

      // Nested map: indented key: value lines
      const map: Record<string, unknown> = {};
      let m = i + 1;
      while (
        m < lines.length &&
        lines[m].trim() !== "" &&
        (lines[m].match(/^(\s+)/)?.[1]?.length ?? 0) > 0
      ) {
        const mapLine = lines[m].trim();
        const mc = mapLine.indexOf(":");
        if (mc !== -1) {
          const mk = mapLine.slice(0, mc).trim();
          const mv = mapLine.slice(mc + 1).trim();
          if (mv.startsWith("[") && mv.endsWith("]")) {
            const inner = mv.slice(1, -1);
            map[mk] = inner
              ? inner.split(",").map((s) => parseScalar(s.trim()))
              : [];
          } else {
            map[mk] = parseScalar(mv);
          }
        }
        m++;
      }
      if (Object.keys(map).length > 0) {
        result[key] = map;
        i = m;
        continue;
      }
    }

    // Scalar value
    result[key] = parseScalar(rawValue);
    i++;
  }

  return result;
}

/**
 * Parse a scalar YAML value to its JS type.
 */
function parseScalar(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~" || value === "") return undefined;

  // Remove surrounding quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Number
  const num = Number(value);
  if (!isNaN(num) && value !== "") return num;

  return value;
}

/**
 * Serialize a frontmatter object back to YAML string (for writing).
 */
export function serializeFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const yaml = Object.entries(frontmatter)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length === 0) return `${k}: []`;
        if (typeof v[0] === "object") {
          const items = v.map((item) => {
            const entries = Object.entries(item as Record<string, unknown>);
            const first = entries[0];
            const rest = entries.slice(1);
            let s = `  - ${first[0]}: ${serializeScalar(first[1])}`;
            for (const [rk, rv] of rest) {
              s += `\n    ${rk}: ${serializeScalar(rv)}`;
            }
            return s;
          });
          return `${k}:\n${items.join("\n")}`;
        }
        return `${k}: [${v.map(serializeScalar).join(", ")}]`;
      }
      if (typeof v === "object") {
        const entries = Object.entries(v as Record<string, unknown>);
        if (entries.length === 0) return `${k}: {}`;
        const nested = entries.map(([nk, nv]) => {
          if (Array.isArray(nv)) {
            return `  ${nk}: [${(nv as unknown[]).map(serializeScalar).join(", ")}]`;
          }
          return `  ${nk}: ${serializeScalar(nv)}`;
        });
        return `${k}:\n${nested.join("\n")}`;
      }
      return `${k}: ${serializeScalar(v)}`;
    })
    .join("\n");

  return `---\n${yaml}\n---\n\n${body}`;
}

function serializeScalar(value: unknown): string {
  if (typeof value === "string") {
    if (value.includes(":") || value.includes("#") || value.includes('"')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}
