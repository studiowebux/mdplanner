import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";

export const HomeView: FC<ViewProps> = ({ nonce, enabledFeatures }) => {
  return (
    <MainLayout
      title="Home"
      nonce={nonce}
      enabledFeatures={enabledFeatures}
      styles={["/css/views/home.css"]}
    >
      <main class="home-page">
        <h1 class="home-page__title">MDPlanner v2</h1>
        <p class="home-page__subtitle">
          Clean architecture scaffold. Server is running.
        </p>
      </main>
    </MainLayout>
  );
};
