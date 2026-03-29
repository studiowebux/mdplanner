// Shared markdown section — renders a titled detail section with markdown body.
// Skips rendering entirely when content is empty.

import { markdownToHtml } from "../../utils/markdown.ts";

type MarkdownSectionProps = {
  /** Section heading text */
  title: string;
  /** Raw markdown content (converted to HTML internally) */
  markdown?: string | null;
};

export function MarkdownSection({ title, markdown }: MarkdownSectionProps) {
  const html = markdownToHtml(markdown ?? "");
  if (!html) return null;

  return (
    <section class="detail-section">
      <h2 class="section-heading">{title}</h2>
      <div class="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
