// Cerveau viewer routes — SSR page + htmx detail fragments. Read-only. The page
// renders the brains sidebar; each interaction hx-gets a fragment below into
// #cerveau-detail (or the file viewer). All gated on a configured cerveau dir.

import { Hono } from "hono";
import { getCerveauService } from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import { toHtml } from "../../utils/html.ts";
import {
  BrainDetail,
  CerveauView,
  FileContent,
  FilesDetail,
  RegistryDetail,
} from "../cerveau.tsx";
import type { AppVariables } from "../../types/app.ts";
import type { CerveauPackage } from "../../types/cerveau.types.ts";

export const cerveauViewRouter = new Hono<{ Variables: AppVariables }>();

// Resolve a brain's "org/name" package refs against the registry packages.
function resolveRefs(refs: string[], packages: CerveauPackage[]) {
  return refs.map((ref) => {
    const slash = ref.indexOf("/");
    const org = slash === -1 ? "" : ref.slice(0, slash);
    const name = slash === -1 ? ref : ref.slice(slash + 1);
    const matches = packages
      .filter((p) => p.org === org && p.name === name)
      .sort((a, b) => a.version.localeCompare(b.version));
    return { ref, matches };
  });
}

// Parent directory of a relative path, or null at the root.
function parentOf(path: string): string | null {
  if (!path) return null;
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

cerveauViewRouter.get("/", async (c) => {
  const svc = getCerveauService();
  const configured = await svc.isConfigured();
  const [version, brains] = configured
    ? await Promise.all([svc.version(), svc.brains()])
    : [null, []];
  return c.html(
    <CerveauView
      {...viewProps(c, "/cerveau")}
      configured={configured}
      version={version}
      brains={brains}
    />,
  );
});

cerveauViewRouter.get("/brain/:name", async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.text("Not configured", 404);
  const name = c.req.param("name");
  const brains = await svc.brains();
  const brain = brains.find((b) => b.name === name);
  if (!brain) return c.text("Brain not found", 404);
  const [packages, memory] = await Promise.all([
    svc.packages(),
    svc.brainMemory(brain.path),
  ]);
  return c.html(
    toHtml(
      <BrainDetail
        brain={brain}
        resolved={resolveRefs(brain.packages, packages)}
        memory={memory}
      />,
    ),
  );
});

cerveauViewRouter.get("/registry", async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.text("Not configured", 404);
  const [packages, protocol] = await Promise.all([
    svc.packages(),
    svc.protocolOverview(),
  ]);
  return c.html(
    toHtml(<RegistryDetail packages={packages} protocol={protocol} />),
  );
});

cerveauViewRouter.get("/files", async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.text("Not configured", 404);
  const path = c.req.query("path") ?? "";
  try {
    const entries = await svc.listFiles(path);
    return c.html(
      toHtml(
        <FilesDetail path={path} parent={parentOf(path)} entries={entries} />,
      ),
    );
  } catch {
    return c.text("Invalid path", 400);
  }
});

cerveauViewRouter.get("/file", async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.text("Not configured", 404);
  const path = c.req.query("path");
  if (!path) return c.text("path is required", 400);
  try {
    const content = await svc.readFile(path);
    return c.html(toHtml(<FileContent path={path} content={content} />));
  } catch {
    return c.text("File not found", 404);
  }
});
