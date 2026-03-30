import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Customer } from "../types/customer.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const CustomerDetailView: FC<
  ViewProps & { item: Customer }
> = (
  { item: customer, ...viewProps },
) => {
  const addr = customer.billingAddress;
  const hasContact = customer.email || customer.phone || customer.company;
  const hasAddress = addr &&
    (addr.street || addr.city || addr.state || addr.postalCode || addr.country);

  return (
    <MainLayout
      title={customer.name}
      {...viewProps}
      styles={["/css/views/customers.css"]}
    >
      <SseRefresh
        getUrl={"/customers/" + customer.id}
        trigger="sse:customer.updated"
        targetId="customer-detail-root"
      />
      <main id="customer-detail-root" class="detail-view customer-detail">
        <BackButton href="/customers" label="Back to Customers" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section customer-detail__header">
          <div class="detail-title-row customer-detail__title-row">
            <h1 class="detail-title customer-detail__title">{customer.name}</h1>
          </div>
          <DetailActions
            entity="customers"
            id={customer.id}
            title={customer.name}
            formContainerId="customers-form-container"
          />
        </header>

        {/* -- Contact info ----------------------------------------------- */}
        {hasContact && (
          <div class="detail-section detail-info-row">
            {customer.email && (
              <InfoItem label="Email">{customer.email}</InfoItem>
            )}
            {customer.phone && (
              <InfoItem label="Phone">{customer.phone}</InfoItem>
            )}
            {customer.company && (
              <InfoItem label="Company">{customer.company}</InfoItem>
            )}
          </div>
        )}

        {/* -- Billing address -------------------------------------------- */}
        {hasAddress && (
          <section class="detail-section customer-detail__section">
            <h2 class="section-heading">Billing Address</h2>
            <address class="customer-detail__address">
              {addr.street && <span>{addr.street}</span>}
              <span>
                {[addr.city, addr.state, addr.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </span>
              {addr.country && <span>{addr.country}</span>}
            </address>
          </section>
        )}

        {/* -- Notes ------------------------------------------------------ */}
        <MarkdownSection title="Notes" markdown={customer.notes} />

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section customer-detail__meta">
          <span>Created {formatDate(customer.createdAt)}</span>
          {customer.updatedAt && customer.updatedAt !== customer.createdAt && (
            <span>&middot; Updated {formatDate(customer.updatedAt)}</span>
          )}
        </div>
      </main>

      <div id="customers-form-container" />
    </MainLayout>
  );
};
