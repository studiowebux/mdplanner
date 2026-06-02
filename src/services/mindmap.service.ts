// Mindmap service — business logic over MindmapRepository.

import type { MindmapRepository } from "../repositories/mindmap.repository.ts";
import type {
  CreateMindmap,
  ListMindmapOptions,
  Mindmap,
  MindmapNode,
  UpdateMindmap,
} from "../types/mindmap.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class MindmapService extends BaseService<
  Mindmap,
  CreateMindmap,
  UpdateMindmap,
  ListMindmapOptions
> {
  constructor(repo: MindmapRepository) {
    super(repo);
  }

  protected applyFilters(
    items: Mindmap[],
    options: ListMindmapOptions,
  ): Mindmap[] {
    if (options.project) {
      items = items.filter((m) => ciEquals(m.project, options.project));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter((m) =>
        ciIncludes(m.title, q) ||
        nodeMatches(m.nodes, q) ||
        ciIncludes(m.notes, q)
      );
    }
    return items;
  }
}

function nodeMatches(nodes: MindmapNode[], q: string): boolean {
  return nodes.some((n) => ciIncludes(n.text, q) || nodeMatches(n.children, q));
}
