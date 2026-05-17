import { Hono } from "hono";
import { getPeopleService } from "../../singletons/services.ts";
import { IdentityView } from "../identity.tsx";
import type { AppVariables } from "../../types/app.ts";

export const identityRouter = new Hono<{ Variables: AppVariables }>();

identityRouter.get("/", async (c) => {
  const people = await getPeopleService().list();
  const humans = people.filter((p) => !p.agentType || p.agentType === "human");
  const nonce = c.get("nonce");
  return c.html(<IdentityView nonce={nonce} people={humans} />);
});
