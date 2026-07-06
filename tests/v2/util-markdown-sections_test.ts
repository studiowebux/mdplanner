import { assertEquals } from "@std/assert";
import { splitH2Sections } from "../../src/utils/markdown-sections.ts";

Deno.test("splitH2Sections splits each ## heading with trimmed content", () => {
  const body = `# Title

## First

- a
- b

## Second

some prose
`;
  assertEquals(splitH2Sections(body), [
    { heading: "First", content: "- a\n- b" },
    { heading: "Second", content: "some prose" },
  ]);
});

Deno.test("splitH2Sections ignores text before the first heading", () => {
  const body = `intro line\n\n## Only\n\ncontent`;
  assertEquals(splitH2Sections(body), [
    { heading: "Only", content: "content" },
  ]);
});

Deno.test("splitH2Sections yields empty content for an empty section", () => {
  const body = `## Empty\n\n## Next\n\nx`;
  assertEquals(splitH2Sections(body), [
    { heading: "Empty", content: "" },
    { heading: "Next", content: "x" },
  ]);
});

Deno.test("splitH2Sections returns no sections when there are no H2 headings", () => {
  assertEquals(splitH2Sections("# Title\n\njust prose"), []);
});
