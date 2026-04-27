import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { C4Component, C4Connection } from "../types/c4.types.ts";
import type { ViewProps } from "../types/app.ts";
import { C4_LEVEL_LABELS } from "../domains/c4/constants.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";

type Props = ViewProps & {
  component: C4Component;
  connections: C4Connection[];
  childComponents: C4Component[];
  allComponents: C4Component[];
};

export const C4DetailView: FC<Props> = ({
  component,
  connections,
  childComponents,
  allComponents,
  ...props
}) => {
  const byId = new Map(allComponents.map((c) => [c.id, c]));
  const inbound = allComponents.filter((c) =>
    c.connections?.some((conn) => conn.target === component.id)
  );

  return (
    <MainLayout
      title={component.name}
      {...props}
      styles={["/css/views/c4.css"]}
    >
      <SseRefresh
        getUrl={`/c4/${component.id}`}
        trigger="sse:c4.updated"
        targetId="c4-detail-root"
      />
      <main id="c4-detail-root" class="detail-view c4-detail">
        <BackButton
          href={`/c4?level=${component.level}${
            component.parent ? `&parent=${component.parent}` : ""
          }`}
          label="Back to canvas"
        />

        <header class="detail-section c4-detail__header">
          <div class="detail-title-row">
            <h1 class="detail-title">{component.name}</h1>
            <span class="badge">{component.type}</span>
            <span
              class={`badge c4-level-badge c4-level-badge--${component.level}`}
            >
              {C4_LEVEL_LABELS[component.level] ?? component.level}
            </span>
          </div>
          <DetailActions
            entity="c4"
            id={component.id}
            title={component.name}
            formContainerId="c4-form-container"
          />
        </header>

        <section class="detail-section">
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
        </section>

        {/* Outgoing connections */}
        <section class="detail-section">
          <h2 class="detail-section__title">Outgoing Connections</h2>
          {connections.length === 0
            ? <EmptyState message="No outgoing connections." />
            : (
              <ul class="c4-connection-list">
                {connections.map((conn) => {
                  const target = byId.get(conn.target);
                  return (
                    <li key={conn.id} class="c4-connection-item">
                      <span class="c4-connection-item__label">
                        {conn.label}
                      </span>
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
            )}
        </section>

        {/* Inbound connections */}
        {inbound.length > 0 && (
          <section class="detail-section">
            <h2 class="detail-section__title">Inbound Connections</h2>
            <ul class="c4-connection-list">
              {inbound.map((source) => {
                const conn = source.connections?.find((c) =>
                  c.target === component.id
                );
                return (
                  <li key={source.id} class="c4-connection-item">
                    <a href={`/c4/${source.id}`}>{source.name}</a>
                    <span class="c4-connection-item__sep">→</span>
                    <span class="c4-connection-item__label">{conn?.label}</span>
                    {conn?.technology && (
                      <span class="c4-connection-item__tech">
                        [{conn.technology}]
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Children */}
        {childComponents.length > 0 && (
          <section class="detail-section">
            <h2 class="detail-section__title">
              Children
              <a
                class="btn btn--sm btn--secondary c4-detail__drill"
                href={`/c4?level=${
                  _nextLevel(component.level)
                }&parent=${component.id}`}
              >
                Open in canvas ↗
              </a>
            </h2>
            <ul class="c4-childComponents-list">
              {childComponents.map((child) => (
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

        <AuditMeta
          createdAt={component.createdAt}
          updatedAt={component.updatedAt}
          createdBy={component.createdBy}
          updatedBy={component.updatedBy}
        />
      </main>
    </MainLayout>
  );
};

function _nextLevel(level: string): string {
  const map: Record<string, string> = {
    context: "container",
    container: "component",
    component: "code",
  };
  return map[level] ?? "component";
}
