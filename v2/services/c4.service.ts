// C4 Architecture service — business logic over C4Repository.

import type { C4Repository } from "../repositories/c4.repository.ts";
import type {
  C4Component,
  C4Connection,
  CreateC4Component,
  ListC4Options,
  UpdateC4Component,
} from "../types/c4.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class C4Service extends BaseService<
  C4Component,
  CreateC4Component,
  UpdateC4Component,
  ListC4Options
> {
  declare protected repo: C4Repository;

  constructor(repo: C4Repository) {
    super(repo);
  }

  protected applyFilters(
    items: C4Component[],
    options: ListC4Options,
  ): C4Component[] {
    if (options.level) {
      items = items.filter((c) => c.level === options.level);
    }
    if (options.parent !== undefined) {
      items = items.filter((c) => c.parent === options.parent);
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (c) =>
          ciIncludes(c.name, q) ||
          ciIncludes(c.type, q) ||
          ciIncludes(c.technology, q) ||
          ciIncludes(c.description, q),
      );
    }
    return items;
  }

  findByLevel(
    level: C4Component["level"],
    parentId?: string,
  ): Promise<C4Component[]> {
    return this.repo.findByLevel(level, parentId);
  }

  patchPosition(id: string, x: number, y: number): Promise<C4Component | null> {
    return this.repo.patchPosition(id, x, y);
  }

  addConnection(
    sourceId: string,
    targetId: string,
    label: string,
    technology?: string,
  ): Promise<{ component: C4Component; connectionId: string } | null> {
    return this.repo.addConnection(
      sourceId,
      targetId,
      label,
      technology ?? undefined,
    );
  }

  removeConnection(connId: string): Promise<boolean> {
    return this.repo.removeConnection(connId);
  }

  getConnectionsFor(componentId: string): Promise<C4Connection[]> {
    return this.repo.getConnectionsFor(componentId);
  }
}
