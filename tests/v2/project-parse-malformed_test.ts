// Regression: ProjectRepository.parse crashed on a null/malformed `links`
// entry from v1 data (TypeError reading 'url'). The links transform must skip
// non-object / partial entries instead of throwing.

import { assertEquals } from "@std/assert";
import { FrontmatterProjectSchema } from "../../src/types/project.types.ts";

Deno.test("FrontmatterProjectSchema.links drops null/non-object/partial entries", async () => {
  const parsed = await FrontmatterProjectSchema.parseAsync({
    links: [
      null,
      { url: "https://example.com", title: "Valid" },
      "not-an-object",
      { url: "https://no-title.com" }, // missing title
      { title: "no-url" }, // missing url
    ],
  });

  assertEquals(parsed.links, [{ url: "https://example.com", title: "Valid" }]);
});

Deno.test("FrontmatterProjectSchema.links of all-valid entries survive unchanged", async () => {
  const links = [
    { url: "https://a.com", title: "A" },
    { url: "https://b.com", title: "B" },
  ];
  const parsed = await FrontmatterProjectSchema.parseAsync({ links });
  assertEquals(parsed.links, links);
});
