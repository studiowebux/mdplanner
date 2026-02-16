/**
 * Directory-based parser for Mindmaps.
 * Each mindmap is stored as a separate markdown file with nodes as nested lists.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Mindmap, MindmapNode } from "../../types.ts";

interface MindmapFrontmatter {
  id: string;
}

export class MindmapsDirectoryParser extends DirectoryParser<Mindmap> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "mindmaps" });
  }

  protected parseFile(content: string, _filePath: string): Mindmap | null {
    const { frontmatter, content: body } = parseFrontmatter<MindmapFrontmatter>(
      content,
    );

    if (!frontmatter.id) {
      return null;
    }

    // Extract title from first heading
    const lines = body.split("\n");
    let title = "Untitled Mindmap";
    let nodesStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        nodesStartIndex = i + 1;
        break;
      }
    }

    // Parse nodes from nested list
    const nodes = this.parseNodes(lines.slice(nodesStartIndex), frontmatter.id);

    return {
      id: frontmatter.id,
      title,
      nodes,
    };
  }

  /**
   * Parse mindmap nodes from markdown nested list.
   */
  private parseNodes(lines: string[], mindmapId: string): MindmapNode[] {
    const nodes: MindmapNode[] = [];
    let nodeCounter = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and non-list items
      if (!trimmed || !trimmed.match(/^[-*+]\s+/)) {
        continue;
      }

      // Calculate level based on indentation (2 spaces per level)
      const leadingSpaces = line.length - line.trimStart().length;
      const level = Math.floor(leadingSpaces / 2);

      // Extract text content
      const text = trimmed.replace(/^[-*+]\s+/, "").trim();
      if (!text) continue;

      nodeCounter++;
      const node: MindmapNode = {
        id: `${mindmapId}_node_${nodeCounter}`,
        text,
        level,
        children: [],
      };

      // Find parent based on level
      if (level > 0) {
        for (let j = nodes.length - 1; j >= 0; j--) {
          if (nodes[j].level === level - 1) {
            node.parent = nodes[j].id;
            break;
          }
        }
      }

      nodes.push(node);
    }

    return nodes;
  }

  protected serializeItem(mindmap: Mindmap): string {
    const frontmatter: MindmapFrontmatter = {
      id: mindmap.id,
    };

    let body = `# ${mindmap.title}\n\n`;

    // Serialize nodes as nested list
    const rootNodes = mindmap.nodes.filter((node) =>
      node.level === 0 || !node.parent
    );
    for (const rootNode of rootNodes) {
      body += this.serializeNode(rootNode, mindmap.nodes, 0);
    }

    return buildFileContent(frontmatter, body.trim());
  }

  /**
   * Serialize a mindmap node and its children recursively.
   */
  private serializeNode(
    node: MindmapNode,
    allNodes: MindmapNode[],
    level: number,
  ): string {
    const indent = "  ".repeat(level);
    let result = `${indent}- ${node.text}\n`;

    // Find children from flat array using parent field
    const children = allNodes.filter((n) => n.parent === node.id);
    for (const child of children) {
      result += this.serializeNode(child, allNodes, level + 1);
    }

    return result;
  }

  /**
   * Add a new mindmap.
   */
  async add(title: string, initialNode?: string): Promise<Mindmap> {
    const id = this.generateId("mindmap");
    const nodes: MindmapNode[] = [];

    if (initialNode) {
      nodes.push({
        id: `${id}_node_1`,
        text: initialNode,
        level: 0,
        children: [],
      });
    }

    const mindmap: Mindmap = { id, title, nodes };
    await this.write(mindmap);
    return mindmap;
  }

  /**
   * Update an existing mindmap.
   */
  async update(id: string, updates: Partial<Mindmap>): Promise<Mindmap | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Mindmap = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
    };
    await this.write(updated);
    return updated;
  }

  /**
   * Add a node to an existing mindmap.
   */
  async addNode(
    mindmapId: string,
    text: string,
    parentId?: string,
  ): Promise<Mindmap | null> {
    const mindmap = await this.read(mindmapId);
    if (!mindmap) return null;

    // Calculate level based on parent
    let level = 0;
    if (parentId) {
      const parent = mindmap.nodes.find((n) => n.id === parentId);
      if (parent) {
        level = parent.level + 1;
      }
    }

    const newNode: MindmapNode = {
      id: `${mindmapId}_node_${mindmap.nodes.length + 1}`,
      text,
      level,
      children: [],
      parent: parentId,
    };

    mindmap.nodes.push(newNode);
    await this.write(mindmap);
    return mindmap;
  }

  /**
   * Update a node in a mindmap.
   */
  async updateNode(
    mindmapId: string,
    nodeId: string,
    text: string,
  ): Promise<Mindmap | null> {
    const mindmap = await this.read(mindmapId);
    if (!mindmap) return null;

    const node = mindmap.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    node.text = text;
    await this.write(mindmap);
    return mindmap;
  }

  /**
   * Delete a node from a mindmap (and its children).
   */
  async deleteNode(mindmapId: string, nodeId: string): Promise<Mindmap | null> {
    const mindmap = await this.read(mindmapId);
    if (!mindmap) return null;

    // Collect all node IDs to delete (node and all descendants)
    const idsToDelete = new Set<string>();
    idsToDelete.add(nodeId);

    // Find all descendants
    let foundMore = true;
    while (foundMore) {
      foundMore = false;
      for (const node of mindmap.nodes) {
        if (
          node.parent && idsToDelete.has(node.parent) &&
          !idsToDelete.has(node.id)
        ) {
          idsToDelete.add(node.id);
          foundMore = true;
        }
      }
    }

    mindmap.nodes = mindmap.nodes.filter((n) => !idsToDelete.has(n.id));
    await this.write(mindmap);
    return mindmap;
  }
}
