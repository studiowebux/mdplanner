// Shared markdown section — renders a titled detail section with markdown body.
// Skips rendering entirely when content is empty.

import { MarkdownJsx } from "../../utils/markdown-jsx.tsx";

type MarkdownSectionProps = {
  /** Section heading text */
  title: string;
  /** Raw markdown content */
  markdown?: string | null;
};

export function MarkdownSection({ title, markdown }: MarkdownSectionProps) {
  if (!markdown) return null;

  return (
    <section class="detail-section">
      <h2 class="section-heading">{title}</h2>
      <MarkdownJsx markdown={markdown} />
    </section>
  );
}
