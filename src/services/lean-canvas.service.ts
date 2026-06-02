// Lean Canvas service — business logic over LeanCanvasRepository.

import type { LeanCanvasRepository } from "../repositories/lean-canvas.repository.ts";
import type {
  CreateLeanCanvas,
  LeanCanvas,
  ListLeanCanvasOptions,
  UpdateLeanCanvas,
} from "../types/lean-canvas.types.ts";
import {
  enrichLeanCanvas,
  enrichLeanCanvases,
} from "../domains/lean-canvas/lean-canvas.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class LeanCanvasService extends BaseService<
  LeanCanvas,
  CreateLeanCanvas,
  UpdateLeanCanvas,
  ListLeanCanvasOptions
> {
  constructor(leanCanvasRepo: LeanCanvasRepository) {
    super(leanCanvasRepo);
  }

  override async list(options?: ListLeanCanvasOptions): Promise<LeanCanvas[]> {
    const raw = await this.repo.findAll();
    let items = enrichLeanCanvases(raw);
    if (options) {
      items = this.applyFilters(items, options);
    }
    return items;
  }

  override async getById(id: string): Promise<LeanCanvas | null> {
    const raw = await this.repo.findById(id);
    return raw ? enrichLeanCanvas(raw) : null;
  }

  override async create(data: CreateLeanCanvas): Promise<LeanCanvas> {
    const raw = await this.repo.create(data);
    return enrichLeanCanvas(raw);
  }

  override async update(
    id: string,
    data: UpdateLeanCanvas,
  ): Promise<LeanCanvas | null> {
    const raw = await this.repo.update(id, data);
    return raw ? enrichLeanCanvas(raw) : null;
  }

  protected applyFilters(
    items: LeanCanvas[],
    options: ListLeanCanvasOptions,
  ): LeanCanvas[] {
    if (options.project) {
      items = items.filter((lc) => lc.project === options.project);
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (lc) =>
          ciIncludes(lc.title, q) ||
          (lc.project ? ciIncludes(lc.project, q) : false) ||
          lc.problem.some((s) => ciIncludes(s, q)) ||
          lc.solution.some((s) => ciIncludes(s, q)) ||
          lc.uniqueValueProp.some((s) => ciIncludes(s, q)) ||
          lc.unfairAdvantage.some((s) => ciIncludes(s, q)) ||
          lc.customerSegments.some((s) => ciIncludes(s, q)) ||
          lc.existingAlternatives.some((s) => ciIncludes(s, q)) ||
          lc.keyMetrics.some((s) => ciIncludes(s, q)) ||
          lc.highLevelConcept.some((s) => ciIncludes(s, q)) ||
          lc.channels.some((s) => ciIncludes(s, q)) ||
          lc.earlyAdopters.some((s) => ciIncludes(s, q)) ||
          lc.costStructure.some((s) => ciIncludes(s, q)) ||
          lc.revenueStreams.some((s) => ciIncludes(s, q)),
      );
    }
    return items;
  }
}
