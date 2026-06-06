/**
 * Characterization tests for the WebDAV handler (locks behavior before the
 * qi0l decomposition, owner decision 2026-06-05). The handler had ZERO test
 * coverage but its decomposition acceptance is "do not change response bytes",
 * so these pin the observable contract (status codes, key headers, XML/HTML
 * response shape) of `createWebDavHandler` — a pure (req)=>Response handler
 * backed by a temp root dir.
 *
 * Assertions target stable observables, not volatile bytes (etag/date), so the
 * upcoming structural split can be verified against them.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createWebDavHandler } from "../../src/api/v1/webdav/handler.ts";

type Handler = (req: Request) => Promise<Response>;

async function setup(
  extra: Record<string, unknown> = {},
): Promise<{ h: Handler; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-webdav-" });
  const h = await createWebDavHandler({ rootDir: dir, ...extra });
  return { h, dir };
}

function req(
  method: string,
  path: string,
  init: { headers?: Record<string, string>; body?: BodyInit } = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: init.headers,
    body: init.body,
  });
}

Deno.test("OPTIONS advertises DAV compliance + allowed methods", async () => {
  const { h, dir } = await setup();
  try {
    const res = await h(req("OPTIONS", "/"));
    await res.body?.cancel();
    assertEquals(res.status, 204);
    assertEquals(res.headers.get("DAV"), "1, 2, 3");
    assertStringIncludes(res.headers.get("Allow") ?? "", "PROPFIND");
    assertStringIncludes(res.headers.get("Allow") ?? "", "MKCOL");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("PUT creates (201) then updates (204); GET round-trips the body", async () => {
  const { h, dir } = await setup();
  try {
    const create = await h(req("PUT", "/a.txt", { body: "hello world" }));
    await create.body?.cancel();
    assertEquals(create.status, 201);

    const update = await h(req("PUT", "/a.txt", { body: "second" }));
    await update.body?.cancel();
    assertEquals(update.status, 204);

    const get = await h(req("GET", "/a.txt"));
    assertEquals(get.status, 200);
    assertEquals(get.headers.get("Content-Length"), "6");
    assertEquals(get.headers.get("Accept-Ranges"), "bytes");
    assert(get.headers.get("ETag"), "GET should expose an ETag");
    assertEquals(await get.text(), "second");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("GET range returns 206 with Content-Range", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/r.txt", { body: "hello world" }))).body
      ?.cancel();
    const res = await h(
      req("GET", "/r.txt", { headers: { Range: "bytes=0-4" } }),
    );
    assertEquals(res.status, 206);
    assertEquals(res.headers.get("Content-Range"), "bytes 0-4/11");
    assertEquals(res.headers.get("Content-Length"), "5");
    assertEquals(await res.text(), "hello");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("HEAD returns metadata without a body; 404 when missing", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/h.txt", { body: "abc" }))).body?.cancel();
    const head = await h(req("HEAD", "/h.txt"));
    await head.body?.cancel();
    assertEquals(head.status, 200);
    assertEquals(head.headers.get("Content-Length"), "3");

    const missing = await h(req("HEAD", "/nope.txt"));
    await missing.body?.cancel();
    assertEquals(missing.status, 404);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("GET on a directory renders an HTML index", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/file.txt", { body: "x" }))).body?.cancel();
    const res = await h(req("GET", "/"));
    assertEquals(res.status, 200);
    assertStringIncludes(res.headers.get("Content-Type") ?? "", "text/html");
    const html = await res.text();
    assertStringIncludes(html, "Index of /");
    assertStringIncludes(html, "file.txt");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("PROPFIND depth 0 returns a 207 multistatus for the resource", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/p.txt", { body: "hello world" }))).body
      ?.cancel();
    const res = await h(
      req("PROPFIND", "/p.txt", { headers: { Depth: "0" } }),
    );
    assertEquals(res.status, 207);
    assertStringIncludes(
      res.headers.get("Content-Type") ?? "",
      "application/xml",
    );
    const xml = await res.text();
    assertStringIncludes(xml, "<D:multistatus");
    assertStringIncludes(xml, "<D:response>");
    assertStringIncludes(xml, "/p.txt");
    assertStringIncludes(xml, "<D:getcontentlength>11</D:getcontentlength>");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("PROPFIND depth 1 lists the collection and its children", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/one.txt", { body: "1" }))).body?.cancel();
    await (await h(req("PUT", "/two.txt", { body: "2" }))).body?.cancel();
    const res = await h(req("PROPFIND", "/", { headers: { Depth: "1" } }));
    assertEquals(res.status, 207);
    const xml = await res.text();
    const responses = (xml.match(/<D:response>/g) ?? []).length;
    assert(
      responses >= 3,
      `depth-1 PROPFIND should list self + 2 children, got ${responses}`,
    );
    assertStringIncludes(xml, "one.txt");
    assertStringIncludes(xml, "two.txt");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("PROPFIND on a missing resource is 404", async () => {
  const { h, dir } = await setup();
  try {
    const res = await h(req("PROPFIND", "/ghost", { headers: { Depth: "0" } }));
    await res.body?.cancel();
    assertEquals(res.status, 404);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("MKCOL creates a collection; 405 existing, 409 missing parent", async () => {
  const { h, dir } = await setup();
  try {
    const ok = await h(req("MKCOL", "/coll"));
    await ok.body?.cancel();
    assertEquals(ok.status, 201);

    const dup = await h(req("MKCOL", "/coll"));
    await dup.body?.cancel();
    assertEquals(dup.status, 405);

    const orphan = await h(req("MKCOL", "/missing/child"));
    await orphan.body?.cancel();
    assertEquals(orphan.status, 409);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("DELETE soft-deletes to trash (204); 404 when missing", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/d.txt", { body: "bye" }))).body?.cancel();
    const del = await h(req("DELETE", "/d.txt"));
    await del.body?.cancel();
    assertEquals(del.status, 204);
    assertEquals((await h(req("HEAD", "/d.txt"))).status, 404);

    const again = await h(req("DELETE", "/d.txt"));
    await again.body?.cancel();
    assertEquals(again.status, 404);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("COPY duplicates (201); MOVE relocates (201) and removes source", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/src.txt", { body: "data" }))).body?.cancel();

    const copy = await h(
      req("COPY", "/src.txt", {
        headers: { Destination: "http://localhost/copy.txt" },
      }),
    );
    await copy.body?.cancel();
    assertEquals(copy.status, 201);
    assertEquals((await h(req("HEAD", "/src.txt"))).status, 200);
    assertEquals((await h(req("HEAD", "/copy.txt"))).status, 200);

    const move = await h(
      req("MOVE", "/src.txt", {
        headers: { Destination: "http://localhost/moved.txt" },
      }),
    );
    await move.body?.cancel();
    assertEquals(move.status, 201);
    assertEquals((await h(req("HEAD", "/src.txt"))).status, 404);
    assertEquals((await h(req("HEAD", "/moved.txt"))).status, 200);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("COPY without Destination is 400; missing source is 404", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/c.txt", { body: "x" }))).body?.cancel();
    const noDest = await h(req("COPY", "/c.txt"));
    await noDest.body?.cancel();
    assertEquals(noDest.status, 400);

    const noSrc = await h(
      req("COPY", "/absent.txt", {
        headers: { Destination: "http://localhost/x.txt" },
      }),
    );
    await noSrc.body?.cancel();
    assertEquals(noSrc.status, 404);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("LOCK then UNLOCK round-trips; second exclusive LOCK is 423", async () => {
  const { h, dir } = await setup();
  try {
    const lockBody =
      '<?xml version="1.0"?><D:lockinfo xmlns:D="DAV:"><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype><D:owner>tester</D:owner></D:lockinfo>';
    const lock = await h(req("LOCK", "/lk.txt", { body: lockBody }));
    assertEquals(lock.status, 200);
    const token = lock.headers.get("Lock-Token") ?? "";
    assertStringIncludes(token, "urn:uuid:");
    const lockXml = await lock.text();
    assertStringIncludes(lockXml, "<D:lockdiscovery>");
    assertStringIncludes(lockXml, "<D:locktoken>");

    const second = await h(req("LOCK", "/lk.txt", { body: lockBody }));
    await second.body?.cancel();
    assertEquals(second.status, 423);

    const bareToken = token.replace(/[<>]/g, "");
    const unlock = await h(
      req("UNLOCK", "/lk.txt", { headers: { "Lock-Token": token } }),
    );
    await unlock.body?.cancel();
    assertEquals(unlock.status, 204);

    // After unlock, a fresh exclusive lock succeeds again.
    const relock = await h(req("LOCK", "/lk.txt", { body: lockBody }));
    await relock.body?.cancel();
    assertEquals(relock.status, 200);
    assert(bareToken.length > 0);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("UNLOCK without a Lock-Token header is 400", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/u.txt", { body: "x" }))).body?.cancel();
    const res = await h(req("UNLOCK", "/u.txt"));
    await res.body?.cancel();
    assertEquals(res.status, 400);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("PROPPATCH stores a dead property and echoes 207", async () => {
  const { h, dir } = await setup();
  try {
    await (await h(req("PUT", "/pp.txt", { body: "x" }))).body?.cancel();
    const body =
      '<?xml version="1.0"?><D:propertyupdate xmlns:D="DAV:" xmlns:Z="urn:ex"><D:set><D:prop><Z:color>blue</Z:color></D:prop></D:set></D:propertyupdate>';
    const res = await h(req("PROPPATCH", "/pp.txt", { body }));
    assertEquals(res.status, 207);
    const xml = await res.text();
    assertStringIncludes(xml, "<D:multistatus");
    assertStringIncludes(xml, "HTTP/1.1 200 OK");

    // The stored dead prop surfaces in a subsequent allprop PROPFIND.
    const pf = await h(req("PROPFIND", "/pp.txt", { headers: { Depth: "0" } }));
    assertStringIncludes(await pf.text(), "color");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("auth: 401 without credentials, OPTIONS bypasses, valid Basic passes", async () => {
  const { h, dir } = await setup({ authUser: "u", authPass: "p" });
  try {
    const anon = await h(req("GET", "/"));
    await anon.body?.cancel();
    assertEquals(anon.status, 401);
    assertStringIncludes(anon.headers.get("WWW-Authenticate") ?? "", "Basic");

    const opts = await h(req("OPTIONS", "/"));
    await opts.body?.cancel();
    assertEquals(opts.status, 204);

    const creds = "Basic " + btoa("u:p");
    const ok = await h(req("GET", "/", { headers: { Authorization: creds } }));
    assertEquals(ok.status, 200);
    await ok.body?.cancel();

    const bad = "Basic " + btoa("u:wrong");
    const denied = await h(
      req("GET", "/", { headers: { Authorization: bad } }),
    );
    await denied.body?.cancel();
    assertEquals(denied.status, 401);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("unknown method is 405 with an Allow header", async () => {
  const { h, dir } = await setup();
  try {
    const res = await h(req("BREW", "/"));
    await res.body?.cancel();
    assertEquals(res.status, 405);
    assertStringIncludes(res.headers.get("Allow") ?? "", "PROPFIND");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("pathPrefix is stripped before filesystem resolution", async () => {
  const { h, dir } = await setup({ pathPrefix: "/webdav" });
  try {
    const put = await h(req("PUT", "/webdav/pre.txt", { body: "data" }));
    await put.body?.cancel();
    assertEquals(put.status, 201);
    // File lands at root, not under a literal "webdav" directory.
    assertEquals(await Deno.readTextFile(`${dir}/pre.txt`), "data");
    const get = await h(req("GET", "/webdav/pre.txt"));
    assertEquals(get.status, 200);
    assertEquals(await get.text(), "data");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
