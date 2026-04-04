// Customer service — business logic over CustomerRepository.

import type { CustomerRepository } from "../repositories/customer.repository.ts";
import type {
  CreateCustomer,
  Customer,
  ListCustomerOptions,
  UpdateCustomer,
} from "../types/customer.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class CustomerService extends BaseService<
  Customer,
  CreateCustomer,
  UpdateCustomer,
  ListCustomerOptions
> {
  constructor(customerRepo: CustomerRepository) {
    super(customerRepo);
  }

  protected applyFilters(
    customers: Customer[],
    options: ListCustomerOptions,
  ): Customer[] {
    if (options.q) {
      customers = customers.filter((c) =>
        ciIncludes(c.name, options.q!) ||
        ciIncludes(c.email, options.q!) ||
        ciIncludes(c.company, options.q!)
      );
    }
    return customers;
  }
}
