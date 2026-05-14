// Company service — business logic over CompanyRepository.

import type { CompanyRepository } from "../repositories/company.repository.ts";
import type {
  Company,
  CreateCompany,
  ListCompanyOptions,
  UpdateCompany,
} from "../types/company.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class CompanyService extends BaseService<
  Company,
  CreateCompany,
  UpdateCompany,
  ListCompanyOptions
> {
  constructor(companyRepo: CompanyRepository) {
    super(companyRepo);
  }

  protected applyFilters(
    companies: Company[],
    options: ListCompanyOptions,
  ): Company[] {
    if (options.q) {
      companies = companies.filter((c) =>
        ciIncludes(c.name, options.q!) ||
        ciIncludes(c.industry, options.q!) ||
        ciIncludes(c.website, options.q!) ||
        ciIncludes(c.address, options.q!) ||
        ciIncludes(c.notes, options.q!)
      );
    }
    if (options.type) {
      companies = companies.filter((c) => ciEquals(c.type, options.type!));
    }
    if (options.industry) {
      companies = companies.filter((c) =>
        ciEquals(c.industry, options.industry!)
      );
    }
    return companies;
  }
}
