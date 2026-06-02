// Business Model Canvas service — business logic over BusinessModelRepository.

import type { BusinessModelRepository } from "../repositories/business-model.repository.ts";
import type {
  BusinessModel,
  CreateBusinessModel,
  ListBusinessModelOptions,
  UpdateBusinessModel,
} from "../types/business-model.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class BusinessModelService extends BaseService<
  BusinessModel,
  CreateBusinessModel,
  UpdateBusinessModel,
  ListBusinessModelOptions
> {
  constructor(repo: BusinessModelRepository) {
    super(repo);
  }

  protected applyFilters(
    items: BusinessModel[],
    options: ListBusinessModelOptions,
  ): BusinessModel[] {
    if (options.project) {
      items = items.filter((b) => ciEquals(b.project, options.project));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter((b) =>
        ciIncludes(b.title, q) ||
        b.keyPartners.some((i) => ciIncludes(i, q)) ||
        b.keyActivities.some((i) => ciIncludes(i, q)) ||
        b.keyResources.some((i) => ciIncludes(i, q)) ||
        b.valueProposition.some((i) => ciIncludes(i, q)) ||
        b.customerRelationships.some((i) => ciIncludes(i, q)) ||
        b.channels.some((i) => ciIncludes(i, q)) ||
        b.customerSegments.some((i) => ciIncludes(i, q)) ||
        b.costStructure.some((i) => ciIncludes(i, q)) ||
        b.revenueStreams.some((i) => ciIncludes(i, q)) ||
        ciIncludes(b.notes, q)
      );
    }
    return items;
  }
}
