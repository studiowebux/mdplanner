import type { FC } from "hono/jsx";
import type { ProjectConfig } from "../../types/project.types.ts";

type BillingDocumentHeaderProps = {
  config: ProjectConfig;
};

const BillingAddress: FC<{ address?: string | null }> = ({ address }) =>
  address
    ? (
      <address class="billing-document-header__address">
        {address.split("\n").map((line, i) => <span key={i}>{line}</span>)}
      </address>
    )
    : null;

const BillingContact: FC<{ email?: string | null; phone?: string | null }> = (
  { email, phone },
) => {
  if (!email && !phone) return null;
  return (
    <div class="billing-document-header__contact">
      {email && (
        <span class="billing-document-header__contact-item">{email}</span>
      )}
      {phone && (
        <span class="billing-document-header__contact-item">{phone}</span>
      )}
    </div>
  );
};

const BillingNumbers: FC<{ tax?: string | null; business?: string | null }> = (
  { tax, business },
) => {
  if (!tax && !business) return null;
  return (
    <div class="billing-document-header__numbers">
      {tax && <span class="billing-document-header__number">Tax: {tax}</span>}
      {business && (
        <span class="billing-document-header__number">
          Business #: {business}
        </span>
      )}
    </div>
  );
};

export const BillingDocumentHeader: FC<BillingDocumentHeaderProps> = (
  { config },
) => {
  if (
    !config.billingCompany && !config.billingAddress && !config.billingLogoUrl
  ) {
    return null;
  }

  return (
    <div class="billing-document-header">
      {config.billingLogoUrl && (
        <img
          src={config.billingLogoUrl}
          alt={config.billingCompany ? `${config.billingCompany} logo` : "Logo"}
          class="billing-document-header__logo"
        />
      )}
      <div class="billing-document-header__info">
        {config.billingCompany && (
          <span class="billing-document-header__company">
            {config.billingCompany}
          </span>
        )}
        <BillingAddress address={config.billingAddress} />
        <BillingContact
          email={config.billingEmail}
          phone={config.billingPhone}
        />
        <BillingNumbers
          tax={config.billingTaxNumber}
          business={config.billingBusinessNumber}
        />
      </div>
    </div>
  );
};
