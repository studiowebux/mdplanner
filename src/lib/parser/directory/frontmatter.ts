/**
 * YAML frontmatter parser for directory-based markdown files.
 * Parses and serializes frontmatter in standard markdown format:
 * ---
 * key: value
 * ---
 */

export interface ParsedFile<T> {
  frontmatter: T;
  content: string;
}

/**
 * Parse YAML frontmatter from markdown content.
 * Returns frontmatter object and remaining content.
 */
export function parseFrontmatter<T = Record<string, unknown>>(
  content: string
): ParsedFile<T> {
  const lines = content.split("\n");

  if (lines[0]?.trim() !== "---") {
    return { frontmatter: {} as T, content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {} as T, content };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const frontmatter = parseYamlSimple<T>(frontmatterLines.join("\n"));
  const remainingContent = lines.slice(endIndex + 1).join("\n").trim();

  return { frontmatter, content: remainingContent };
}

/**
 * Simple YAML parser for frontmatter.
 * Supports: strings, numbers, booleans, arrays, nested objects, arrays of objects.
 */
function parseYamlSimple<T = Record<string, unknown>>(yaml: string): T {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let currentKey = "";
  let arrayBuffer: unknown[] = [];
  let inArray = false;
  let currentArrayObject: Record<string, unknown> | null = null;
  let baseArrayIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const indent = line.search(/\S/);

    // Check if we're exiting an array (back to base indent)
    if (inArray && indent <= baseArrayIndent && !trimmed.startsWith("-")) {
      // Flush current object if any
      if (currentArrayObject && Object.keys(currentArrayObject).length > 0) {
        arrayBuffer.push(currentArrayObject);
        currentArrayObject = null;
      }
      result[currentKey] = arrayBuffer;
      arrayBuffer = [];
      inArray = false;
    }

    // Array item marker (starts with -)
    if (trimmed.startsWith("-")) {
      // Flush previous array object if exists
      if (currentArrayObject && Object.keys(currentArrayObject).length > 0) {
        arrayBuffer.push(currentArrayObject);
      }

      const afterDash = trimmed.slice(1).trim();

      if (afterDash === "") {
        // Empty dash - next lines are object properties
        currentArrayObject = {};
      } else if (afterDash.includes(":")) {
        // Inline key:value after dash: "- title: foo"
        currentArrayObject = {};
        const colonIdx = afterDash.indexOf(":");
        const key = afterDash.slice(0, colonIdx).trim();
        const val = afterDash.slice(colonIdx + 1).trim();
        currentArrayObject[key] = parseValue(val);
      } else {
        // Simple value: "- item"
        arrayBuffer.push(parseValue(afterDash));
        currentArrayObject = null;
      }
      inArray = true;
      continue;
    }

    // Property inside array object
    if (inArray && currentArrayObject !== null && indent > baseArrayIndent) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex !== -1) {
        const key = trimmed.slice(0, colonIndex).trim();
        const valueStr = trimmed.slice(colonIndex + 1).trim();
        currentArrayObject[key] = parseValue(valueStr);
      }
      continue;
    }

    // Key: value pair at root level
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex !== -1) {
      const key = trimmed.slice(0, colonIndex).trim();
      const valueStr = trimmed.slice(colonIndex + 1).trim();

      if (valueStr === "" || valueStr === "|" || valueStr === ">") {
        // Empty value - next lines might be array or object
        currentKey = key;
        baseArrayIndent = indent;
      } else if (valueStr.startsWith("[") && valueStr.endsWith("]")) {
        // Inline array: [item1, item2]
        const items = valueStr.slice(1, -1).split(",").map((s) => parseValue(s.trim()));
        result[key] = items;
      } else if (valueStr.startsWith("{") && valueStr.endsWith("}")) {
        // Inline object: {x: 1, y: 2}
        result[key] = parseInlineObject(valueStr);
      } else {
        result[key] = parseValue(valueStr);
      }
    }
  }

  // Flush remaining array
  if (inArray) {
    if (currentArrayObject && Object.keys(currentArrayObject).length > 0) {
      arrayBuffer.push(currentArrayObject);
    }
    if (currentKey && arrayBuffer.length > 0) {
      result[currentKey] = arrayBuffer;
    }
  }

  return result as T;
}

/**
 * Parse a single YAML value to appropriate JS type.
 */
function parseValue(value: string): string | number | boolean | null {
  if (value === "null" || value === "~" || value === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;

  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Try number
  const num = Number(value);
  if (!isNaN(num) && value !== "") return num;

  return value;
}

/**
 * Parse inline object like {x: 1, y: 2}
 */
function parseInlineObject(str: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const inner = str.slice(1, -1).trim();
  if (!inner) return result;

  // Split by comma, handling nested structures
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of inner) {
    if (char === "{" || char === "[") depth++;
    if (char === "}" || char === "]") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    const colonIndex = part.indexOf(":");
    if (colonIndex !== -1) {
      const key = part.slice(0, colonIndex).trim();
      const value = part.slice(colonIndex + 1).trim();
      if (value.startsWith("{") && value.endsWith("}")) {
        result[key] = parseInlineObject(value);
      } else {
        result[key] = parseValue(value);
      }
    }
  }

  return result;
}

/**
 * Serialize object to YAML frontmatter string.
 */
export function serializeFrontmatter(
  data: Record<string, unknown>
): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    lines.push(serializeYamlLine(key, value, 0));
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * Serialize a single key-value pair to YAML.
 */
function serializeYamlLine(key: string, value: unknown, indent: number): string {
  const prefix = "  ".repeat(indent);

  if (value === null) {
    return `${prefix}${key}: null`;
  }

  if (typeof value === "boolean") {
    return `${prefix}${key}: ${value}`;
  }

  if (typeof value === "number") {
    return `${prefix}${key}: ${value}`;
  }

  if (typeof value === "string") {
    // Quote strings that might be ambiguous
    if (value.includes(":") || value.includes("#") || value.includes("\n") ||
        value === "true" || value === "false" || !isNaN(Number(value))) {
      return `${prefix}${key}: "${value.replace(/"/g, '\\"')}"`;
    }
    return `${prefix}${key}: ${value}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${prefix}${key}: []`;
    }
    // Use inline format for simple arrays
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      const items = value.map((v) =>
        typeof v === "string" && (v.includes(",") || v.includes(":"))
          ? `"${v}"`
          : String(v)
      );
      return `${prefix}${key}: [${items.join(", ")}]`;
    }
    // Multi-line array for complex items
    const lines = [`${prefix}${key}:`];
    for (const item of value) {
      if (typeof item === "object" && item !== null) {
        lines.push(`${prefix}  -`);
        for (const [k, v] of Object.entries(item)) {
          lines.push(serializeYamlLine(k, v, indent + 2));
        }
      } else {
        lines.push(`${prefix}  - ${serializeValue(item)}`);
      }
    }
    return lines.join("\n");
  }

  if (typeof value === "object") {
    // Inline object for simple position/size objects
    if (Object.keys(value).length <= 3 &&
        Object.values(value).every((v) => typeof v !== "object")) {
      const pairs = Object.entries(value)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${serializeValue(v)}`);
      return `${prefix}${key}: {${pairs.join(", ")}}`;
    }
    // Multi-line object
    const lines = [`${prefix}${key}:`];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        lines.push(serializeYamlLine(k, v, indent + 1));
      }
    }
    return lines.join("\n");
  }

  return `${prefix}${key}: ${String(value)}`;
}

/**
 * Serialize a value for inline use.
 */
function serializeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value.includes(":") || value.includes(",") || value.includes("#")) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

/**
 * Build complete file content from frontmatter and body.
 */
export function buildFileContent<T extends object>(
  frontmatter: T,
  body: string
): string {
  const fm = serializeFrontmatter(frontmatter as Record<string, unknown>);
  return `${fm}\n\n${body}`;
}
