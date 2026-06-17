import type { FC } from "hono/jsx";
import type { Customer } from "../../types/customer.types.ts";

type Props = { customer: Customer | null };

export const PrintBillTo: FC<Props> = ({ customer }) => {
  if (!customer) return null;
  const addr = customer.billingAddress;
  return (
    <section class="invoice-print__bill-to">
      <h2 class="invoice-print__bill-to-heading">Bill To</h2>
      <address class="invoice-print__bill-to-address">
        {customer.name && (
          <span class="invoice-print__bill-to-name">{customer.name}</span>
        )}
        {customer.company && customer.company !== customer.name && (
          <span>{customer.company}</span>
        )}
        {addr?.street && <span>{addr.street}</span>}
        {(addr?.city || addr?.state || addr?.postalCode) && (
          <span>
            {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(
              ", ",
            )}
          </span>
        )}
        {addr?.country && <span>{addr.country}</span>}
        {customer.email && <span>{customer.email}</span>}
        {customer.phone && <span>{customer.phone}</span>}
      </address>
    </section>
  );
};
