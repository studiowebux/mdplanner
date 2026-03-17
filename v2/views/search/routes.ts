import { Hono } from "hono";
import { SearchView } from "../search.tsx";
import { getSearchEngine } from "../../singletons/services.ts";
import type { AppVariables } from "../../types/app.ts";

export const searchRouter = new Hono<{ Variables: AppVariables }>();

searchRouter.get("/", (c) => {
  const query = c.req.query("q")?.trim() ?? "";
  const engine = getSearchEngine();
  const results = engine ? engine.search(query) : [];
  return c.html(
    SearchView({
      nonce: c.get("nonce"),
      query,
      results,
    }) as unknown as string,
  );
});
