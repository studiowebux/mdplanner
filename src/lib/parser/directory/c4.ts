/**
 * Directory-based parser for C4 Architecture components.
 * Each component is stored as a separate markdown file.
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { C4Component } from "../../types.ts";

interface C4Frontmatter {
  id: string;
  level: "context" | "container" | "component" | "code";
  type: string;
  technology?: string;
  position: { x: number; y: number };
  connections?: { target: string; label: string }[];
  children?: string[];
  parent?: string;
}

export class C4DirectoryParser extends DirectoryParser<C4Component> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "c4" });
  }

  protected parseFile(content: string, _filePath: string): C4Component | null {
    const { frontmatter, content: body } = parseFrontmatter<C4Frontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    // Extract name from first heading
    const lines = body.split("\n");
    let name = "Untitled Component";
    let descriptionStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        name = line.slice(2).trim();
        descriptionStartIndex = i + 1;
        break;
      }
    }

    const description = lines.slice(descriptionStartIndex).join("\n").trim();

    const component: C4Component = {
      id: frontmatter.id,
      name,
      level: frontmatter.level || "context",
      type: frontmatter.type || "",
      description,
      position: frontmatter.position || { x: 0, y: 0 },
    };

    if (frontmatter.technology) {
      component.technology = frontmatter.technology;
    }
    if (frontmatter.connections?.length) {
      component.connections = frontmatter.connections;
    }
    if (frontmatter.children?.length) {
      component.children = frontmatter.children;
    }
    if (frontmatter.parent) {
      component.parent = frontmatter.parent;
    }

    return component;
  }

  protected serializeItem(component: C4Component): string {
    const frontmatter: C4Frontmatter = {
      id: component.id,
      level: component.level,
      type: component.type,
      position: {
        x: Math.round(component.position.x),
        y: Math.round(component.position.y),
      },
    };

    if (component.technology) {
      frontmatter.technology = component.technology;
    }
    if (component.connections?.length) {
      frontmatter.connections = component.connections;
    }
    if (component.children?.length) {
      frontmatter.children = component.children;
    }
    if (component.parent) {
      frontmatter.parent = component.parent;
    }

    const body = `# ${component.name}\n\n${component.description || ""}`;

    return buildFileContent(frontmatter, body.trim());
  }

  /**
   * Add a new C4 component.
   */
  async add(component: Omit<C4Component, "id">): Promise<C4Component> {
    const newComponent: C4Component = {
      ...component,
      id: this.generateId("c4"),
    };
    await this.write(newComponent);
    return newComponent;
  }

  /**
   * Update an existing C4 component.
   */
  async update(id: string, updates: Partial<C4Component>): Promise<C4Component | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: C4Component = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
    };
    await this.write(updated);
    return updated;
  }

  /**
   * Update position of a component (optimized for drag operations).
   */
  async updatePosition(
    id: string,
    position: { x: number; y: number }
  ): Promise<C4Component | null> {
    return this.update(id, { position });
  }

  /**
   * Add a connection between components.
   */
  async addConnection(
    sourceId: string,
    targetId: string,
    label: string
  ): Promise<C4Component | null> {
    const source = await this.read(sourceId);
    if (!source) return null;

    const connections = source.connections || [];
    connections.push({ target: targetId, label });

    return this.update(sourceId, { connections });
  }

  /**
   * Remove a connection between components.
   */
  async removeConnection(
    sourceId: string,
    targetId: string
  ): Promise<C4Component | null> {
    const source = await this.read(sourceId);
    if (!source) return null;

    const connections = (source.connections || []).filter(
      (c) => c.target !== targetId
    );

    return this.update(sourceId, { connections });
  }

  /**
   * Get components by level.
   */
  async getByLevel(level: C4Component["level"]): Promise<C4Component[]> {
    const all = await this.readAll();
    return all.filter((c) => c.level === level);
  }

  /**
   * Get child components of a parent.
   */
  async getChildren(parentId: string): Promise<C4Component[]> {
    const all = await this.readAll();
    return all.filter((c) => c.parent === parentId);
  }
}
