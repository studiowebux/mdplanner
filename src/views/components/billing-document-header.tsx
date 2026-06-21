import type { FC } from "hono/jsx";
import type { ProjectConfig } from "../../types/project.types.ts";

type BillingDocumentHeaderProps = {
  config: ProjectConfig;
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
        {config.billingAddress && (
          <address class="billing-document-header__address">
            {config.billingAddress.split("\n").map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </address>
        )}
        {(config.billingEmail || config.billingPhone) && (
          <div class="billing-document-header__contact">
            {config.billingEmail && (
              <span class="billing-document-header__contact-item">
                {config.billingEmail}
              </span>
            )}
            {config.billingPhone && (
              <span class="billing-document-header__contact-item">
                {config.billingPhone}
              </span>
            )}
          </div>
        )}
        {(config.billingTaxNumber || config.billingBusinessNumber) && (
          <div class="billing-document-header__numbers">
            {config.billingTaxNumber && (
              <span class="billing-document-header__number">
                Tax: {config.billingTaxNumber}
              </span>
            )}
            {config.billingBusinessNumber && (
              <span class="billing-document-header__number">
                Business #: {config.billingBusinessNumber}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
