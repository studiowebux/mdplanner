/**
 * C4 Architecture parser class for parsing and serializing C4 component markdown.
 * Handles C4 component CRUD operations and markdown conversion.
 */
import { C4Component } from "../types.ts";
import { BaseParser } from "./core.ts";

export class C4Parser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses the C4 components section from markdown lines starting at the given index.
   * Returns the parsed components and the next line index to process.
   */
  parseC4ComponentsSection(
    lines: string[],
    startIndex: number,
  ): { components: C4Component[]; nextIndex: number } {
    const components: C4Component[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Stop at next major section
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        break;
      }

      // Parse component (## Component Name {level: context; type: system; ...})
      if (line.startsWith("## ")) {
        const componentMatch = line.match(/^## (.+?)\s*\{(.+)\}$/);
        if (componentMatch) {
          const [, name, configStr] = componentMatch;
          const componentDescription: string[] = [];
          i++;

          // Collect component description until next ## or # or boundary comment
          while (i < lines.length) {
            const contentLine = lines[i];
            const trimmedLine = contentLine.trim();

            // Stop at next component, section, or boundary comment
            if (
              trimmedLine.startsWith("## ") ||
              trimmedLine.startsWith("# ") ||
              trimmedLine.match(
                /<!-- (Board|Goals|Configurations|Notes|Canvas|Mindmap|C4 Architecture) -->/,
              )
            ) {
              break;
            }

            if (trimmedLine) {
              componentDescription.push(trimmedLine);
            }
            i++;
          }

          // Check for existing ID in comment format <!-- id: xxx -->
          let componentId = this.generateC4ComponentId(components);
          let actualDescription = componentDescription.join("\n");

          // Try multiple ID formats
          const idMatch = actualDescription.match(
            /<!-- id: (c4_component_\d+|c4_\d+|[a-zA-Z0-9_-]+) -->/,
          );
          if (idMatch) {
            componentId = idMatch[1];
          }
          // Remove all ID comments from description (all formats)
          actualDescription = actualDescription
            .replace(/<!-- id: c4_component_\d+ -->\s*/g, "")
            .replace(/<!-- id: c4_\d+ -->\s*/g, "")
            .replace(/<!-- id: \d+ -->\s*/g, "")
            .replace(/<!-- id: [a-zA-Z0-9_-]+ -->\s*/g, "")
            .trim();

          // Parse component config
          const component: C4Component = {
            id: componentId,
            name,
            level: "context",
            type: "",
            description: actualDescription,
            position: { x: 0, y: 0 },
          };

          // Parse config string
          const configPairs = this.parseConfigString(configStr);
          for (const [key, value] of configPairs) {
            if (key && value) {
              switch (key) {
                case "level":
                  component.level = value as C4Component["level"];
                  break;
                case "type":
                  component.type = value;
                  break;
                case "technology":
                  component.technology = value;
                  break;
                case "position":
                  try {
                    const posMatch = value.match(
                      /\{\s*x:\s*([+-]?\d+),\s*y:\s*([+-]?\d+)\s*\}/,
                    );
                    if (posMatch) {
                      component.position = {
                        x: parseInt(posMatch[1]),
                        y: parseInt(posMatch[2]),
                      };
                    }
                  } catch (e) {
                    console.error("Error parsing position:", e);
                  }
                  break;
                case "connections":
                  try {
                    // Parse array of connections: [{target: name, label: label}, ...]
                    const connectionsMatch = value.match(/\[(.+)\]/);
                    if (connectionsMatch) {
                      const connectionsStr = connectionsMatch[1];
                      const connections: { target: string; label: string }[] =
                        [];
                      // Simple parsing for now - can be improved
                      const connectionParts = connectionsStr.split(/\},\s*\{/);
                      for (const part of connectionParts) {
                        const cleanPart = part.replace(/[{}]/g, "");
                        const targetMatch = cleanPart.match(
                          /target:\s*([^,]+)/,
                        );
                        const labelMatch = cleanPart.match(/label:\s*(.+)/);
                        if (targetMatch && labelMatch) {
                          connections.push({
                            target: targetMatch[1].trim(),
                            label: labelMatch[1].trim(),
                          });
                        }
                      }
                      component.connections = connections;
                    }
                  } catch (e) {
                    console.error("Error parsing connections:", e);
                  }
                  break;
                case "children":
                  try {
                    const childrenMatch = value.match(/\[(.+)\]/);
                    if (childrenMatch) {
                      component.children = childrenMatch[1]
                        .split(",")
                        .map((c) => c.trim());
                    }
                  } catch (e) {
                    console.error("Error parsing children:", e);
                  }
                  break;
                case "parent":
                  component.parent = value;
                  break;
              }
            }
          }

          components.push(component);
          continue;
        }
      }

      i++;
    }

    return { components, nextIndex: i };
  }

  /**
   * Generates the next C4 component ID.
   */
  generateC4ComponentId(existingComponents: C4Component[] = []): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const idMatches = content.match(/<!-- id: c4_component_(\d+) -->/g) || [];
      const fileMaxId = Math.max(
        0,
        ...idMatches.map((match) => {
          const idMatch = match.match(/c4_component_(\d+)/);
          return idMatch ? parseInt(idMatch[1]) : 0;
        }),
      );

      // Also check existing components in memory
      const existingMaxId = Math.max(
        0,
        ...existingComponents.map((c) => {
          const match = c.id.match(/c4_component_(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }),
      );

      return `c4_component_${Math.max(fileMaxId, existingMaxId) + 1}`;
    } catch {
      return `c4_component_${existingComponents.length + 1}`;
    }
  }

  /**
   * Parses a config string into key-value pairs.
   * Handles nested structures like position: {x: 100, y: 200}
   */
  parseConfigString(configStr: string): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    let current = "";
    let depth = 0;
    let inKey = true;
    let currentKey = "";

    for (let i = 0; i < configStr.length; i++) {
      const char = configStr[i];

      if (char === "{" || char === "[") {
        depth++;
        current += char;
      } else if (char === "}" || char === "]") {
        depth--;
        current += char;
      } else if (char === ":" && depth === 0 && inKey) {
        currentKey = current.trim();
        current = "";
        inKey = false;
      } else if (char === ";" && depth === 0) {
        pairs.push([currentKey, current.trim()]);
        current = "";
        currentKey = "";
        inKey = true;
      } else {
        current += char;
      }
    }

    // Don't forget the last pair
    if (currentKey && current.trim()) {
      pairs.push([currentKey, current.trim()]);
    }

    return pairs;
  }

  /**
   * Converts a C4 component to markdown format.
   */
  componentToMarkdown(component: C4Component): string {
    let content =
      `## ${component.name} {level: ${component.level}; type: ${component.type}`;
    if (component.technology) {
      content += `; technology: ${component.technology}`;
    }
    content +=
      `; position: {x: ${component.position.x}, y: ${component.position.y}}`;
    if (component.connections && component.connections.length > 0) {
      content += `; connections: [${
        component.connections
          .map((c) => `{target: ${c.target}, label: ${c.label}}`)
          .join(", ")
      }]`;
    }
    if (component.children && component.children.length > 0) {
      content += `; children: [${component.children.join(", ")}]`;
    }
    if (component.parent) {
      content += `; parent: ${component.parent}`;
    }
    content += "}\n\n";
    content += `<!-- id: ${component.id} -->\n`;
    content += `${component.description}\n\n`;
    return content;
  }

  /**
   * Serializes all C4 components to markdown format.
   */
  c4ComponentsToMarkdown(components: C4Component[]): string {
    let content = "<!-- C4 Architecture -->\n# C4 Architecture\n\n";
    for (const component of components) {
      content += this.componentToMarkdown(component);
    }
    return content;
  }

  /**
   * Updates a component in the components array.
   * Returns the updated array and success status.
   */
  updateComponentInList(
    components: C4Component[],
    componentId: string,
    updates: Partial<Omit<C4Component, "id">>,
  ): { components: C4Component[]; success: boolean } {
    const componentIndex = components.findIndex((c) => c.id === componentId);

    if (componentIndex === -1) {
      return { components, success: false };
    }

    components[componentIndex] = {
      ...components[componentIndex],
      ...updates,
    };

    return { components, success: true };
  }

  /**
   * Deletes a component from the components array.
   * Returns the filtered array and success status.
   */
  deleteComponentFromList(
    components: C4Component[],
    componentId: string,
  ): { components: C4Component[]; success: boolean } {
    const originalLength = components.length;
    const filtered = components.filter((c) => c.id !== componentId);
    return {
      components: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new C4 component with generated ID.
   */
  createComponent(
    component: Omit<C4Component, "id">,
    existingComponents: C4Component[] = [],
  ): C4Component {
    return {
      ...component,
      id: this.generateC4ComponentId(existingComponents),
    };
  }

  /**
   * Finds the C4 Architecture section boundaries in the file.
   * Returns startIndex (line with marker) and endIndex (line of next section).
   */
  findC4Section(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    // Known section boundary patterns
    const sectionBoundaryPattern = /^<!-- (Notes|Goals|Canvas|Mindmap|Board|Configurations|Milestones|Ideas|Retrospectives|SWOT Analysis|Risk Analysis|Lean Canvas|Business Model|Project Value Board|Brief|Time Tracking|Capacity Planning|Strategic Levels|Billing|Customers|Billing Rates|Quotes|Invoices|Companies|Contacts|Deals|Interactions) -->$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (startIndex === -1) {
        if (line === "<!-- C4 Architecture -->" || line === "# C4 Architecture") {
          startIndex = line === "<!-- C4 Architecture -->" ? i : i;
          if (line === "# C4 Architecture" && i > 0 && lines[i - 1].trim() === "<!-- C4 Architecture -->") {
            startIndex = i - 1;
          }
        }
      } else {
        // Look for the next section - must be a known section boundary
        if (sectionBoundaryPattern.test(line)) {
          endIndex = i;
          break;
        }
        // Also check for # headers that are sections
        if (line.startsWith("# ") && !line.startsWith("## ") && line !== "# C4 Architecture") {
          endIndex = i;
          break;
        }
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Reads all C4 components from the file using section-specific parsing.
   */
  async readC4Components(): Promise<C4Component[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    const { startIndex } = this.findC4Section(lines);

    if (startIndex === -1) {
      return [];
    }

    // Find the first ## header after the section start
    let parseStart = startIndex;
    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].trim().startsWith("## ")) {
        parseStart = i;
        break;
      }
    }

    const result = this.parseC4ComponentsSection(lines, parseStart);
    return result.components;
  }

  /**
   * Saves C4 components by replacing only the C4 Architecture section in the file.
   * This preserves all other sections.
   */
  async saveC4Components(components: C4Component[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.findC4Section(lines);
    const c4Content = this.c4ComponentsToMarkdown(components);

    if (startIndex === -1) {
      // No C4 section exists, find where to insert it
      let insertIndex = lines.length;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "<!-- Board -->" || line === "# Board") {
          insertIndex = i;
          break;
        }
      }
      lines.splice(insertIndex, 0, c4Content);
    } else {
      // Replace existing C4 section
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, c4Content.trimEnd(), ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }
}
