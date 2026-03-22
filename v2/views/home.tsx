import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import type { ProjectConfig } from "../domains/project/types.ts";
import { APP_VERSION } from "../constants/mod.ts";

type HomeProps = ViewProps & { config: ProjectConfig };

export const HomeView: FC<HomeProps> = ({ config, ...viewProps }) => {
  const links = config.links ?? [];

  return (
    <MainLayout
      title={config.name}
      {...viewProps}
      styles={["/css/views/home.css"]}
    >
      <main class="home-page">
        <h1 class="home-page__title">{config.name}</h1>
        <span class="home-page__version">v{APP_VERSION}</span>

        {config.description && (
          <p class="home-page__description">{config.description}</p>
        )}

        {links.length > 0 && (
          <section class="home-page__links">
            <h2 class="home-page__section-title">Links</h2>
            <ul class="home-page__link-list">
              {links.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener"
                    class="home-page__link"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </MainLayout>
  );
};
