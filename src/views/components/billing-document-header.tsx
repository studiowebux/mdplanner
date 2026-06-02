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
          alt={config.billingCompany ?? "Logo"}
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
      </div>
    </div>
  );
};
