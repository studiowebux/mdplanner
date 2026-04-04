// Shared audit attribution component — renders createdBy/updatedBy/timestamps
// in detail views. Async: resolves person IDs to display names.

import { getPeopleService } from "../../singletons/services.ts";
import { InfoItem } from "./info-item.tsx";

type AuditMetaProps = {
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export async function AuditMeta(
  { createdAt, updatedAt, createdBy, updatedBy }: AuditMetaProps,
) {
  const hasAny = createdAt || updatedAt || createdBy || updatedBy;
  if (!hasAny) return <span class="is-hidden" />;

  let createdByName: string | undefined;
  let updatedByName: string | undefined;

  if (createdBy || updatedBy) {
    const svc = getPeopleService();
    const ids = [
      ...new Set([createdBy, updatedBy].filter(Boolean) as string[]),
    ];
    const people = await Promise.all(ids.map((id) => svc.getById(id)));
    const nameMap = new Map(
      people.filter(Boolean).map((p) => [p!.id, p!.name]),
    );
    if (createdBy) createdByName = nameMap.get(createdBy) ?? createdBy;
    if (updatedBy) updatedByName = nameMap.get(updatedBy) ?? updatedBy;
  }

  return (
    <div class="detail-section detail-info-row detail-audit">
      {createdAt && (
        <InfoItem label="Created">
          <time dateTime={createdAt}>
            {new Date(createdAt).toLocaleDateString()}
          </time>
        </InfoItem>
      )}
      {updatedAt && (
        <InfoItem label="Updated">
          <time dateTime={updatedAt}>
            {new Date(updatedAt).toLocaleDateString()}
          </time>
        </InfoItem>
      )}
      {createdByName && <InfoItem label="Created by">{createdByName}</InfoItem>}
      {updatedByName && <InfoItem label="Updated by">{updatedByName}</InfoItem>}
    </div>
  );
}
