import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";

export const HomeView: FC<ViewProps> = ({ nonce }) => {
  return (
    <MainLayout title="Home" nonce={nonce}>
      <main class="p-6">
        <h1 class="text-lg font-medium text-primary">MDPlanner v2</h1>
        <p class="text-sm text-secondary mt-2">
          Clean architecture scaffold. Server is running.
        </p>
      </main>
    </MainLayout>
  );
};
