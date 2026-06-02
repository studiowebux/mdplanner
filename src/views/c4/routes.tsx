// C4 view routes — factory list + canvas + detail page.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { c4Config } from "../../domains/c4/config.tsx";
import { getC4Service } from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import { C4DetailView } from "../c4-detail.tsx";
import { C4_LEVEL_LABELS } from "../../domains/c4/constants.tsx";
import { AuditMeta } from "../components/audit-meta.tsx";
import { InfoItem } from "../components/info-item.tsx";
import { EmptyState } from "../../components/ui/empty-state.tsx";

export const c4Router = createDomainRoutes(c4Config);

c4Router.get("/:id/panel", async (c) => {
  const id = c.req.param("id");
  const component = await getC4Service().getById(id);
  if (!component) return c.notFound();
  const all = await getC4Service().list();
  const byId = new Map(all.map((comp) => [comp.id, comp]));
  const inbound = all.filter((comp) =>
    comp.connections?.some((conn) => conn.target === id)
  );
  const children = all.filter((comp) => comp.parent === id);

  return c.html(
    <div class="c4-panel">
      <div class="detail-title-row">
        <h2 class="detail-title">{component.name}</h2>
        <span class="badge">{component.type}</span>
        <span class={`badge c4-level-badge c4-level-badge--${component.level}`}>
          {C4_LEVEL_LABELS[component.level] ?? component.level}
        </span>
      </div>

      <dl class="detail-meta">
        {component.technology && (
          <InfoItem label="Technology">{component.technology}</InfoItem>
        )}
        {component.parent && (
          <InfoItem label="Parent">
            <a href={`/c4/${component.parent}`}>
              {byId.get(component.parent)?.name ?? component.parent}
            </a>
          </InfoItem>
        )}
        {component.description && (
          <InfoItem label="Description">{component.description}</InfoItem>
        )}
      </dl>

      {component.connections && component.connections.length > 0 && (
        <section class="detail-section">
          <h3 class="detail-section__title">Outgoing</h3>
          <ul class="c4-connection-list">
            {component.connections.map((conn) => {
              const target = byId.get(conn.target);
              return (
                <li key={conn.id} class="c4-connection-item">
                  <span class="c4-connection-item__label">{conn.label}</span>
                  {conn.technology && (
                    <span class="c4-connection-item__tech">
                      [{conn.technology}]
                    </span>
                  )}
                  <span class="c4-connection-item__sep">→</span>
                  {target
                    ? <a href={`/c4/${target.id}`}>{target.name}</a>
                    : <span class="muted">{conn.target}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {inbound.length > 0 && (
        <section class="detail-section">
          <h3 class="detail-section__title">Inbound</h3>
          <ul class="c4-connection-list">
            {inbound.map((source) => {
              const conn = source.connections?.find((co) =>
                co.target === component.id
              );
              return (
                <li key={source.id} class="c4-connection-item">
                  <a href={`/c4/${source.id}`}>{source.name}</a>
                  <span class="c4-connection-item__sep">→</span>
                  <span class="c4-connection-item__label">{conn?.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {children.length > 0 && (
        <section class="detail-section">
          <h3 class="detail-section__title">Children</h3>
          <ul class="c4-childComponents-list">
            {children.map((child) => (
              <li key={child.id}>
                <a href={`/c4/${child.id}`}>{child.name}</a>
                <span class="muted c4-childComponents-list__type">
                  — {child.type}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div class="c4-panel__actions">
        <a class="btn btn--sm btn--secondary" href={`/c4/${component.id}`}>
          Full detail ↗
        </a>
      </div>

      <AuditMeta
        createdAt={component.createdAt}
        updatedAt={component.updatedAt}
        createdBy={component.createdBy}
        updatedBy={component.updatedBy}
      />
    </div>,
  );
});

c4Router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const component = await getC4Service().getById(id);
  if (!component) return c.notFound();
  const connections = await getC4Service().getConnectionsFor(id);
  const all = await getC4Service().list();
  const children = all.filter((comp) => comp.parent === id);
  return c.html(
    <C4DetailView
      {...viewProps(c, "/c4")}
      component={component}
      connections={connections}
      childComponents={children}
      allComponents={all}
    />,
  );
});
